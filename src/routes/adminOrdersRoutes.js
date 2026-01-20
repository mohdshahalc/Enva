const express = require("express");
const router = express.Router();
const { getAllOrders,getOrderByIdAdmin,updateOrderStatus} = require("../controllers/adminOrderController");

router.get("/", getAllOrders);
router.get("/:id", getOrderByIdAdmin);
router.patch("/:id/status", updateOrderStatus);




module.exports = router;
