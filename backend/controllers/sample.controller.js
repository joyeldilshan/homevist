const Sample  = require("../models/Sample");
const Booking = require("../models/Booking");

/**
 * POST /api/samples
 * Phlebotomist collects a sample and sends it to the lab.
 * Made bulletproof:
 *  - works whether booking.phlebotomist is populated or a raw ObjectId
 *  - idempotent: if a sample already exists, returns it (no error)
 *  - handles both single-test and multi-test bookings
 */
exports.sendToLab = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required." });
    }

    const booking = await Booking.findById(bookingId).populate("testTypes testType");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Compare assigned phlebotomist (handle populated object OR raw id).
    // If the booking has no phlebotomist yet, allow any phlebotomist/admin.
    const assignedId = booking.phlebotomist?._id || booking.phlebotomist;
    if (assignedId && String(assignedId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "This booking is not assigned to you." });
    }

    // If a sample already exists for this booking, just return it (no crash, no dup)
    let sample = await Sample.findOne({ booking: bookingId });
    if (sample) {
      // Make sure the booking reflects it
      if (booking.status === "confirmed") {
        booking.status = "sample_collected";
        await booking.save();
      }
      return res.status(200).json({ success: true, sample, message: "Sample already at lab." });
    }

    // Build the list of test ids (works for multi-test and single-test)
    const tests = booking.testTypes?.length
      ? booking.testTypes.map(t => t._id || t)
      : (booking.testType ? [booking.testType._id || booking.testType] : []);

    sample = await Sample.create({
      booking:      booking._id,
      patient:      booking.user,
      phlebotomist: req.user._id,
      testTypes:    tests,
      status:       "sent_to_lab",
      movements: [{
        status: "sent_to_lab",
        note:   "Sample collected and sent to lab by phlebotomist",
        by:     req.user._id,
      }],
    });

    booking.status = "sample_collected";
    await booking.save();

    if (req.io) {
      req.io.to("mlt_room").emit("new_sample", {
        sampleId: sample.sampleId,
        patient:  booking.user?.name,
      });
    }

    console.log(`🧫 Sample ${sample.sampleId} created for booking ${booking.bookingId}`);
    res.status(201).json({ success: true, sample });
  } catch (err) { next(err); }
};

/**
 * GET /api/samples
 * MLT/admin see all samples; phlebotomist sees only their own.
 */
exports.getSamples = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "phlebotomist") filter.phlebotomist = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const samples = await Sample.find(filter)
      .populate("patient",      "name email phone")
      .populate("phlebotomist", "name")
      .populate("mlt",          "name")
      .populate("testTypes",    "name code")
      .populate("booking",      "bookingId appointmentDate address")
      .populate("movements.by", "name role")
      .sort({ createdAt: -1 })
      .lean();   // plain objects — dramatically faster than full Mongoose docs

    res.json({ success: true, count: samples.length, samples });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/samples/:id/status
 * MLT moves a sample: received -> processing -> completed.
 */
exports.updateSampleStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const allowed = ["received", "processing", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid lab status." });
    }

    const sample = await Sample.findById(req.params.id).populate("patient", "name email");
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found." });
    }

    sample.status = status;
    sample.mlt    = req.user._id;
    sample.movements.push({ status, note: note || "", by: req.user._id });
    await sample.save();

    if (req.io && sample.booking) {
      req.io.to(String(sample.booking)).emit("sample_update", { sampleId: sample.sampleId, status });
    }

    res.json({ success: true, sample });
  } catch (err) { next(err); }
};