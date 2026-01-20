// const jwt = require("jsonwebtoken");
// const User = require("../models/user");
// const { generateAccessToken } = require("../utils/token");

// exports.refreshToken = async (req, res) => {
//   const { refreshToken } = req.body;

//   if (!refreshToken) {
//     return res.status(401).json({ message: "Refresh token required" });
//   }

//   try {
//     const decoded = jwt.verify(
//       refreshToken,
//       process.env.JWT_REFRESH_SECRET
//     );

//     const user = await User.findById(decoded.id);

//     if (!user || user.refreshToken !== refreshToken) {
//       return res.status(403).json({ message: "Invalid refresh token" });
//     }

//     if (user.isBlocked) {
//       return res.status(403).json({ message: "Account blocked" });
//     }

//     const newAccessToken = generateAccessToken(user._id);

//     res.json({ accessToken: newAccessToken });

//   } catch (err) {
//     res.status(403).json({ message: "Refresh token expired" });
//   }
// };
