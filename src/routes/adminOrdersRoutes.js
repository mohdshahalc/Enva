const express = require("express");
const router = express.Router();
const { getAllOrders,getOrderByIdAdmin,updateOrderStatus} = require("../controllers/adminOrderController");
const auth = require("../middlewares/authMiddleware");

router.get("/", auth,getAllOrders);
router.get("/:id",auth,getOrderByIdAdmin);
router.patch("/:id/status",auth,updateOrderStatus);




module.exports = router;
