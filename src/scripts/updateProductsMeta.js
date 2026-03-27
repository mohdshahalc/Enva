require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product"); // adjust if path differs

// Simple presets by category
const presets = {
  "PARTY WEAR": {
    brand: "Enva Signature",
    material: "Premium Rayon",
    style: "Party Wear",
    fitType: "Regular Fit",
    occasion: ["Party", "Evening", "Festive"]
  },

  "HOODIES": {
    brand: "Enva Street",
    material: "Fleece Cotton",
    style: "Casual",
    fitType: "Relaxed Fit",
    occasion: ["Winter", "Casual"]
  },

  "T-SHIRTS": {
    brand: "Enva Basics",
    material: "100% Cotton",
    style: "Casual",
    fitType: "Slim Fit",
    occasion: ["Daily Wear", "Casual"]
  },

  "KURTIS": {
    brand: "Enva Ethnic",
    material: "Soft Cotton",
    style: "Ethnic",
    fitType: "Regular Fit",
    occasion: ["Daily Wear", "Office"]
  }
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Mongo connected");

  const products = await Product.find({ isDeleted: false });

  for (const p of products) {
    const preset = presets[p.category];

    if (!preset) continue;

    await Product.updateOne(
      { _id: p._id },
      {
        $set: {
          brand: preset.brand,
          material: preset.material,
          style: preset.style,
          fitType: preset.fitType,
          occasion: preset.occasion
        }
      }
    );

    console.log(`Updated: ${p.name}`);
  }

  console.log("🎉 Done");
  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
