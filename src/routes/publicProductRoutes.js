const express = require("express");
const router = express.Router();
const { getAllProducts, getSingleProduct } = require("../controllers/publicProductController");

router.get("/", getAllProducts);
router.get("/:id", getSingleProduct);

module.exports = router;
