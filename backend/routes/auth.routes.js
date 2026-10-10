const express = require("express");
const router  = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth.middleware");
const {
  loginLimiter, registerLimiter, passwordLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, register);
router.post("/login",    loginLimiter,    login);
router.get ("/me",              protect, getMe);
router.put ("/update-profile",  protect, updateProfile);
router.put ("/change-password", passwordLimiter, protect, changePassword);

module.exports = router;