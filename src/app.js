const express = require("express");
const path=require('path')
const app = express();
const userRoutes=require("./routes/userAuthRoutes")
const cateogoryRoute=require('./routes/categoryRoutes')
const productRoutes=require('./routes/productRoutes')
const publicProductRoutes = require("./routes/publicProductRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const profileRoute=require('./routes/profileRoutes')
const addressRoutes=require("./routes/addressRoutes");
const orderRoutes=require("./routes/orderRoutes")
const couponRoutes = require("./routes/couponRoutes");
const userListRoutes=require("./routes/userListRoutes")
const adminOrdersRoutes=require("./routes/adminOrdersRoutes")
const offersRoutes=require("./routes/offersRoutes")
const paymentRoutes = require("./routes/paymentRoutes");
const walletRoutes = require("./routes/walletRoutes");
const dashBoardRoutes=require("./routes/adminDashboardRoutes")
const adminTransactions=require("./routes/adminTransactionRoutes")
const cookieParser = require("cookie-parser");
const adminSettigsRoutes=require("./routes/adminSettingsRoutes")

// ================================
// 🔥 STRIPE WEBHOOK — RAW BODY ONLY
// ================================
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  require("./controllers/stripeWebhookController").stripeWebhook
);


app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.get("/", (req, res) => {
  res.redirect("/UI/home.html");
});



// routes
app.use("/api/auth",userRoutes );
app.use("/api/admin/categories", cateogoryRoute);
app.use("/api/admin/profile", adminSettigsRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/coupons", couponRoutes);
app.use("/api/admin/customers",userListRoutes)
app.use("/api/admin/orders",adminOrdersRoutes)
app.use("/api/admin/offers",offersRoutes)
app.use("/api/payment", paymentRoutes);
app.use("/api/admin/dashboard", dashBoardRoutes);
app.use("/api/admin/transactions",adminTransactions);





app.use("/api/user/products", publicProductRoutes);
app.use("/api/user/cart", cartRoutes);
app.use("/api/user/wishlist", wishlistRoutes);
app.use("/api/user",profileRoute)
app.use("/api/user/address",addressRoutes);
app.use("/api/user/orders", orderRoutes);
app.use("/api/user/wallet", walletRoutes);





module.exports = app;
