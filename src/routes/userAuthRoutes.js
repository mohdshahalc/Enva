const express = require("express");
const router = express.Router();

const {registerUser,sendSignupOTP,verifySignupOTP,loginUser,sendForgotPasswordOTP,resetPassword,googleAuth} = require("../controllers/userAuthController");

router.post("/user/send-signup-otp", sendSignupOTP);
router.post("/user/verify-signup-otp", verifySignupOTP);

router.post("/user/signup", registerUser);
router.post("/user/google", googleAuth);


router.post("/user/login", loginUser);


router.post("/forgot-password", sendForgotPasswordOTP);
router.post("/user/reset-password",resetPassword);


module.exports = router;
