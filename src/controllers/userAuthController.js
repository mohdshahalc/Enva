const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { generateAccessToken, generateRefreshToken,generateAdminAccessToken } = require("../utils/token");
const nodemailer = require("nodemailer");
const transporter = require("../utils/mailer");
const crypto = require("crypto");

/* ===========================
   REGISTER USER
=========================== */
exports.registerUser = async (req, res) => {
  return res.status(403).json({
    message: "Direct signup disabled. Please verify email with OTP."
  });
};



/* ===========================
   LOGIN USER
=========================== */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

   const user = await User.findOne({ email });

if (!user) {
  return res.status(401).json({ message: "Invalid credentials" });
}

if (!user.isVerified) {
  return res.status(403).json({
    message: "Please verify your email during signup"
  });
}

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ======================
    // TOKEN GENERATION
    // ======================
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user); // ✅ BOTH ADMIN & USER

    // ======================
    // SAVE REFRESH TOKEN
    // ======================
    user.refreshToken = refreshToken;
    user.refreshTokenRole = user.role;
    await user.save();

    // ======================
    // COOKIE CONFIG (🔥 FIX)
    // ======================
    if (user.role === "admin") {
      res.cookie("adminRefreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: false, // true in prod
        path: "/api/admin", // 🔥 ADMIN SCOPE
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    } else {
      res.cookie("userRefreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: false,
        path: "/api/user", // 🔥 USER SCOPE
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    // ======================
    // RESPONSE
    // ======================
    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    // ✅ CHECK USER EXISTS
   const user = await User.findOne({ email, isVerified: true });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email"
      });
    }

    // 🔢 GENERATE 4-DIGIT OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // 📧 SEND EMAIL
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP",
      html: `
        <h2>Verify Your Email</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing:4px">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      `
    });

    res.json({
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({
      message: "Failed to send OTP"
    });
  }
};

exports.sendSignupOTP = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // ❌ Block already verified users
    const existing = await User.findOne({ email, isVerified: true });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 🔐 Hash password now
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧠 Find temp user if exists
    let user = await User.findOne({ email });

    // 🔢 Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    if (!user) {
      // Create temp user
      user = new User({ email });
    }

    // 🧹 Clear previous OTP (important)
    user.otp = undefined;
    user.otpExpires = undefined;

    // Save new OTP + temp signup
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.tempSignup = {
      name,
      email,
      phone,
      password: hashedPassword
    };

    await user.save();

    // 📧 Send email
    await transporter.sendMail({
      to: email,
      subject: "Verify your Enva account",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP:</p>
        <h1>${otp}</h1>
        <p>Valid for 5 minutes</p>
      `
    });

    res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


exports.verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user || !user.tempSignup) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Finalize account
    user.name = user.tempSignup.name;
    user.phone = user.tempSignup.phone;
    user.password = user.tempSignup.password;
    user.isVerified = true;

    user.tempSignup = undefined;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ message: "Email verified. Account created successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
};



exports.resetPassword = async (req, res) => {
  try {
 
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({
        message: "OTP and new password are required"
      });
    }

    // 🔍 FIND USER BY OTP
   const user = await User.findOne({
  otp,
  otpExpires: { $gt: Date.now() },
  isVerified: true
});

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    // 🔒 HASH PASSWORD
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // 🧹 CLEAR OTP DATA
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({
      message: "Password reset successful"
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};
