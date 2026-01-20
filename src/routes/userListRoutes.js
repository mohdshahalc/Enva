const express = require("express");
const router = express.Router();
const { getAllCustomers,unblockCustomer,blockCustomer } = require("../controllers/AdminUserListController");

router.get("/", getAllCustomers);
router.patch("/block-user/:id", blockCustomer);
router.patch("/unblock-user/:id", unblockCustomer);



module.exports = router;
