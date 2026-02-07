const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/product");
const Coupon = require("../models/coupon"); // ✅ FIX: missing import
const Offer = require("../models/offer");
const Category = require("../models/category");
const Stripe = require("stripe");
const { creditWallet,debitWallet } = require("./walletController");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


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

    // 1️⃣ Get cart
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // ============================
    // 🔥 CALCULATE OFFER PRICES
    // ============================
    let subtotal = 0;
    const now = new Date();
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;

      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      // PRODUCT OFFER
      let offer = await Offer.findOne({
        offerType: "product",
        product: product._id,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

      // CATEGORY OFFER
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

      // APPLY OFFER
      if (offer) {
        oldPrice = product.price;
        discountPercent = offer.discountPercent;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      const itemTotal = finalPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        size: item.size,
        quantity: item.quantity,

        // 🔐 PRICE LOCK
        price: finalPrice,
        oldPrice,
        discountPercent
      });
    }

    // 3️⃣ Shipping
    const shippingPrice = shippingMethod === "express" ? 35 : 15;

    // 4️⃣ Tax
    const tax = +(subtotal * 0.07).toFixed(2);

    // ==============================
    // 🎟️ COUPON LOGIC
    // ==============================
    let appliedCoupon = null;
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }

      if (now < coupon.startDate || now > coupon.endDate) {
        return res.status(400).json({
          message: "Coupon expired or inactive"
        });
      }

      if (subtotal < coupon.minPurchase) {
        return res.status(400).json({
          message: `Minimum purchase ₹${coupon.minPurchase} required`
        });
      }

      const alreadyUsed = coupon.usedBy.some(
        id => id.toString() === userId.toString()
      );

      if (alreadyUsed) {
        return res.status(400).json({
          message: "You have already used this coupon"
        });
      }

      if (
        coupon.usageLimit > 0 &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        return res.status(400).json({
          message: "Coupon usage limit reached"
        });
      }

      discountAmount = +(
        (subtotal * coupon.discountPercent) / 100
      ).toFixed(2);

      appliedCoupon = {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        discountAmount
      };

      coupon.usedCount += 1;
      coupon.usedBy.push(userId);
      await coupon.save();
    }

    // 5️⃣ FINAL TOTAL
    const total = +(
      subtotal + shippingPrice + tax - discountAmount
    ).toFixed(2);

    // ============================
// 👛 WALLET PAYMENT
// ============================
let paymentStatus = "pending";

if (paymentMethod === "wallet") {
  // 💸 Debit wallet FIRST (server-side truth)
  await debitWallet(
    userId,
    total,
    "Order payment (wallet)"
  );

  paymentStatus = "paid";
}


// ============================
// 💳 STRIPE PAYMENT VERIFICATION
// ============================
// ============================
if (paymentMethod === "stripe") {
  return res.status(200).json({
    message: "Stripe payment processing via webhook"
  });
}


    // ============================
    // 🔒 STOCK VALIDATION
    // ============================
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (!product || product.sizes[item.size] < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} (${item.size})`
        });
      }
    }

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      product.sizes[item.size] -= item.quantity;
      product.stock -= item.quantity;
      await product.save();
    }

    // 6️⃣ Save order
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
  total
});


    // 7️⃣ Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({
      message: "Order placement failed"
    });
  }
};


exports.validateCoupon = async (req, res) => {
  try {


    const userId = req.user.id;
    const { couponCode, subtotal } = req.body;
   
    const coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon" });
    }

    const now = new Date();

    if (now < coupon.startDate || now > coupon.endDate) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    if (subtotal < coupon.minPurchase) {
      return res.status(400).json({
        message: `Minimum purchase ₹${coupon.minPurchase} required`
      });
    }

    const alreadyUsed = coupon.usedBy.some(
      id => id.toString() === userId.toString()
    );

    if (alreadyUsed) {
      return res.status(400).json({
        message: "You have already used this coupon"
      });
    }

    return res.json({
      code: coupon.code,
      discountPercent: coupon.discountPercent
    });

  } catch (err) {
    res.status(500).json({ message: "Coupon validation failed" });
  }
};


/**
 * GET LOGGED-IN USER ORDERS
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name images price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};


exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate("items.product", "name images price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

exports.cancelOrderItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔒 ADD THIS HERE ⬇️
    if (["cancelled", "returned"].includes(item.status)) {
      return res.status(400).json({
        message: "This item is already processed"
      });
    }

    // ✅ Allow cancel only before shipping
    if (!["pending", "confirmed"].includes(item.status)) {
      return res.status(400).json({
        message: "This item cannot be cancelled"
      });
    }

    // 🔁 Restock ONLY this item
    await restockSingleProduct(
      item.product,
      item.size,
      item.quantity
    );

    // 💰 Refund if needed
    const itemTotal = item.price * item.quantity;

    if (
      order.paymentStatus === "paid" &&
      ["wallet", "stripe", "razorpay"].includes(order.paymentMethod)
    ) {
      await creditWallet(
        userId,
        itemTotal,
        `Refund for cancelled item in order #${order._id}`
      );
    }

    item.status = "cancelled";
    item.cancelReason = reason || "User cancelled";
    item.cancelledAt = new Date();

    // Update order status if needed
    const activeItems = order.items.filter(
      i => !["cancelled", "returned"].includes(i.status)
    );

    if (activeItems.length === 0) {
      order.status = "cancelled";
      order.paymentStatus = "refunded";
    }

    await order.save();

    res.json({ message: "Item cancelled successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Item cancel failed" });
  }
};

exports.returnOrderItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔒 ADD THIS HERE ⬇️
    if (["cancelled", "returned"].includes(item.status)) {
      return res.status(400).json({
        message: "This item is already processed"
      });
    }

    // ✅ Allow return only if delivered
    if (item.status !== "delivered") {
      return res.status(400).json({
        message: "Only delivered items can be returned"
      });
    }

    // 🔁 Restock ONLY this item
    await restockSingleProduct(
      item.product,
      item.size,
      item.quantity
    );

    // 💰 Refund
    const itemTotal = item.price * item.quantity;

    if (
      order.paymentStatus === "paid" &&
      ["wallet", "stripe", "razorpay"].includes(order.paymentMethod)
    ) {
      await creditWallet(
        userId,
        itemTotal,
        `Refund for returned item in order #${order._id}`
      );
    }

    item.status = "returned";
    item.returnReason = reason || "No reason provided";
    item.returnRequestedAt = new Date();

    // Update order status if needed
    const activeItems = order.items.filter(
      i => !["cancelled", "returned"].includes(i.status)
    );

    if (activeItems.length === 0) {
      order.status = "returned";
      order.paymentStatus = "refunded";
    }

    await order.save();

    res.json({ message: "Return accepted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Return request failed" });
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

