const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

mongoose.connect("mongodb://127.0.0.1:27017/enva");

async function createAdmin() {
  const hashedPassword = await bcrypt.hash("admin123", 10);


  
  await User.create({
    name: "Admin",
    email: "admin@gmail.com",
    phone: "9999999999",
    password: hashedPassword,
    role: "admin"
  });

  console.log("Admin created");
  process.exit();
}

createAdmin();
