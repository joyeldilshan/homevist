const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Helper: generate JWT token ────────────────────────────────────
// Signs a token with the user's id and our secret key.
// Expires in 7 days (set in .env as JWT_EXPIRES_IN).
const signToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ── Helper: send token response ───────────────────────────────────
// Creates the token and sends it back with the user object.
const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,   // frontend stores this in localStorage
    user,    // user object (password already removed by toJSON())
  });
};

// ── REGISTER ─────────────────────────────────────────────────────
// POST /api/auth/register
// Anyone can register as a "user" (patient).
// Phlebotomists and admins are created by admin only.
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, age, gender, address } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Create the user — role is always "user" for self-registration
    const user = await User.create({
      name,
      email,
      phone,
      password,  // auto-hashed by the pre-save hook in User.js
      age,
      gender,
      address,
      role: "user",
    });

    sendToken(user, 201, res);

  } catch (err) {
    next(err);
  }
};

// ── LOGIN ────────────────────────────────────────────────────────
// POST /api/auth/login
// Works for all roles: user, phlebotomist, admin.
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    // 2. Find user — we need password so we use select("+password")
    //    (password has select:false in the schema so it is hidden by default)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 3. Compare entered password with hashed password in DB
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 4. Block deactivated accounts
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    sendToken(user, 200, res);

  } catch (err) {
    next(err);
  }
};

// ── GET ME ───────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the currently logged in user's profile.
// Requires the protect middleware.
exports.getMe = async (req, res) => {
  // req.user is already attached by the protect middleware
  res.json({
    success: true,
    user: req.user,
  });
};

// ── UPDATE MY PROFILE ────────────────────────────────────────────
// PUT /api/auth/update-profile
// Lets any logged in user update their own name, phone, age, etc.
exports.updateProfile = async (req, res, next) => {
  try {
    // Only allow safe fields to be updated — never role or password here
    const allowed = ["name", "phone", "age", "gender", "address", "avatar"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });

  } catch (err) {
    next(err);
  }
};

// ── CHANGE PASSWORD ──────────────────────────────────────────────
// PUT /api/auth/change-password
// User must provide their current password to set a new one.
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password.",
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select("+password");

    // Check current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Set new password — pre-save hook will hash it automatically
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully." });

  } catch (err) {
    next(err);
  }
};