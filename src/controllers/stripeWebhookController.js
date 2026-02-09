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
    console.error("❌ Stripe signature error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  try {
    const session = event.data.object;

    /* ============================
       🔁 FIND PENDING ORDER
    ============================ */
    const order = await Order.findOne({
      paymentMethod: "stripe",
      paymentStatus: "pending",
      paymentIntentId: session.payment_intent
    });

    if (!order) {
      // already processed or invalid
      return res.json({ received: true });
    }

    /* ============================
       🔒 FINAL STOCK VALIDATION
    ============================ */
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product || product.sizes[item.size] < item.quantity) {
        console.error("❌ Stock mismatch after Stripe payment");

        order.paymentStatus = "failed";
        order.status = "cancelled";
        await order.save();

        return res.json({ received: true });
      }
    }

    /* ============================
       📉 REDUCE STOCK (ONCE)
    ============================ */
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      product.sizes[item.size] -= item.quantity;
      product.stock -= item.quantity;
      await product.save();
    }

    /* ============================
       ✅ MARK ORDER PAID
    ============================ */
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.stripeSessionId = session.id;
    await order.save();

    /* ============================
       🧹 CLEAR CART
    ============================ */
    await Cart.updateOne(
      { user: order.user },
      { $set: { items: [], couponCode: null } }
    );

    return res.json({ received: true });

  } catch (err) {
    console.error("🔥 Stripe webhook error:", err);
    return res.json({ received: true });
  }
};
