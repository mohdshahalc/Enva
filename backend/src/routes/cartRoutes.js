const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { addToCart,getUserCart,updateCartQuantity,removeFromCart } = require("../controllers/cartController");

router.post("/add", auth, addToCart);
router.get("/", auth, getUserCart);
router.put("/update", auth, updateCartQuantity);
router.delete("/remove/:productId/:size", auth, removeFromCart);


module.exports = router;
