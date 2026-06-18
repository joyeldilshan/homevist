const Booking  = require("../models/Booking");
const TestType = require("../models/TestType");
const User     = require("../models/User");
const { sendSMS } = require("../utils/notify");
const { sendBookingEmails, sendPhlebotomistAssignment } = require("../utils/emailService");

// POST /api/bookings — Patient creates booking (supports multiple tests)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      testTypeIds, testTypeId,
      appointmentDate, appointmentTime,
      address, coordinates, isHomeVisit, paymentMethod, notes,
    } = req.body;

    const ids = testTypeIds?.length ? testTypeIds : testTypeId ? [testTypeId] : [];
    if (!ids.length)         return res.status(400).json({ success:false, message:"Select at least one test." });
    if (!appointmentDate || !address)
      return res.status(400).json({ success:false, message:"Date and address are required." });

    const testTypes = await TestType.find({ _id:{ $in:ids }, isActive:true });
    if (testTypes.length === 0)
      return res.status(404).json({ success:false, message:"No valid test types found." });

    const totalAmount = testTypes.reduce((sum, t) => sum + (t.price || 0), 0);

    const booking = await Booking.create({
      user:            req.user._id,
      testTypes:       ids,
      testType:        ids[0],
      appointmentDate, appointmentTime, address, coordinates,
      isHomeVisit:     isHomeVisit !== undefined ? isHomeVisit : true,
      amount:          totalAmount,
      paymentMethod:   paymentMethod || "cash",
      notes,
      statusHistory: [{ status:"pending", updatedBy:req.user._id, note:"Booking created by patient" }],
    });

    await booking.populate([
      { path:"testTypes", select:"name code price duration preparation" },
      { path:"testType",  select:"name code price" },
      { path:"user",      select:"name email phone" },
    ]);

    if (req.io) {
      req.io.to("admin_room").emit("new_booking", {
        bookingId: booking.bookingId,
        patient:   req.user.name,
        tests:     testTypes.map(t => t.name).join(", "),
        count:     testTypes.length,
      });
    }

    // SMS (guarded — only if patient has a phone)
    if (req.user?.phone) {
      const testNames = testTypes.map(t => t.name).join(", ");
      await sendSMS(req.user.phone,
        `HemoVisit: Booking #${booking.bookingId} for ${testNames} on ${appointmentDate} at ${appointmentTime} received. Phlebotomist will be assigned shortly.`);
    }

    sendBookingEmails(booking, req.user).catch(err => console.error("📧 Email error:", err.message));

    res.status(201).json({ success:true, booking });
  } catch (err) { next(err); }
};

// GET /api/bookings
exports.getBookings = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "user") filter.user = req.user._id;
    if (req.user.role === "phlebotomist") {
      filter.$or = [
        { phlebotomist: req.user._id },
        { phlebotomist: null, status: "pending" },
      ];
    }
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("user",         "name phone email")
      .populate("phlebotomist", "name phone rating")
      .populate("testType",     "name price code")
      .populate("testTypes",    "name price code duration")
      .sort({ createdAt: -1 });

    res.json({ success:true, count:bookings.length, bookings });
  } catch (err) { next(err); }
};

// GET /api/bookings/test-types
exports.getTestTypes = async (req, res, next) => {
  try {
    const testTypes = await TestType.find({ isActive:true }).sort({ name:1 });
    res.json({ success:true, testTypes });
  } catch (err) { next(err); }
};

