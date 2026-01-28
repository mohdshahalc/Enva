const jwt = require("jsonwebtoken");

// ======================
// ACCESS TOKEN (15 min)
// ======================
exports.generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// ======================
// ADMIN ACCESS TOKEN (15 min)
// ======================
exports.generateAdminAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // 🔥 MUST EXPIRE
  );
};

// ======================
// REFRESH TOKEN (7 days)
// ======================
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};
