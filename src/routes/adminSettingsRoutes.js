const router = require("express").Router();
const { getAdminProfile,updateAdminPassword } = require("../controllers/adminSettingsController");
const auth = require("../middlewares/authMiddleware");

router.get("/",auth,getAdminProfile);
router.post("/update-password",auth,updateAdminPassword);


module.exports = router;
