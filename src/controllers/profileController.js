const User = require("../models/user");
const bcrypt = require("bcryptjs");

// GET PROFILE
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};


// ======================
// UPDATE PROFILE
// ======================
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address,
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Merge first + last name into single `name` field
    if (firstName || lastName) {
      user.name = `${firstName || ""} ${lastName || ""}`.trim();
    }

    // ✅ Update address
    if (address !== undefined) {
      user.address = address;
    }

    // 🔐 Password change (optional)
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required"
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: "Passwords do not match"
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          message: "Current password incorrect"
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      name: user.name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};