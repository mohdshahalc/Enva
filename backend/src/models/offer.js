const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    offerType: {
      type: String,
      enum: ["product", "category"],
      required: true
    },

    discountPercent: {
      type: Number,
      min: 1,
      max: 90,
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
