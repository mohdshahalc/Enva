const express = require("express");
const router = express.Router();
const { createCategory,getCategories,disableCategory,enableCategory } = require("../controllers/AdminCategoryController");
const auth = require("../middlewares/authMiddleware");

router.post("/",auth,createCategory);
router.get("/",auth,getCategories);
// router.delete("/:id",auth,deleteCategory);
router.put("/:id/disable", auth, disableCategory);
router.put("/:id/enable", auth, enableCategory);


module.exports = router;
