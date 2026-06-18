const express = require("express");
const router  = express.Router();
const {
  createBooking,
  getBookings,
  getTestTypes,
  updateStatus,
  assignPhlebotomist,
  verifyBooking,
  rateBooking,
} = require("../controllers/booking.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Public routes
router.get("/test-types",          getTestTypes);
router.get("/verify/:bookingId",   verifyBooking);

// Protected routes
router.get("/",                    protect, getBookings);
router.post("/",                   protect, authorize("user"), createBooking);
router.patch("/:id/status",        protect, updateStatus);
router.patch("/:id/assign",        protect, authorize("admin"), assignPhlebotomist);
router.post("/:id/rate",           protect, authorize("user"), rateBooking);

module.exports = router;