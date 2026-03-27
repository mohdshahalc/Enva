const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const {createProduct,getProducts,deleteProduct,updateProduct} = require("../controllers/AdminProductController");
const auth = require("../middlewares/authMiddleware");

router.post("/", upload.array("images", 3),auth,createProduct);
router.put("/:id", upload.array("images", 3),auth,updateProduct); 
router.get("/",getProducts);
router.delete("/:id",auth,deleteProduct);

module.exports = router;