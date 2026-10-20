const Sample  = require("../models/Sample");
const Booking = require("../models/Booking");
const logger = require("../utils/logger");

const SAMPLE_STATUSES = Sample.schema.path("status").enumValues;

/*
 * Patients follow a booking in real time by joining a socket room named
 * after its bookingId (frontend hooks/useSocket.js, "join_booking") and
 * listening for "status_update". Every step that changes a booking's
 * status must emit there, or the patient's page never hears about it.
 */
const emitBookingStatus = (io, booking, status) => {
  if (io && booking?.bookingId) {
    io.to(booking.bookingId).emit("status_update", { bookingId: booking.bookingId, status });
  }
};

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

    // Only the phlebotomist assigned to the booking (populated object OR
    // raw id). An unassigned booking used to be open to any phlebotomist,
    // who then became its sample's collector. Someone else's booking is
    // "not found", as everywhere else.
    const assignedId = booking.phlebotomist?._id || booking.phlebotomist;
    if (!assignedId || String(assignedId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    // Only a visit that is under way: not pending, cancelled, rejected or
    // already with the lab beyond collection.
    if (!["confirmed", "sample_collected"].includes(booking.status)) {
      return res.status(409).json({ success: false, message: `A ${booking.status.replace("_", " ")} booking cannot be sent to the lab.` });
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
    emitBookingStatus(req.io, booking, "sample_collected");

    if (req.io) {
      req.io.to("mlt_room").emit("new_sample", {
        sampleId: sample.sampleId,
        patient:  booking.user?.name,
      });
    }

    logger.debug(`🧫 Sample ${sample.sampleId} created for booking ${booking.bookingId}`);
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
    if (req.query.status !== undefined) {
      // A plain status name only (status[$ne]=x would become an operator).
      if (typeof req.query.status !== "string" || !SAMPLE_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Unknown status filter." });
      }
      filter.status = req.query.status;
    }

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

// The states each lab step may start from. Forward only; "completed" is
// not set here but by sending the report (POST /reports/:id/send), so a
// sample cannot be marked done without one.
const SAMPLE_FROM = {
  received:   ["sent_to_lab", "collected"],
  processing: ["received"],
};

/**
 * PATCH /api/samples/:id/status
 * MLT moves a sample: received -> processing. It used to accept any of
 * received/processing/completed from any state, so a sample could go
 * backwards or skip straight to completed with no report.
 */
exports.updateSampleStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!Object.hasOwn(SAMPLE_FROM, String(status))) {
      return res.status(400).json({ success: false, message: "Invalid lab status." });
    }

    const sample = await Sample.findById(req.params.id).populate("patient", "name email");
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found." });
    }
    if (!SAMPLE_FROM[status].includes(sample.status)) {
      return res.status(409).json({ success: false, message: `A sample that is ${sample.status.replace(/_/g, " ")} cannot be marked ${status}.` });
    }

    sample.status = status;
    sample.mlt    = req.user._id;
    sample.movements.push({ status, note: note || "", by: req.user._id });
    await sample.save();

    if (req.io && sample.booking) {
      req.io.to(String(sample.booking)).emit("sample_update", { sampleId: sample.sampleId, status });
    }

    // The booking's own "processing" stage was never reached: lab steps
    // only moved the sample, so the patient's tracker jumped from
    // "sample collected" straight to "report ready". Starting processing
    // now moves the booking too (only forward, from sample_collected).
    if (status === "processing" && sample.booking) {
      const booking = await Booking.findById(sample.booking);
      if (booking && booking.status === "sample_collected") {
        booking.status = "processing";
        booking.statusHistory.push({ status: "processing", updatedBy: req.user._id, note: "Laboratory started processing" });
        await booking.save();
        emitBookingStatus(req.io, booking, "processing");
      }
    }

    res.json({ success: true, sample });
  } catch (err) { next(err); }
};