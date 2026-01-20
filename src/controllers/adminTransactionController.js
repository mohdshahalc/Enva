const Order = require("../models/order");
const Wallet = require("../models/wallet");

exports.getAllTransactions = async (req, res) => {
  try {
    const orderTxns = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const transactions = orderTxns.map((o, index) => ({
      id: o._id,
      txnId: `TXN-${o._id.toString().slice(-8).toUpperCase()}`,
      user: o.user?.name || o.user?.email || "Guest",
      method: o.paymentMethod,
      amount: o.total,
      date: o.createdAt,
      status:
        o.paymentStatus === "paid"
          ? "success"
          : o.paymentStatus === "pending"
          ? "pending"
          : "failed"
    }));

    res.json(transactions);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load transactions" });
  }
};
