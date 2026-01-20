const express = require("express");
const router = express.Router();
const { createCategory,getCategories,deleteCategory } = require("../controllers/AdminCategoryController");


router.post("/", createCategory);
router.get("/", getCategories);
router.delete("/:id", deleteCategory);

module.exports = router;
