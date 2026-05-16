const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── protect ───────────────────────────────────────────────────────
// Checks the JWT token in the Authorization header.
// If valid → attaches the user to req.user and continues.
// If missing or invalid → returns 401 Unauthorized.
exports.protect = async (req, res, next) => {
  try {
    // 1. Get token from header:  "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorised. Please log in.",
      });
    }

    // 2. Verify the token using our JWT_SECRET
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user from the token's id
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // 4. Block deactivated accounts
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    // 5. Attach user to request so controllers can use it
    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token is invalid or expired. Please log in again.",
    });
  }
};

// ── authorize ─────────────────────────────────────────────────────
// Used AFTER protect. Checks the user's role.
// Example:  protect, authorize("admin")
// Example:  protect, authorize("admin", "phlebotomist")
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This route is for: ${roles.join(", ")} only.`,
    });
  }
  next();
};