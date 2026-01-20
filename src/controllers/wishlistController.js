const Wishlist = require("../models/wishlist");
const Offer = require("../models/offer");
const Category = require("../models/category");
const mongoose = require("mongoose");

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, size } = req.body;

    // 🔐 VALIDATION
    if (!productId || !size) {
      return res.status(400).json({
        message: "Product ID and size are required"
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    // 🆕 CREATE WISHLIST
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        items: [{ product: productId, size }]
      });

      await wishlist.save();
      return res.json({
        message: "Added to wishlist",
        status: "added"
      });
    }

    // 🔍 CHECK EXISTING (PRODUCT + SIZE)
    const exists = wishlist.items.some(
      i =>
        i.product.toString() === productId &&
        i.size === size
    );

    if (exists) {
      return res.json({
        message: "Already in wishlist",
        status: "exists"
      });
    }

    // ➕ ADD NEW ITEM
    wishlist.items.push({ product: productId, size });
    await wishlist.save();

    res.json({
      message: "Added to wishlist",
      status: "added"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to add to wishlist"
    });
  }
};




exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId })
      .populate("items.product")
      .lean();

    if (!wishlist || !wishlist.items.length) {
      return res.json({ items: [] });
    }

    const now = new Date();

    for (const item of wishlist.items) {
      const product = item.product;
      if (!product) continue;

      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      // 🔥 PRODUCT OFFER (priority)
      let offer = await Offer.findOne({
        offerType: "product",
        product: product._id,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

      // 🔁 CATEGORY OFFER (fallback)
      if (!offer && product.category) {
        const categoryDoc = await Category.findOne({
          name: product.category
        }).lean();

        if (categoryDoc) {
          offer = await Offer.findOne({
            offerType: "category",
            category: categoryDoc._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
          }).lean();
        }
      }

      // ✅ APPLY OFFER
      if (offer) {
        oldPrice = product.price;
        discountPercent = offer.discountPercent;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      // ⬅️ ATTACH TO WISHLIST ITEM
      item.finalPrice = finalPrice;
      item.oldPrice = oldPrice;
      item.discountPercent = discountPercent;
    }

    res.json(wishlist);

  } catch (err) {
    console.error("GET WISHLIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



exports.removeFromWishlist = async (req, res) => {

  
  try {
    
    const userId = req.user.id;
    const { productId, size } = req.params;
   
    const result = await Wishlist.updateOne(
      { user: userId },
      {
        $pull: {
          items: {
            product: new mongoose.Types.ObjectId(productId),
            size: size
          }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        message: "Wishlist item not found"
      });
    }

    res.json({
      message: "Removed from wishlist",
      status: "removed"
    });

  } catch (err) {
    console.error("REMOVE WISHLIST ERROR:", err);
    res.status(500).json({
      message: "Failed to remove from wishlist"
    });
  }
};
