const router = require("express").Router();
const { getAllTransactions } = require("../controllers/adminTransactionController");
const auth = require("../middlewares/authMiddleware");

router.get("/",auth,getAllTransactions);

module.exports = router;
