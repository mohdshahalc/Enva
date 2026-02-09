const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/product");
const Coupon = require("../models/coupon"); // ✅ FIX: missing import
const Offer = require("../models/offer");
const Category = require("../models/category");
const Stripe = require("stripe");
const { creditWallet,debitWallet } = require("./walletController");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



/* ======================================================
   PLACE ORDER
====================================================== */
exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      shippingAddress,
      shippingMethod,
      paymentMethod,
      couponCode,
      paymentIntentId
    } = req.body;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || !cart.items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    /* ======================
       🔒 STOCK CHECK
    ====================== */
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      const reserved = product.reservedStock?.get(item.size) || 0;
      const available = (product.sizes[item.size] || 0) - reserved;

      if (available < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} (${item.size})`
        });
      }
    }

    /* ======================
       💰 PRICE CALC
    ====================== */
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;
      const finalPrice = product.price;

      subtotal += finalPrice * item.quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        size: item.size,
        quantity: item.quantity,
        price: finalPrice
      });
    }

    const shippingPrice = shippingMethod === "express" ? 35 : 15;
    const tax = +(subtotal * 0.07).toFixed(2);

    /* ======================
       🎟️ COUPON (NO CONSUME)
    ====================== */
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon" });
      }

      if (subtotal < coupon.minPurchase) {
        return res.status(400).json({
          message: `Minimum ₹${coupon.minPurchase} required`
        });
      }

      discountAmount =
        coupon.type === "flat"
          ? Math.min(coupon.flatAmount, subtotal)
          : +((subtotal * coupon.discountPercent) / 100).toFixed(2);

      appliedCoupon = {
        code: coupon.code,
        type: coupon.type,
        discountAmount
      };
    }

    const total = +(subtotal + shippingPrice + tax - discountAmount).toFixed(2);

    /* ======================
       💳 PAYMENT STATUS
    ====================== */
    let paymentStatus = "pending";

    if (paymentMethod === "wallet") {
      await debitWallet(userId, total, "Order payment (wallet)");
      paymentStatus = "paid";
    }

    /* ======================
       ✅ CREATE ORDER
    ====================== */
    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      shippingMethod,
      shippingPrice,
      paymentMethod,
      paymentStatus,
      paymentIntentId: paymentIntentId || null,
      subtotal,
      tax,
      discountAmount,
      coupon: appliedCoupon,
      total,
      status: "pending",
      isStripePending: paymentMethod === "stripe"
    });

    /* ======================
       🎟️ CONSUME COUPON
       (ONLY COD / WALLET)
    ====================== */
    if (couponCode && paymentMethod !== "stripe") {
      await Coupon.updateOne(
        { code: couponCode.trim().toUpperCase() },
        {
          $addToSet: { usedBy: userId },
          $inc: { usedCount: 1 }
        }
      );
    }

    /* ======================
       🟡 STRIPE → RESERVE ONLY
    ====================== */
    if (paymentMethod === "stripe") {
      for (const item of cart.items) {
        const product = await Product.findById(item.product._id);
        const reserved = product.reservedStock?.get(item.size) || 0;

        product.reservedStock.set(
          item.size,
          reserved + item.quantity
        );

        await product.save();
      }

      return res.json({
        message: "Order created, stock reserved",
        orderId: order._id
      });
    }

    /* ======================
       🔥 COD / WALLET
    ====================== */
    await reduceStock(cart.items);

    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ message: "Order placement failed" });
  }
};


async function restockSingleProduct(productId, size, qty) {
  const product = await Product.findById(productId);
  if (!product) return;

  if (product.sizes && product.sizes[size] !== undefined) {
    product.sizes[size] += qty;
  }

  product.stock += qty;
  await product.save();
}



exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const allowedTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
      returned: []
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ❌ Block invalid transitions
    if (!allowedTransitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // =========================
    // ✅ UPDATE STATUS
    // =========================
    order.status = status;

    // =========================
    // 📦 ITEM STATUS (OPTIONAL BUT RECOMMENDED)
    // =========================
    order.items.forEach(item => {
      item.status = status;
    });

    // =========================
    // 📅 TIMESTAMPS
    // =========================
    if (status === "confirmed") order.confirmedAt = new Date();
    if (status === "shipped") order.shippedAt = new Date();

    if (status === "delivered") {
      order.deliveredAt = new Date();

      // 💰 COD PAYMENT SUCCESS ONLY ON DELIVERY
      if (order.paymentMethod === "cod") {
        order.paymentStatus = "paid";
      }
    }

    await order.save();

    res.json({
      message: "Order updated successfully",
      status: order.status,
      paymentStatus: order.paymentStatus
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};



async function reduceStock(cartItems) {
  for (const item of cartItems) {
    const product = await Product.findById(item.product._id);
    if (!product) continue;

    if (product.sizes && product.sizes[item.size] !== undefined) {
      product.sizes[item.size] -= item.quantity;
    }

    if (typeof product.stock === "number") {
      product.stock -= item.quantity;
    }

    await product.save();
  }
}