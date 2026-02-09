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

  // ============================
  // 🔐 VERIFY STRIPE SIGNATURE
  // ============================
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe signature error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  try {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const userId = metadata.userId;

    if (!userId) {
      console.error("❌ Missing userId in Stripe metadata");
      return res.json({ received: true });
    }

    /* ==============================
       👛 WALLET TOP-UP
    ============================== */
    if (metadata.type === "wallet_topup") {
      const amount = Number(metadata.amount || 0);

      if (amount > 0) {
        await creditWallet(
          userId,
          amount,
          "Wallet recharge via Stripe"
        );
      }

      return res.json({ received: true });
    }

    /* ==============================
       📦 ORDER FLOW
    ============================== */

    // 🔁 Idempotency
    const existingOrder = await Order.findOne({
      stripeSessionId: session.id
    });

    if (existingOrder) {
      return res.json({ received: true });
    }

    const shippingAddress = metadata.shippingAddress
      ? JSON.parse(metadata.shippingAddress)
      : null;

    const shippingMethod = metadata.shippingMethod || "standard";
    const shippingPrice = Number(metadata.shippingPrice || 15);

    // 1️⃣ Load cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || !cart.items.length) {
      console.error("❌ Cart missing or empty for user:", userId);
      return res.json({ received: true });
    }

    const now = new Date();
    let subtotal = 0;
    const orderItems = [];

    // 2️⃣ PRICE CALCULATION
    for (const item of cart.items) {
      const product = item.product;
      if (!product) continue;

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

    /* ==============================
       🎟️ COUPON
    ============================== */
    let appliedCoupon = null;
    let discountAmount = 0;

    if (cart.couponCode) {
      const coupon = await Coupon.findOne({
        code: cart.couponCode.toUpperCase(),
        isActive: true
      });

      if (
        coupon &&
        now >= coupon.startDate &&
        now <= coupon.endDate &&
        subtotal >= coupon.minPurchase
      ) {
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

    // ✅ Stripe is final amount authority
    const total = session.amount_total / 100;

    // 3️⃣ STOCK VALIDATION (WITH RESERVED STOCK)
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.json({ received: true });
      }

      const reserved = product.reservedStock?.get(item.size) || 0;
      const available = product.sizes[item.size] - reserved;

      if (available < item.quantity) {
        console.error("❌ Stock conflict:", product._id);
        return res.json({ received: true });
      }
    }

    // 4️⃣ FINAL STOCK REDUCTION
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product) continue;

      const reserved = product.reservedStock?.get(item.size) || 0;

      product.sizes[item.size] -= item.quantity;
      product.stock -= item.quantity;

      product.reservedStock.set(
        item.size,
        Math.max(reserved - item.quantity, 0)
      );

      await product.save();
    }

    // 5️⃣ CREATE ORDER
    await Order.create({
      user: userId,
      stripeSessionId: session.id,

      items: orderItems,

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

    // 6️⃣ CONSUME COUPON (NOW SAFE)
    if (appliedCoupon?.code) {
      await Coupon.updateOne(
        { code: appliedCoupon.code },
        {
          $addToSet: { usedBy: userId },
          $inc: { usedCount: 1 }
        }
      );
    }

    // 7️⃣ CLEAR CART
    cart.items = [];
    cart.couponCode = null;
    await cart.save();

    return res.json({ received: true });

  } catch (err) {
    console.error("🔥 Stripe webhook processing error:", err);
    return res.json({ received: true }); // NEVER FAIL STRIPE
  }
};
