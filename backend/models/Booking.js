const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type:    String,
    unique:  true,
    default: () => "BK" + Date.now().toString(36).toUpperCase() +
                   Math.random().toString(36).slice(2,5).toUpperCase(),
  },

  user:         { type: mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  phlebotomist: { type: mongoose.Schema.Types.ObjectId, ref:"User" },

  // ── Multiple tests ──────────────────────────────────────────
  testTypes: [{ type: mongoose.Schema.Types.ObjectId, ref:"TestType" }],
  // Keep single testType for backward compatibility
  testType:  { type: mongoose.Schema.Types.ObjectId, ref:"TestType" },

  appointmentDate: { type: Date,    required: true },
  appointmentTime: { type: String,  default: "09:00" },
  address:         { type: String,  required: true },
  coordinates:     { lat: Number,   lng: Number },
  isHomeVisit:     { type: Boolean, default: true },

  // Total = sum of all selected test prices
  amount:        { type: Number, default: 0 },
  paymentMethod: { type: String, enum:["cash","card","online"], default:"cash" },
  paymentStatus: { type: String, enum:["pending","paid"],       default:"pending" },

  status: {
    type:    String,
    enum:    ["pending","confirmed","sample_collected","processing","completed","cancelled","rejected"],
    default: "pending",
  },

  notes:        String,
  reportFile:   String,
  userRating:   { type: Number, min:1, max:5 },
  userFeedback: String,

  statusHistory: [{
    status:    String,
    note:      String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref:"User" },
    updatedAt: { type: Date, default: Date.now },
  }],

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);