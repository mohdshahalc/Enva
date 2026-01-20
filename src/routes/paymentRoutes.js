const express = require("express");
const router = express.Router();
const { createCheckoutSession,createWalletTopupSession } = require("../controllers/paymentController");
const auth = require("../middlewares/authMiddleware");

router.post("/create-checkout-session", auth, createCheckoutSession);
// routes/paymentRoutes.js
router.post("/wallet-topup", auth, createWalletTopupSession);

module.exports = router;
