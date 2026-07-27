const express = require("express");
const router = express.Router();
const { createCoupon,getAllCoupons,deleteCoupon,getCouponStats} = require("../controllers/AdminCouponController");
const auth = require("../middlewares/authMiddleware");

// ADMIN – Create coupon
router.post("/",auth,createCoupon);
router.get("/",getAllCoupons)
router.delete("/:id",auth,deleteCoupon);
router.get("/stats",auth,getCouponStats);

module.exports = router;
