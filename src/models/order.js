const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: Number,
      size: String,
      oldPrice: Number,
      discountPercent: Number,
      price: Number,

      status: {
        type: String,
        enum: ["confirmed", "shipped", "delivered", "cancelled", "returned"],
        default: "confirmed"
      },

      cancelledAt: Date,
      cancelReason: String,
      returnRequestedAt: Date,
      returnReason: String
    }
  ],

  shippingAddress: { email: String, firstName: String, lastName: String, street: String, city: String, state: String, zip: String },

  shippingMethod: { type: String, enum: ["standard", "express"], default: "standard" },
  shippingPrice: Number,
  tax: Number,
  subtotal: Number,

  coupon: { code: String, discountPercent: Number, discountAmount: Number },
  discountAmount: { type: Number, default: 0 },
  total: Number,

  paymentMethod: { type: String, enum: ["cod", "card", "stripe", "paypal", "wallet"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
  paymentIntentId: String,

  status: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled", "returned"],
    default: "pending"
  }

}, { timestamps: true });


module.exports = mongoose.model("Order", orderSchema);
