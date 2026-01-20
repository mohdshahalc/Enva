const express = require("express");
const router = express.Router();

const {registerUser,loginUser,sendForgotPasswordOTP,resetPassword} = require("../controllers/userAuthController");

router.post("/user/signup", registerUser);
router.post("/user/login", loginUser);
router.post("/forgot-password", sendForgotPasswordOTP);
router.post("/user/reset-password",resetPassword);


module.exports = router;
