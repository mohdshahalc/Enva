const mongoose = require("mongoose"); // 🔥 FIX 1
const Category = require("../models/category");
const Product = require("../models/product");

/* ======================
   CREATE CATEGORY
====================== */
exports.createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // 🔐 Safe slug generation
    const finalSlug =
      slug?.toLowerCase().trim() ||
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

    const exists = await Category.findOne({ slug: finalSlug });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      status: "active" // 🔥 backend-controlled
    });

    res.status(201).json({
      message: "Category created successfully",
      category
    });

  } catch (err) {
    console.error("CREATE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================
   GET ALL CATEGORIES (ADMIN)
====================== */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat.name,
          isDeleted: false // 🔥 FIX 4
        });

        return {
          ...cat.toObject(),
          productCount: count
        };
      })
    );

    res.status(200).json(categoriesWithCount);

  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.disableCategory = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.status = "inactive";
  await category.save();

  // 🔥 Disable products
  await Product.updateMany(
    { category: category.name },
    { $set: { isActive: false } }
  );

  res.json({ message: "Category disabled successfully" });
};


exports.enableCategory = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.status = "active";
  await category.save();

  // 🔥 RE-ENABLE PRODUCTS
  await Product.updateMany(
    {
      category: category.name,
      isDeleted: { $ne: true } // ⚠️ keep permanently deleted items hidden
    },
    {
      $set: { isActive: true }
    }
  );

  res.json({ message: "Category enabled successfully" });
};
