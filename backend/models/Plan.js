const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String },
    testTypes:   [{ type: mongoose.Schema.Types.ObjectId, ref: "TestType", required: true }],
    visitsPerCycle:  { type: Number, required: true, min: 1 },
    cycleLengthDays: { type: Number, required: true, min: 1 },
    price:    { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
