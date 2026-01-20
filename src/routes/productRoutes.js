const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const {createProduct,getProducts,deleteProduct,updateProduct} = require("../controllers/AdminProductController");


router.post("/", upload.array("images", 3), createProduct);
router.put("/:id", upload.array("images", 3), updateProduct); 
router.get("/", getProducts);
router.delete("/:id", deleteProduct);

module.exports = router;