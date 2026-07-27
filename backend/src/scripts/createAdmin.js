const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

mongoose.connect("mongodb+srv://envauser:EnvaMongo123@envacluster.z1pcoaz.mongodb.net/enva?authSource=admin&retryWrites=true&w=majority");

async function createAdmin() {
  const hashedPassword = await bcrypt.hash("admin123", 10);


  
  await User.create({
    name: "Admin",
    email: "admin@gmail.com",
    phone: "9999999999",
    isVerified:"true",
    password: hashedPassword,
    role: "admin"
  });

  console.log("Admin created");
  process.exit();
}

createAdmin();











































































































