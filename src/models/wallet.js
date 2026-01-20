const mongoose = require("mongoose"); // ✅ ADD THIS LINE

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    balance: {
      type: Number,
      default: 0,
      min: 0
    },

    transactions: [
      {
        amount: {
          type: Number,
          required: true
        },
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true
        },
        reason: String,
        date: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
