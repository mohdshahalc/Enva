const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String
  },

  phone: {
    type: String
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  // ✅ EMAIL VERIFIED (FOR OTP SIGNUP)
  isVerified: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // 🔐 OTP
  otp: String,
  otpExpires: Date,

  // 🧠 TEMP SIGNUP STORAGE
  tempSignup: {
    name: String,
    email: String,
    phone: String,
    password: String
  },

  refreshToken: {
    type: String,
    default: null
  },

  refreshTokenRole: {
    type: String,
    enum: ["admin", "user"]
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
