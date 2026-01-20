const express = require("express");
const router = express.Router();
const { createCoupon,getAllCoupons,deleteCoupon,getCouponStats} = require("../controllers/AdminCouponController");

// ADMIN – Create coupon
router.post("/", createCoupon);
router.get("/",getAllCoupons)
router.delete("/:id", deleteCoupon);
router.get("/stats", getCouponStats);

module.exports = router;
