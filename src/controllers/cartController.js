const Cart = require("../models/cart");
const Offer = require("../models/offer");
const Category = require("../models/category");

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity, size } = req.body;

    if (!productId || !size) {
      return res.status(400).json({
        message: "Product ID and size are required"
      });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    let cart = await Cart.findOne({ user: userId });

    // 🆕 CREATE CART
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [
          {
            product: productId,
            size,
            quantity: qty
          }
        ]
      });

      await cart.save();
      return res.status(200).json({
        message: "Added to cart",
        status: "added"
      });
    }

    // 🔍 CHECK SAME PRODUCT + SAME SIZE
    const itemExists = cart.items.find(
      item =>
        item.product.toString() === productId &&
        item.size === size
    );

    // ❌ SAME PRODUCT & SIZE EXISTS
    if (itemExists) {
      return res.status(200).json({
        message: "Item already in cart",
        status: "exists"
      });
    }

    // ✅ SAME PRODUCT BUT DIFFERENT SIZE → ADD NEW
    cart.items.push({
      product: productId,
      size,
      quantity: qty
    });

    await cart.save();

    res.status(200).json({
      message: "Added to cart",
      status: "added"
    });

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getUserCart = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .lean();

    if (!cart || !cart.items.length) {
      return res.json({ items: [] });
    }

    const now = new Date();

    // 🔹 Collect productIds & categories
    const productIds = cart.items.map(i => i.product._id);
    const categories = cart.items
      .map(i => i.product.category)
      .filter(Boolean);

    // 🔹 Fetch ALL offers in parallel
    const [productOffers, categoryDocs] = await Promise.all([
      Offer.find({
        offerType: "product",
        product: { $in: productIds },
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean(),

      Category.find({ name: { $in: categories } }).lean()
    ]);

    const categoryIds = categoryDocs.map(c => c._id);

    const categoryOffers = await Offer.find({
      offerType: "category",
      category: { $in: categoryIds },
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    // 🔹 Maps for instant lookup
    const productOfferMap = {};
    productOffers.forEach(o => productOfferMap[o.product.toString()] = o);

    const categoryMap = {};
    categoryDocs.forEach(c => categoryMap[c.name] = c._id.toString());

    const categoryOfferMap = {};
    categoryOffers.forEach(o => categoryOfferMap[o.category.toString()] = o);

    // 🔹 Apply pricing
    for (const item of cart.items) {
      const product = item.product;

      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      let offer = productOfferMap[product._id.toString()];

      if (!offer && product.category) {
        const catId = categoryMap[product.category];
        offer = categoryOfferMap[catId];
      }

      if (offer) {
        oldPrice = product.price;
        discountPercent = offer.discountPercent;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      item.finalPrice = finalPrice;
      item.oldPrice = oldPrice;
      item.discountPercent = discountPercent;
    }

    res.json(cart);

  } catch (error) {
    console.error("GET CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, size, quantity } = req.body;

    if (!productId || !size || quantity < 1) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // 1️⃣ Find cart (mongoose doc)
    const cartDoc = await Cart.findOne({ user: userId })
      .populate("items.product");

    if (!cartDoc) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cartDoc.items.find(
      i =>
        i.product &&
        i.product._id.toString() === productId &&
        i.size === size
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔒 Stock check
    const availableStock = item.product.sizes?.[size] || 0;
    if (quantity > availableStock) {
      return res.status(400).json({
        message: `Only ${availableStock} items left for size ${size}`
      });
    }

    // 2️⃣ Update qty
    item.quantity = quantity;
    await cartDoc.save();

    // 3️⃣ RE-FETCH CART AS LEAN (CRITICAL)
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .lean();

    const now = new Date();

    // 4️⃣ APPLY OFFERS
    for (const item of cart.items) {
      const product = item.product;

      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      let offer = await Offer.findOne({
        offerType: "product",
        product: product._id,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

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

      if (offer) {
        oldPrice = product.price;
        discountPercent = offer.discountPercent;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      item.finalPrice = finalPrice;
      item.oldPrice = oldPrice;
      item.discountPercent = discountPercent;
    }

    // 5️⃣ SEND CART WITH OFFERS
    res.json({
      message: "Quantity updated",
      cart
    });

  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};




exports.removeFromCart = async (req, res) => {
  try {
  
    const userId = req.user.id;
    const { productId, size } = req.params;
          
          
    if (!productId || !size) {
      return res.status(400).json({ message: "Product and size required" });
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(item =>
      !(
        item.product &&
        item.product._id.toString() === productId &&
        item.size === size
      )
    );

    await cart.save();

    res.status(200).json({ cart });
  } catch (err) {
    console.error("REMOVE CART ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

