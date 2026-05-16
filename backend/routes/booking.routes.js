const express = require("express");
const router  = express.Router();

const {
  createBooking,
  getBookings,
  getBooking,
  verifyBooking,
  updateStatus,
  assignPhlebotomist,
  rateBooking,
  getTestTypes,
} = require("../controllers/booking.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

// Public — barcode / QR scan by lab staff (no login needed)
router.get("/verify/:bookingId", verifyBooking);

// Get all test types — for the booking form dropdown
router.get("/test-types", protect, getTestTypes);

// Create and list bookings
router.post("/",  protect, createBooking);
router.get("/",   protect, getBookings);

// Single booking
router.get("/:id", protect, getBooking);

// Update status — role checked inside controller
router.patch("/:id/status", protect, updateStatus);

// Assign phlebotomist — admin only
router.patch("/:id/assign", protect, authorize("admin"), assignPhlebotomist);

// Rate a completed booking — patient only
router.post("/:id/rate", protect, authorize("user"), rateBooking);

module.exports = router;