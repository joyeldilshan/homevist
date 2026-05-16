const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // Auto-generated readable booking ID e.g. BK123456
    bookingId: {
      type:    String,
      unique:  true,
      default: () => "BK" + Date.now().toString().slice(-6),
    },

    // Parties
    user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phlebotomist: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // What test
    testType: { type: mongoose.Schema.Types.ObjectId, ref: "TestType", required: true },

    // When & where
    appointmentDate: { type: Date,   required: true },
    appointmentTime: { type: String, required: true },  // "09:00"
    address:         { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isHomeVisit: { type: Boolean, default: true },

    // Status lifecycle:
    // pending → confirmed → sample_collected → processing → completed
    // OR: cancelled / rejected
    status: {
      type:    String,
      enum:    ["pending","confirmed","sample_collected","processing","completed","cancelled","rejected"],
      default: "pending",
    },

    // Full audit trail of status changes
    statusHistory: [
      {
        status:    { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note:      { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Payment
    amount:        { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending","paid","refunded"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash","card","online"],       default: "cash" },

    // PDF Report
    reportFile:    { type: String },   // file path or URL
    reportReadyAt: { type: Date },

    // Barcode & QR (for lab staff scanning)
    barcodeValue: { type: String },
    qrPayload:    { type: String },

    // Rating & feedback from patient
    userRating:   { type: Number, min: 1, max: 5 },
    userFeedback: { type: String },

    // Any extra notes
    notes: { type: String },
  },
  { timestamps: true }
);

// Auto-generate barcode value before first save
bookingSchema.pre("save", function (next) {
  if (!this.barcodeValue) {
    this.barcodeValue = `HV-${this.bookingId}-${Date.now().toString().slice(-4)}`;
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
