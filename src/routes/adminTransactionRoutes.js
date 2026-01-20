const router = require("express").Router();
const { getAllTransactions } = require("../controllers/adminTransactionController");


router.get("/", getAllTransactions);

module.exports = router;
