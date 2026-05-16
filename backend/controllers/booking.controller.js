const Booking  = require("../models/Booking");
const TestType = require("../models/TestType");
const User     = require("../models/User");
const { sendSMS, sendEmail } = require("../utils/notify");

// POST /api/bookings
// Patient creates a new booking
exports.createBooking = async (req, res, next) => {
  try {
    const {
      testTypeId,
      appointmentDate,
      appointmentTime,
      address,
      coordinates,
      isHomeVisit,
      paymentMethod,
      notes,
    } = req.body;

    const testType = await TestType.findById(testTypeId);
    if (!testType) {
      return res.status(404).json({ success: false, message: "Test type not found." });
    }

    const booking = await Booking.create({
      user:            req.user._id,
      testType:        testTypeId,
      appointmentDate,
      appointmentTime,
      address,
      coordinates,
      isHomeVisit:     isHomeVisit !== undefined ? isHomeVisit : true,
      amount:          testType.price,
      paymentMethod:   paymentMethod || "cash",
      notes,
      statusHistory: [{
        status:    "pending",
        updatedBy: req.user._id,
        note:      "Booking created by patient",
      }],
    });

    // Notify admins in real time
    req.io.to("admin_room").emit("new_booking", {
      bookingId: booking.bookingId,
      patient:   req.user.name,
      test:      testType.name,
    });

    await booking.populate(["user", "testType"]);

    // Send SMS and email confirmation to patient
    await sendSMS(
      req.user.phone,
      "HemoVisit: Your booking #" + booking.bookingId + " for " + testType.name + " on " + appointmentDate + " at " + appointmentTime + " is received. We will assign a phlebotomist shortly."
    );
    await sendEmail(
      req.user.email,
      "Booking Confirmed - HemoVisit",
      "<p>Dear " + req.user.name + ",</p><p>Your booking <b>#" + booking.bookingId + "</b> for <b>" + testType.name + "</b> has been received and is pending phlebotomist assignment.</p><p>Date: " + appointmentDate + " at " + appointmentTime + "</p>"
    );

    res.status(201).json({ success: true, booking });

  } catch (err) {
    next(err);
  }
};

// GET /api/bookings
// Returns bookings based on role
exports.getBookings = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "user") {
      filter.user = req.user._id;
    }
    if (req.user.role === "phlebotomist") {
      // Show bookings assigned to this phlebotomist
      // OR pending bookings not yet assigned to anyone
      filter.$or = [
        { phlebotomist: req.user._id },
        { phlebotomist: null, status: "pending" },
      ];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const day     = new Date(req.query.date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      filter.appointmentDate = { $gte: day, $lt: nextDay };
    }

    const bookings = await Booking.find(filter)
      .populate("user",         "name phone email")
      .populate("phlebotomist", "name phone")
      .populate("testType",     "name price code")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });

  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/:id
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user",         "name phone email address age gender")
      .populate("phlebotomist", "name phone serviceArea rating")
      .populate("testType");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    res.json({ success: true, booking });

  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/verify/:bookingId
// PUBLIC - called when lab staff scans barcode or QR code
exports.verifyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate("user",         "name phone email age gender address")
      .populate("phlebotomist", "name phone licenseNumber")
      .populate("testType",     "name code price parameters");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found. Invalid barcode." });
    }

    res.json({
      success: true,
      scan: {
        bookingId:     booking.bookingId,
        reportId:      "HV-RPT-" + booking._id.toString().slice(-6).toUpperCase(),
        status:        booking.status,
        paymentStatus: booking.paymentStatus,
        reportReady:   !!booking.reportFile,
        patient: {
          name:    booking.user.name,
          age:     booking.user.age,
          gender:  booking.user.gender,
          phone:   booking.user.phone,
          address: booking.address,
        },
        test: {
          name:  booking.testType.name,
          code:  booking.testType.code,
          price: booking.amount,
        },
        appointment: {
          date:        booking.appointmentDate,
          time:        booking.appointmentTime,
          isHomeVisit: booking.isHomeVisit,
        },
        phlebotomist: booking.phlebotomist
          ? { name: booking.phlebotomist.name, phone: booking.phlebotomist.phone }
          : null,
      },
    });

  } catch (err) {
    next(err);
  }
};

// PATCH /api/bookings/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const allowed = {
      admin:        ["confirmed", "cancelled", "rejected", "processing", "completed", "sample_collected"],
      phlebotomist: ["confirmed", "sample_collected", "processing", "completed", "rejected"],
      user:         ["cancelled"],
    };

    if (!allowed[req.user.role]?.includes(status)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to set this status.",
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("user",     "name phone email")
      .populate("testType", "name");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    booking.status = status;
    booking.statusHistory.push({
      status,
      updatedBy: req.user._id,
      note:      note || "",
    });

    await booking.save();

    // Notify patient of status change
    await sendSMS(
      booking.user.phone,
      "HemoVisit: Your booking #" + booking.bookingId + " status updated to: " + status.toUpperCase() + ". Log in to view details."
    );

    // Notify patient in real time via socket
    req.io.to(booking.bookingId).emit("status_update", {
      bookingId: booking.bookingId,
      status:    booking.status,
    });

    res.json({ success: true, booking });

  } catch (err) {
    next(err);
  }
};

// PATCH /api/bookings/:id/assign
// Admin assigns a phlebotomist
exports.assignPhlebotomist = async (req, res, next) => {
  try {
    const { phlebotomistId } = req.body;

    const phlebo = await User.findOne({
      _id:         phlebotomistId,
      role:        "phlebotomist",
      isAvailable: true,
      isActive:    true,
    });

    if (!phlebo) {
      return res.status(404).json({
        success: false,
        message: "Phlebotomist not found or not available.",
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        phlebotomist: phlebotomistId,
        status:       "confirmed",
        $push: {
          statusHistory: {
            status:    "confirmed",
            updatedBy: req.user._id,
            note:      "Phlebotomist assigned by admin",
          },
        },
      },
      { new: true }
    ).populate("user testType phlebotomist");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Notify phlebotomist by SMS
    await sendSMS(
      phlebo.phone,
      "HemoVisit: New assignment #" + booking.bookingId + ". Patient: " + booking.user.name + ". Address: " + booking.address + ". Date: " + booking.appointmentDate + " " + booking.appointmentTime
    );

    // Notify patient
    req.io.to(booking.bookingId).emit("status_update", {
      bookingId: booking.bookingId,
      status:    "confirmed",
    });

    res.json({ success: true, booking });

  } catch (err) {
    next(err);
  }
};

// POST /api/bookings/:id/rate
// Patient rates the phlebotomist
exports.rateBooking = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const booking = await Booking.findOne({
      _id:    req.params.id,
      user:   req.user._id,
      status: "completed",
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Completed booking not found." });
    }

    booking.userRating   = rating;
    booking.userFeedback = feedback;
    await booking.save();

    // Update phlebotomist average rating
    if (booking.phlebotomist) {
      const phlebo       = await User.findById(booking.phlebotomist);
      const totalRatings = phlebo.totalRatings + 1;
      phlebo.rating      = ((phlebo.rating * phlebo.totalRatings) + rating) / totalRatings;
      phlebo.totalRatings = totalRatings;
      await phlebo.save();
    }

    res.json({ success: true, message: "Thank you for your feedback!" });

  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/test-types
// Get all active test types for the booking form
exports.getTestTypes = async (req, res, next) => {
  try {
    const testTypes = await TestType.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, testTypes });
  } catch (err) {
    next(err);
  }
};