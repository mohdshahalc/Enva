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



