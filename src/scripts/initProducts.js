const mongoose = require("mongoose");
const Product = require("../models/product");

mongoose.connect("mongodb+srv://envauser:EnvaMongo123@envacluster.z1pcoaz.mongodb.net/enva?authSource=admin&retryWrites=true&w=majority");

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
