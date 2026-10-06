const mongoose     = require("mongoose");
const addressParts = require("./addressParts.schema");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },

    // Snapshotted from the Plan at signup so later admin edits don't
    // retroactively change an existing subscriber's terms.
    testTypes:       [{ type: mongoose.Schema.Types.ObjectId, ref: "TestType" }],
    visitsPerCycle:  { type: Number, required: true },
    cycleLengthDays: { type: Number, required: true },
    price:           { type: Number, required: true },

    address:         { type: String, required: true },   // legacy free-text
    addressParts,                                         // structured UK address, all optional
    appointmentTime: { type: String, default: "09:00" },

    startDate:     { type: Date, required: true },
    nextVisitDate: { type: Date, required: true },

    cycleStartDate:  { type: Date, required: true },
    cycleVisitsUsed: { type: Number, default: 0 },

    status: {
      type:    String,
      enum:    ["active", "paused", "cancelled"],
      default: "active",
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "paid"],
      default: "pending",
    },

    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
