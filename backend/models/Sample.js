const mongoose = require("mongoose");

/**
 * Sample = a physical blood sample moving through the lab pipeline.
 * Created when a phlebotomist marks a booking as "Sent to Lab".
 * The MLT then moves it: received -> processing -> completed.
 */
const sampleSchema = new mongoose.Schema({
  sampleId: {
    type:    String,
    unique:  true,
    default: () => "SMP" + Date.now().toString(36).toUpperCase() +
                   Math.random().toString(36).slice(2, 4).toUpperCase(),
  },

  booking:      { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  phlebotomist: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mlt:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  testTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "TestType" }],

  status: {
    type: String,
    enum: ["collected", "sent_to_lab", "received", "processing", "completed"],
    default: "sent_to_lab",
  },

  // Audit trail — every movement recorded
  movements: [{
    status: String,
    note:   String,
    by:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at:     { type: Date, default: Date.now },
  }],

}, { timestamps: true });

module.exports = mongoose.model("Sample", sampleSchema);