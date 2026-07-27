const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { generateAccessToken } = require("../utils/token");

module.exports = async (req, res, next) => {
  try {
    // ======================
    // ROUTE TYPE
    // ======================
    const isAdminRoute = req.originalUrl.startsWith("/api/admin");

    // ======================
    // ACCESS TOKEN
    // ======================
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // ======================
    // REFRESH TOKEN (ROLE SAFE)
    // ======================
    const refreshToken = isAdminRoute
      ? req.cookies?.adminRefreshToken
      : req.cookies?.userRefreshToken;

    // ❌ NO TOKENS
    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ======================
    // TRY ACCESS TOKEN
    // ======================
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        // 🔐 HARD ROLE CHECK
        if (isAdminRoute && decoded.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }

        req.user = decoded;
        return next();
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({ message: "Invalid token" });
        }
      }
    }

    // ======================
    // REFRESH TOKEN REQUIRED
    // ======================
    if (!refreshToken) {
      return res.status(401).json({
        message: "Session expired. Please login again."
      });
    }

    // ======================
    // VERIFY REFRESH TOKEN
    // ======================
    let decodedRefresh;
    try {
      decodedRefresh = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch {
      return res.status(401).json({
        message: "Session expired. Please login again."
      });
    }

    // ======================
    // USER VALIDATION
    // ======================
    const user = await User.findById(decodedRefresh.id);

    if (
      !user ||
      user.refreshToken !== refreshToken ||
      user.role !== decodedRefresh.role
    ) {
      return res.status(401).json({
        message: "Invalid session. Please login again."
      });
    }

    // 🔐 BLOCK ROLE ESCALATION
    if (isAdminRoute && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ======================
    // ISSUE NEW ACCESS TOKEN
    // ======================
    const newAccessToken = generateAccessToken(user._id, user.role);

    res.setHeader("x-access-token", newAccessToken);
    req.user = { id: user._id, role: user.role };

    next();

  } catch {
    return res.status(401).json({
      message: "Invalid or expired session"
    });
  }
};
