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

  // fileName: the server-generated name on disk (utils/reportFiles.js).
  // Never sent to clients. Records from before it existed have only
  // fileUrl, which then holds the old public URL; reportFiles.storedNameOf
  // reads the name from it.
  fileName:    { type: String },
  // What clients see is always the authenticated download route (set in
  // toJSON below), never a path to the file itself.
  fileUrl:     { type: String, required: true },
  labComments: { type: String, default: "" },

  status:        { type: String, enum: ["draft", "completed"], default: "draft" },
  sentToPatient: { type: Boolean, default: false },
  sentAt:        { type: Date },

}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      ret.fileUrl = `/api/reports/${ret._id}/file`;
      delete ret.fileName;
      return ret;
    },
  },
});

module.exports = mongoose.model("LabReport", labReportSchema);