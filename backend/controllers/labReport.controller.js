const LabReport = require("../models/LabReport");
const Sample    = require("../models/Sample");
const Booking   = require("../models/Booking");
const { sendReportToPatient } = require("../utils/reportEmail");
const path = require("path");
const fs   = require("fs");

// Build the disk path of a stored report file from its URL
const diskPathFromUrl = (fileUrl) =>
  path.join(__dirname, "..", "uploads", "reports", path.basename(fileUrl || ""));

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

    let report = await LabReport.findOne({ sample: sampleId });

    // If a new file was uploaded, build its public URL and clean up the old one
    let fileUrl = report?.fileUrl;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get("host")}/uploads/reports/${req.file.filename}`;
      if (report?.fileUrl) {
        const oldPath = diskPathFromUrl(report.fileUrl);
        fs.existsSync(oldPath) && fs.unlink(oldPath, () => {});
      }
    }

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "Please upload a PDF report file." });
    }

    if (report) {
      report.fileUrl     = fileUrl;
      report.labComments = labComments || "";
      report.mlt         = req.user._id;
      await report.save();
    } else {
      report = await LabReport.create({
        sample:      sample._id,
        booking:     sample.booking,
        patient:     sample.patient,
        mlt:         req.user._id,
        fileUrl,
        labComments: labComments || "",
        status:      "draft",
      });
    }

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
 * Emails the stored PDF to the patient as an attachment.
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

    const tests    = report.sample?.testTypes?.map(t => t.name).join(", ") || "—";
    const filePath = diskPathFromUrl(report.fileUrl);

    await sendReportToPatient({
      to:          report.patient.email,
      patientName: report.patient.name,
      reportId:    report.reportId,
      sampleId:    report.sample?.sampleId,
      bookingId:   report.booking?.bookingId,
      tests,
      labComments: report.labComments,
      filePath,                 // attach the actual stored PDF
      fileUrl:     report.fileUrl,
    });

    report.status        = "completed";
    report.sentToPatient = true;
    report.sentAt        = new Date();
    await report.save();

    await Sample.findByIdAndUpdate(report.sample._id, { status: "completed" });
    await Booking.findByIdAndUpdate(report.booking._id, { status: "completed" });

    if (req.io && report.booking) {
      req.io.to(String(report.booking._id)).emit("report_ready", { reportId: report.reportId });
    }

    res.json({ success: true, message: "Report sent to patient.", report });
  } catch (err) {
    console.error("📧 Report send error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send report: " + err.message });
  }
};