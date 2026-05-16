const mongoose = require("mongoose");

const testTypeSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    price:       { type: Number, required: true },
    duration:    { type: String, default: "24h" },       // result turnaround time
    preparation: { type: String, default: "No special preparation required." },
    category: {
      type:    String,
      enum:    ["haematology", "biochemistry", "microbiology", "immunology", "urine", "other"],
      default: "haematology",
    },
    // Test parameters with reference ranges
    parameters: [
      {
        name:     { type: String },
        unit:     { type: String },
        refRange: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestType", testTypeSchema);
