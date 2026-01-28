const mongoose = require("mongoose");
const Product = require("../models/product");

mongoose.connect("mongodb://localhost:27017/enva");

async function initProducts() {
  const result = await Product.updateMany(
    {
      isDeleted: { $exists: false }
    },
    {
      $set: {
        isDeleted: false,
        isActive: true
      }
    }
  );

  console.log("Products initialized:", result.modifiedCount);
  mongoose.disconnect();
}

initProducts();
