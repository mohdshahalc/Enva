const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        size: {
          type: String,
          required: true,
          uppercase: true,
          trim: true
        }
      }
    ]
  },
  { timestamps: true }
);

// 🔒 Prevent duplicates
wishlistSchema.index(
  { user: 1, "items.product": 1, "items.size": 1 },
  { unique: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
