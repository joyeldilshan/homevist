const LabReport = require("../models/LabReport");
const Sample    = require("../models/Sample");
const Booking   = require("../models/Booking");
const { sendReportToPatient } = require("../utils/reportEmail");
const mongoose = require("mongoose");
const fs   = require("fs");
const logger = require("../utils/logger");
const { saveReportPdf, removeReportFile, storedNameOf, pathFor, downloadPath } = require("../utils/reportFiles");

// One answer for "no such report" and "not yours": a caller cannot tell
// which, so IDs cannot be probed for existence.
const reportNotFound = (res) => res.status(404).json({ success: false, message: "Report not found." });

/**
 * Who may download a report file:
 *   - the patient it belongs to, once it has been sent to them (the same
 *     rule as GET /api/reports for patients);
 *   - the lab technician who uploaded it or is handling its sample;
 *   - an admin.
 */
function canDownload(user, report) {
  const uid = String(user._id);
  if (user.role === "admin") return true;
  if (user.role === "user" || user.role === "patient") return String(report.patient) === uid && report.sentToPatient === true;
  if (user.role === "mlt") return String(report.mlt) === uid || String(report.sample?.mlt) === uid;
  return false;
}

/**
 * POST /api/reports
 * MLT uploads a report PDF (multipart/form-data, field name "report").
 */
exports.createReport = async (req, res, next) => {
  try {
    const { sampleId, labComments } = req.body;
    if (!sampleId) {
      return res.status(400).json({ success: false, message: "sampleId is required." });
    }

    const sample = await Sample.findById(sampleId);
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found." });
    }
    // Only while the lab is processing it. A report could be uploaded at
    // any stage (before the sample reached the lab, or replacing one the
    // patient had already been sent).
    if (sample.status !== "processing") {
      return res.status(409).json({ success: false, message: "A report can be uploaded only while the sample is processing." });
    }

    let report = await LabReport.findOne({ sample: sampleId });
    if (!req.file && !report) {
      return res.status(400).json({ success: false, message: "Please upload a PDF report file." });
    }

    // Checked by content (it must start with %PDF-) and saved under a
    // server-generated random name; nothing from the uploader reaches the path.
    let fileName;
    if (req.file) {
      try { fileName = await saveReportPdf(req.file.buffer); }
      catch (e) { return res.status(e.statusCode || 400).json({ success: false, message: e.message }); }
    }
    const replaced = fileName && report ? storedNameOf(report) : null;

    if (!report) {
      report = new LabReport({
        sample:      sample._id,
        booking:     sample.booking,
        patient:     sample.patient,
        status:      "draft",
      });
    }
    if (fileName) report.fileName = fileName;
    report.fileUrl     = downloadPath(report._id);
    report.labComments = labComments || "";
    report.mlt         = req.user._id;
    await report.save();

    // Only after the new file is safely recorded.
    if (replaced && replaced !== fileName) await removeReportFile(replaced);

    res.status(201).json({ success: true, report });
  } catch (err) { next(err); }
};

/**
 * GET /api/reports
 */
exports.getReports = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "patient" || req.user.role === "user") {
      filter.patient = req.user._id;
      filter.sentToPatient = true;
    }

    const reports = await LabReport.find(filter)
      .populate("patient", "name email")
      .populate("mlt",     "name")
      .populate({ path: "sample", populate: { path: "testTypes", select: "name code" } })
      .populate("booking", "bookingId")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, reports });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/reports/:id/send
 * Emails the patient that their report is ready, with a link to the
 * signed-in reports page. The PDF is not attached.
 */
exports.sendReport = async (req, res, next) => {
  try {
    const report = await LabReport.findById(req.params.id)
      .populate("patient", "name email")
      .populate("booking", "bookingId")
      .populate({ path: "sample", populate: { path: "testTypes", select: "name" } });

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }
    if (!report.patient?.email) {
      return res.status(400).json({ success: false, message: "Patient has no email on file." });
    }

    // The email promises a download, so the file must be there (it can be
    // lost, e.g. on a host whose disk is wiped on deploy).
    const filePath = pathFor(storedNameOf(report));
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(409).json({ success: false, message: "The report file is missing. Upload the PDF again, then send." });
    }

    // A notification with a link to the signed-in reports page; the PDF is
    // not attached (it is downloaded through the authenticated route).
    await sendReportToPatient({
      to:          report.patient.email,
      patientName: report.patient.name,
      reportId:    report.reportId,
      bookingId:   report.booking?.bookingId,
    });

    report.status        = "completed";
    report.sentToPatient = true;
    report.sentAt        = new Date();
    await report.save();

    await Sample.findByIdAndUpdate(report.sample._id, { status: "completed" });
    await Booking.findByIdAndUpdate(report.booking._id, { status: "completed" });

    if (req.io && report.booking) {
      req.io.to(String(report.booking._id)).emit("report_ready", { reportId: report.reportId });
      // The patient's page listens on the bookingId room (see
      // sample.controller.js emitBookingStatus); without this it never
      // learned that the report was ready.
      if (report.booking.bookingId) {
        req.io.to(report.booking.bookingId).emit("status_update", { bookingId: report.booking.bookingId, status: "completed" });
      }
    }

    res.json({ success: true, message: "Report sent to patient.", report });
  } catch (err) {
    // A malformed report ID is a 404 like everywhere else (error handler).
    if (err.name === "CastError") return next(err);
    // Logged in full; the client gets a plain message (mail errors can
    // carry server names, addresses and credentials hints).
    logger.error("📧 Report send error:", err.message);
    res.status(500).json({ success: false, message: "The report could not be sent. Please try again." });
  }
};

/**
 * GET /api/reports/:id/file
 * Streams the report PDF to someone allowed to see it (canDownload).
 * Replaces the public /uploads static route.
 */
exports.downloadReport = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return reportNotFound(res);
    const report = await LabReport.findById(req.params.id).populate("sample", "mlt");
    if (!report || !canDownload(req.user, report)) return reportNotFound(res);

    const full = pathFor(storedNameOf(report));
    if (!full || !fs.existsSync(full)) {
      return res.status(404).json({ success: false, message: "The report file is missing. Ask the laboratory to upload it again." });
    }
    res.set({
      "Content-Type":           "application/pdf",
      "Content-Disposition":    `attachment; filename="Report_${String(report.reportId).replace(/[^A-Za-z0-9_-]/g, "")}.pdf"`,
      "Cache-Control":          "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(full).on("error", next).pipe(res);
  } catch (err) { next(err); }
};

exports._canDownload = canDownload;   // for tests
