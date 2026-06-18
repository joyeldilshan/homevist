// ============================================================================
//  SAVE THIS FILE TO:   backend/models/LabReport.js
//  THIS IS THE DATABASE MODEL (mongoose). It must start with "const mongoose".
// ============================================================================
const mongoose = require("mongoose");

const labReportSchema = new mongoose.Schema({
  reportId: {
    type:    String,
    unique:  true,
    default: () => "RPT" + Date.now().toString(36).toUpperCase() +
                   Math.random().toString(36).slice(2, 4).toUpperCase(),
  },

  sample:  { type: mongoose.Schema.Types.ObjectId, ref: "Sample",  required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  mlt:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  fileUrl:     { type: String, required: true },
  labComments: { type: String, default: "" },

  status:        { type: String, enum: ["draft", "completed"], default: "draft" },
  sentToPatient: { type: Boolean, default: false },
  sentAt:        { type: Date },

}, { timestamps: true });

module.exports = mongoose.model("LabReport", labReportSchema);