// controllers/stripeWebhookController.js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/product");
const Offer = require("../models/offer");
const Coupon = require("../models/coupon");
const Category = require("../models/category");


const { creditWallet } = require("./walletController");




exports.stripeWebhook = async (req, res) => {

    
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  try {
    const session = event.data.object;
    const userId = session.metadata.userId;

     /* ================================
       👛 WALLET TOP-UP (PRIORITY)
    ================================ */
    if (session.metadata?.type === "wallet_topup") {
      const amount = Number(session.metadata.amount);

      if (amount > 0 && userId) {
        await creditWallet(
          userId,
          amount,
          "Wallet recharge via Stripe"
        );
      }

      return res.json({ received: true });
    }

    
    // ✅ READ SHIPPING DATA FROM STRIPE METADATA
const shippingAddress = session.metadata.shippingAddress
  ? JSON.parse(session.metadata.shippingAddress)
  : null;

const shippingMethod = session.metadata.shippingMethod || "standard";
const shippingPrice = Number(session.metadata.shippingPrice || 15);

    // 🔁 prevent duplicate order
    const existing = await Order.findOne({ stripeSessionId: session.id });
    if (existing) return res.json({ received: true });

    // 1️⃣ Load cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) return res.json({ received: true });

    const now = new Date();
    let subtotal = 0;
    const orderItems = [];

    // 2️⃣ PRICE CALCULATION (same as placeOrder)
    for (const item of cart.items) {
      const product = item.product;

      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      let offer = await Offer.findOne({
        offerType: "product",
        product: product._id,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

      if (!offer && product.category) {
        const categoryDoc = await Category.findOne({
          name: product.category
        }).lean();

        if (categoryDoc) {
          offer = await Offer.findOne({
            offerType: "category",
            category: categoryDoc._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
          }).lean();
        }
      }

      if (offer) {
        oldPrice = product.price;
        discountPercent = offer.discountPercent;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      subtotal += finalPrice * item.quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        size: item.size,
        quantity: item.quantity,
        price: finalPrice,
        oldPrice,
        discountPercent
      });
    }

   
    const tax = +(subtotal * 0.07).toFixed(2);

    // ==============================
    // 🎟️ COUPON LOGIC (SAME AS placeOrder)
    // ==============================
    let appliedCoupon = null;
    let discountAmount = 0;

    if (cart.couponCode) {
      const coupon = await Coupon.findOne({
        code: cart.couponCode.toUpperCase(),
        isActive: true
      });

      if (coupon &&
          now >= coupon.startDate &&
          now <= coupon.endDate &&
          subtotal >= coupon.minPurchase) {

        discountAmount = +(
          (subtotal * coupon.discountPercent) / 100
        ).toFixed(2);

        appliedCoupon = {
          code: coupon.code,
          discountPercent: coupon.discountPercent,
          discountAmount
        };
      }
    }

     // ✅ STRIPE IS FINAL SOURCE OF TRUTH
const total = session.amount_total / 100;


    // 5️⃣ STOCK REDUCTION
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product || product.sizes[item.size] < item.quantity) {
        return res.json({ received: true });
      }
    }

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      product.sizes[item.size] -= item.quantity;
      product.stock -= item.quantity;
      await product.save();
    }

    // 6️⃣ CREATE ORDER (WITH COUPON)
    await Order.create({
  user: userId,
  stripeSessionId: session.id,

  items: orderItems,

  // 🔥 NOW STORED
  shippingAddress,
  shippingMethod,
  shippingPrice,

  paymentMethod: "stripe",
  paymentStatus: "paid",

  subtotal,
  tax,
  discountAmount,
  coupon: appliedCoupon,

  total,
  status: "confirmed"
});


    // 7️⃣ CLEAR CART
    cart.items = [];
    cart.couponCode = null;
    await cart.save();

    return res.json({ received: true });

  } catch (err) {
    console.error("🔥 Stripe webhook error:", err);
    return res.json({ received: true });
  }
};
