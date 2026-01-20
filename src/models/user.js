const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  phone: {
    type: String
  },isBlocked: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"   // 👈 IMPORTANT
  },otp: {
  type: String
},
otpExpires: {
  type: Date
}
,
  // models/user.js
refreshToken: {
  type: String,
  default: null
}


}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
