const Order = require("../models/order");

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const formatted = orders.map(o => ({
      id: o._id,
      orderNo: `#ORD-${o._id.toString().slice(-6).toUpperCase()}`,
      customer: o.user?.name || "Guest",
      date: o.createdAt,
      status: o.status,
      total: o.total,
      paymentMethod: o.paymentMethod   // ✅ ADDED
    }));

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load orders" });
  }
};

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
    // ✅ UPDATE ORDER STATUS
    // =========================
    order.status = status;

    // =========================
    // 📅 TIMESTAMPS
    // =========================
    if (status === "confirmed") order.confirmedAt = new Date();
    if (status === "shipped") order.shippedAt = new Date();

    if (status === "delivered") {
      order.deliveredAt = new Date();

      // 💰 IMPORTANT FIX — COD PAYMENT SUCCESS
      if (order.paymentMethod === "cod") {
        order.paymentStatus = "paid";
      }
    }

    await order.save();

    res.json({
      message: "Order status updated successfully",
      status: order.status,
      paymentStatus: order.paymentStatus
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
};



exports.getOrderByIdAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product", "name images price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load order" });
  }
};


exports.updateOrderItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // prevent double update
    if (["cancelled","returned"].includes(item.status)) {
      return res.status(400).json({ message: "Item already processed" });
    }

    // update item
    item.status = status;

    // 🔄 RECALC MONEY
    recalcTotalsAfterItemChange(order);

    // 🔄 RECALC ORDER STATUS
    syncOrderStatusFromItems(order);

    // COD auto paid when fully delivered
    if (order.status === "delivered" && order.paymentMethod === "cod") {
      order.paymentStatus = "paid";
    }

    await order.save();

    res.json({ message: "Item updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};


function syncOrderStatusFromItems(order) {
  const statuses = order.items.map(i => i.status);

  // all cancelled
  if (statuses.every(s => s === "cancelled")) {
    order.status = "cancelled";
    return;
  }

  // all returned
  if (statuses.every(s => s === "returned")) {
    order.status = "returned";
    return;
  }

  // all delivered
  if (statuses.every(s => s === "delivered")) {
    order.status = "delivered";
    return;
  }

  // all shipped
  if (statuses.every(s => s === "shipped")) {
    order.status = "shipped";
    return;
  }

  // all confirmed
  if (statuses.every(s => s === "confirmed")) {
    order.status = "confirmed";
    return;
  }

  // some cancelled/returned + some active
  if (statuses.some(s => ["cancelled","returned"].includes(s))) {
    order.status = "partial";
    return;
  }

  // default
  order.status = "pending";
}

function recalcTotalsAfterItemChange(order) {
  const activeItems = order.items.filter(
    i => !["cancelled", "returned"].includes(i.status)
  );

  // 💣 No active items left
  if (!activeItems.length) {
    order.subtotal = 0;
    order.tax = 0;
    order.discountAmount = 0;
    order.total = 0;
    order.coupon = null;
    return;
  }

  // 🧮 SUBTOTAL
  let subtotal = 0;
  activeItems.forEach(i => {
    subtotal += i.price * i.quantity;
  });

  // 🎟️ COUPON
  let discountAmount = 0;

  if (order.coupon) {
    if (order.coupon.type === "flat") {
      discountAmount = Math.min(order.coupon.flatAmount || 0, subtotal);
    } else if (order.coupon.discountPercent) {
      discountAmount = +(
        subtotal * order.coupon.discountPercent / 100
      ).toFixed(2);
    }

    // ❌ remove coupon if subtotal below minimum
    if (order.coupon.minPurchase && subtotal < order.coupon.minPurchase) {
      order.coupon = null;
      discountAmount = 0;
    }
  }

  // 🧾 TAX
  const tax = +(subtotal * 0.07).toFixed(2);

  // 📦 SHIPPING
  const shipping = order.shippingPrice || 0;

  // 💰 TOTAL
  const total = +(
    subtotal + tax + shipping - discountAmount
  ).toFixed(2);

  order.subtotal = subtotal;
  order.tax = tax;
  order.discountAmount = discountAmount;
  order.total = total;
}
