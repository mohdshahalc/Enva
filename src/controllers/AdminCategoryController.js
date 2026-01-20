const Category = require("../models/category");
const Product = require("../models/product");

exports.createCategory = async (req, res) => {
  try {
    const { name, status, slug } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    const exists = await Category.findOne({ slug: finalSlug });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      slug: finalSlug,
      status
    });

    res.status(201).json({
      message: "Category created successfully",
      category
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat.name
        });

        return {
          ...cat.toObject(),
          productCount: count
        };
      })
    );

    res.status(200).json(categoriesWithCount);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find category first
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 2️⃣ Delete products under this category
    const productResult = await Product.deleteMany({
      category: category.name  
          });

    // 3️⃣ Delete category
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category and related products deleted successfully",
      deletedProducts: productResult.deletedCount
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
