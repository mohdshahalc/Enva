const router = require("express").Router();
const { getAdminProfile,updateAdminPassword } = require("../controllers/adminSettingsController");


router.get("/", getAdminProfile);
router.post("/update-password", updateAdminPassword);


module.exports = router;
