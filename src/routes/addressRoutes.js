const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const {getAddresses,addAddress,deleteAddress,setDefaultAddress,updateAddress} = require("../controllers/addressController");

router.get("/", auth, getAddresses);
router.post("/add", auth, addAddress);
router.delete("/:id", auth, deleteAddress);
router.put("/default/:id",auth,setDefaultAddress);
router.put("/:id", auth, updateAddress);



module.exports = router;
