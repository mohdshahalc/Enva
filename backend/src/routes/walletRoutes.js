const express = require("express");
const router = express.Router();

const { getWallet } = require("../controllers/walletController");
const auth = require("../middlewares/authMiddleware");

// 🔐 USER WALLET
router.get("/", auth, getWallet);

module.exports = router;
