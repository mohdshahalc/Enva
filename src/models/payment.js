const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    cardType: {
      type: String,
      required: true
    },

    cardNumber: {
      type: String,
      required: true
    },

    expiryDate: {
      type: String,
      required: true
    },

    cardHolder: {
      type: String,
      required: true
    },

    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", paymentSchema);
