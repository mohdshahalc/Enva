const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
      match: /^[A-Z0-9]+$/
    },

    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 90
    },

    minPurchase: {
      type: Number,
      required: true,
      min: 0
    },

    maxPurchase: {
      type: Number,
      required: true,
      min: 1
    },

    usageLimit: {
      type: Number,
      required: true,
      min: 1
    },

    usedCount: {
      type: Number,
      default: 0
    },

    usedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    description: {
      type: String,
      
      trim: true,
      maxlength: 200
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
