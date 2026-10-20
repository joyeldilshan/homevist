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

// Barcode scan lookup. It returns the patient's name, phone and address,
// and the booking ID is printed on the sample label, so it is staff only
// (it used to be public).
router.get("/verify/:bookingId",   protect, authorize("admin", "mlt", "phlebotomist"), verifyBooking);

// Protected routes
router.get("/",                    protect, getBookings);
router.post("/",                   protect, authorize("user"), createBooking);
router.patch("/:id/status",        protect, updateStatus);
router.patch("/:id/assign",        protect, authorize("admin"), assignPhlebotomist);
router.post("/:id/rate",           protect, authorize("user"), rateBooking);

module.exports = router;