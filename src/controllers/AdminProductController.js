const Product = require("../models/product");
// CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, category, description, sizes } = req.body;

    if (!name || !price || !stock || !category) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Images are required" });
    }

    // 🟦 Parse size-wise quantities
    let sizeStock = {};
    if (sizes) {
      sizeStock = JSON.parse(sizes); // 🔥 IMPORTANT
    }

    const images = req.files.map(file => file.filename);

    const product = await Product.create({
      name,
      price,
      stock,          // total stock
      sizes: sizeStock, // size-wise stock
      category,
      description,
      images
    });

    res.status(201).json({
      message: "Product added successfully",
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
  
    const productId = req.params.id;
    const { name, price, category, description, sizes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🟦 Parse sizes & auto-calc stock
    let sizeStock = product.sizes;
    let totalStock = product.stock;

    if (sizes) {
      sizeStock = JSON.parse(sizes);
      totalStock = Object.values(sizeStock).reduce(
        (sum, qty) => sum + Number(qty),
        0
      );
    }

   // 🖼️ Images (handle delete + append)
let images = product.images || [];

// 🔴 REMOVE images deleted in frontend
if (req.body.removedImages) {
  const removedImages = JSON.parse(req.body.removedImages);
  images = images.filter(img => !removedImages.includes(img));
}

// 🟢 APPEND new images
if (req.files && req.files.length > 0) {
  const newImages = req.files.map(file => file.filename);
  images = [...images, ...newImages];
}

// 🔒 ENFORCE MAX 3 IMAGES
images = images.slice(0, 3);



    // ✅ Update fields
    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.category = category ?? product.category;
    product.description = description ?? product.description;
    product.sizes = sizeStock;
    product.stock = totalStock;
    product.images = images;

    await product.save();

    res.json({
      message: "Product updated successfully",
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};


// GET ALL PRODUCTS (OPTIMIZED – no logic change)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isDeleted: false })
      .select("name price stock category images description sizes createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};
