const User=require("../models/user")
const bcrypt = require("bcryptjs");

// GET ADMIN PROFILE
exports.getAdminProfile = async (req, res) => {
  try {
    console.log("Authenticated ID:", req.user.id);

    const admin = await User.findById(req.user.id).select(
      "name email phone role"
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 🛑 Extra safety: ensure role is admin
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(admin);
  } catch (err) {
    console.error("GET ADMIN PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE ADMIN PASSWORD
exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required"
      });
    }

    const admin = await User.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 🔐 Ensure admin role
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // 🔑 Check current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    // 🚫 Prevent reuse
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password"
      });
    }

    // ✅ Password rule (MATCH FRONTEND)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters and include a letter and a number"
      });
    }

    // 🔒 Save new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("UPDATE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

