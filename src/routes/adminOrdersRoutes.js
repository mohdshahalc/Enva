const express = require("express");
const router = express.Router();
const { getAllOrders,getOrderByIdAdmin,updateOrderItemStatus} = require("../controllers/adminOrderController");
const auth = require("../middlewares/authMiddleware");

router.get("/", auth,getAllOrders);
router.get("/:id",auth,getOrderByIdAdmin);
router.patch("/:orderId/items/:itemId/status", auth, updateOrderItemStatus);


module.exports = router;
