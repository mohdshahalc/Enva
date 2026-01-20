const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const {addToWishlist,getWishlist,removeFromWishlist} = require("../controllers/wishlistController");

router.post("/add", auth, addToWishlist);
router.get("/", auth, getWishlist);
router.delete("/remove/:productId/:size", auth, removeFromWishlist);


module.exports = router;
