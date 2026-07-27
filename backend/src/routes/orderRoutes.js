const express = require("express");
const router = express.Router();
const { placeOrder,getMyOrders,getOrderById,validateCoupon,cancelOrderItem,returnOrderItem } = require("../controllers/orderController");
const auth = require("../middlewares/authMiddleware");

router.post("/", auth, placeOrder);
router.get("/", auth, getMyOrders);
router.get("/:id", auth, getOrderById);
router.post("/validate", auth,validateCoupon);
router.post("/:orderId/items/:itemId/cancel",auth,cancelOrderItem);

router.post("/:orderId/items/:itemId/return",auth,returnOrderItem);


module.exports = router;