// GET /api/bookings/verify/:bookingId
exports.verifyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate("user",         "name phone email age gender address")
      .populate("phlebotomist", "name phone licenseNumber")
      .populate("testType",     "name code price")
      .populate("testTypes",    "name code price");

    if (!booking) return res.status(404).json({ success:false, message:"Booking not found." });

    const tests = booking.testTypes?.length ? booking.testTypes : [booking.testType].filter(Boolean);

    res.json({
      success: true,
      scan: {
        bookingId:   booking.bookingId,
        status:      booking.status,
        reportReady: !!booking.reportFile,
        patient: {
          name:    booking.user?.name    || "Unknown",
          phone:   booking.user?.phone   || "—",
          address: booking.address       || "—",
        },
        tests: tests.map(t => ({ name:t?.name, code:t?.code, price:t?.price })),
        totalAmount:  booking.amount,
        appointment:  { date:booking.appointmentDate, time:booking.appointmentTime },
        phlebotomist: booking.phlebotomist
          ? { name:booking.phlebotomist.name, phone:booking.phlebotomist.phone }
          : null,
      },
    });
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const allowed = {
      admin:        ["confirmed","cancelled","rejected","processing","completed","sample_collected"],
      phlebotomist: ["confirmed","sample_collected","processing","completed","rejected"],
      user:         ["cancelled"],
    };
    if (!allowed[req.user.role]?.includes(status)) {
      return res.status(403).json({ success:false, message:"You are not allowed to set this status." });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("user",     "name phone email")
      .populate("testType", "name")
      .populate("testTypes","name");

    if (!booking) return res.status(404).json({ success:false, message:"Booking not found." });

    booking.status = status;
    booking.statusHistory.push({ status, updatedBy:req.user._id, note:note||"" });
    await booking.save();

    // SMS (guarded — booking.user may be null if the patient was deleted)
    if (booking.user?.phone) {
      await sendSMS(booking.user.phone,
        `HemoVisit: Booking #${booking.bookingId} status updated to ${status.toUpperCase()}.`);
    }

    if (req.io) {
      req.io.to(booking.bookingId).emit("status_update", { bookingId:booking.bookingId, status });
    }

    res.json({ success:true, booking });
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/assign
exports.assignPhlebotomist = async (req, res, next) => {
  try {
    const { phlebotomistId } = req.body;
    const phlebo = await User.findOne({ _id:phlebotomistId, role:"phlebotomist", isActive:true });
    if (!phlebo) return res.status(404).json({ success:false, message:"Phlebotomist not found." });

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { phlebotomist:phlebotomistId, status:"confirmed",
        $push:{ statusHistory:{ status:"confirmed", updatedBy:req.user._id, note:"Assigned by admin" } } },
      { new:true }
    )
      .populate("user",         "name email phone")
      .populate("testType",     "name preparation")
      .populate("testTypes",    "name preparation")
      .populate("phlebotomist", "name email phone");

    if (!booking) return res.status(404).json({ success:false, message:"Booking not found." });

    // SMS to phlebotomist (guarded)
    if (phlebo.phone) {
      await sendSMS(phlebo.phone,
        `HemoVisit: New assignment #${booking.bookingId}. Patient: ${booking.user?.name || "Unknown"}. Address: ${booking.address}`);
    }

    // Email to phlebotomist — only if we still have a valid patient
    if (booking.user) {
      sendPhlebotomistAssignment(booking, booking.user, booking.phlebotomist)
        .catch(err => console.error("📧 Assignment email error:", err.message));
    }

    if (req.io) {
      req.io.to(booking.bookingId).emit("status_update", { bookingId:booking.bookingId, status:"confirmed" });
    }

    res.json({ success:true, booking });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/rate
exports.rateBooking = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success:false, message:"Rating must be 1–5." });

    const booking = await Booking.findOne({ _id:req.params.id, user:req.user._id, status:"completed" });
    if (!booking) return res.status(404).json({ success:false, message:"Completed booking not found." });

    booking.userRating   = rating;
    booking.userFeedback = feedback;
    await booking.save();

    if (booking.phlebotomist) {
      const phlebo = await User.findById(booking.phlebotomist);
      if (phlebo) {
        const total         = (phlebo.totalRatings || 0) + 1;
        phlebo.rating       = (((phlebo.rating || 0) * (phlebo.totalRatings || 0)) + rating) / total;
        phlebo.totalRatings = total;
        await phlebo.save();
      }
    }

    res.json({ success:true, message:"Thank you for your feedback!" });
  } catch (err) { next(err); }
};