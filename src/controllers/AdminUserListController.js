const User = require("../models/user");
const Order = require("../models/order");


exports.getAllCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select(
        "name email createdAt isBlocked isVerified authProvider tempSignup"
      )
      .lean();

    const customers = await Promise.all(
      users.map(async (user) => {
        const orders = await Order.find({ user: user._id });

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

        // ✅ NAME RESOLUTION
        let displayName;

        if (user.isVerified) {
          displayName = user.name; // verified users
        } else {
          displayName = user.tempSignup?.name; // unverified users
        }

        if (!displayName) {
          displayName = "Unknown User";
        }

        return {
          id: user._id,
          name: displayName,
          email: user.email,
          joinedAt: user.createdAt,
          totalOrders,
          totalSpent,

          // ✅ THESE TWO FIELDS DRIVE THE UI
          isVerified: user.isVerified,
          isBlocked: user.isBlocked
        };
      })
    );

    res.json(customers);
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Failed to load customers" });
  }
};



exports.blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user || user.role !== "user") {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (user.isBlocked) {
      return res.status(400).json({ message: "Customer already blocked" });
    }

    user.isBlocked = true;
    await user.save();

    res.status(200).json({
      message: "Customer blocked successfully"
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to block customer" });
  }
};

exports.unblockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user || user.role !== "user") {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!user.isBlocked) {
      return res.status(400).json({ message: "Customer is not blocked" });
    }

    user.isBlocked = false;
    await user.save();

    res.status(200).json({
      message: "Customer unblocked successfully"
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to unblock customer" });
  }
};
