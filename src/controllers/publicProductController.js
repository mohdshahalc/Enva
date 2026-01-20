const Product = require("../models/product");
const Offer = require("../models/offer");
const Category=require("../models/category")

// ======================
// GET ALL PRODUCTS (USER)
// ======================
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().lean();

    const now = new Date();

    // 🔹 Active offers only
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    // 🔹 Load categories once (STRING → ObjectId mapping)
    const categories = await Category.find().lean();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id.toString();
    });

    const updatedProducts = products.map(product => {
      let finalPrice = product.price;
      let oldPrice = null;
      let discountPercent = null;

      // ======================
      // 1️⃣ PRODUCT OFFER
      // ======================
      let offer = offers.find(o =>
        o.offerType === "product" &&
        o.product &&
        o.product.toString() === product._id.toString()
      );

      // ======================
      // 2️⃣ CATEGORY OFFER
      // ======================
      if (!offer && product.category) {
        const categoryId = categoryMap[product.category];

        if (categoryId) {
          offer = offers.find(o =>
            o.offerType === "category" &&
            o.category &&
            o.category.toString() === categoryId
          );
        }
      }

      // ======================
      // APPLY OFFER
      // ======================
      if (offer) {
        discountPercent = offer.discountPercent;
        oldPrice = product.price;
        finalPrice = Math.round(
          product.price - (product.price * discountPercent) / 100
        );
      }

      return {
        ...product,
        finalPrice,
        oldPrice,
        discountPercent
      };
    });

    res.json(updatedProducts);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ======================
// GET SINGLE PRODUCT (USER)
// ======================
exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

   const now = new Date();

// 1️⃣ PRODUCT OFFER (priority)
let offer = await Offer.findOne({
  offerType: "product",
  product: product._id,
  isActive: true,
  startDate: { $lte: now },
  endDate: { $gte: now }
}).lean();

// 2️⃣ CATEGORY OFFER (fallback)
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


    

    let finalPrice = product.price;
    let oldPrice = null;
    let discountPercent = null;

    if (offer) {
      discountPercent = offer.discountPercent;
      oldPrice = product.price;
      finalPrice = Math.round(
        product.price - (product.price * discountPercent) / 100
      );
    }

    res.status(200).json({
      ...product,
      finalPrice,
      oldPrice,
      discountPercent
    });

  } catch (err) {
    console.error("GET SINGLE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
