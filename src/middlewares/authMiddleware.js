const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { generateAccessToken } = require("../utils/token");

module.exports = async (req, res, next) => {
  try {
    // 1️⃣ ACCESS TOKEN
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // 2️⃣ REFRESH TOKEN (from cookie)
    const refreshToken = req.cookies?.refreshToken;

    // ❌ NO TOKENS AT ALL
    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ TRY ACCESS TOKEN
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (err) {
        // access token expired → try refresh
      }
    }

    // ❌ ACCESS EXPIRED & NO REFRESH
    if (!refreshToken) {
      return res.status(401).json({
        message: "Session expired. Please login again."
      });
    }

    // 🔄 VERIFY REFRESH TOKEN
    const decodedRefresh = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // 🔍 CHECK USER + TOKEN MATCH
    const user = await User.findById(decodedRefresh.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        message: "Invalid session. Please login again."
      });
    }

    // 🔑 CREATE NEW ACCESS TOKEN
    const newAccessToken = generateAccessToken(user._id);

    // 🔁 SEND TOKEN BACK
    res.setHeader("x-access-token", newAccessToken);
    req.user = { id: user._id };

    next();

  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired session"
    });
  }
};
