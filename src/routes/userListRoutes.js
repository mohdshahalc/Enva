const express = require("express");
const router = express.Router();
const { getAllCustomers,unblockCustomer,blockCustomer } = require("../controllers/AdminUserListController");
const auth = require("../middlewares/authMiddleware");


router.get("/",auth,getAllCustomers);
router.patch("/block-user/:id",auth,blockCustomer);
router.patch("/unblock-user/:id",auth,unblockCustomer);



module.exports = router;
