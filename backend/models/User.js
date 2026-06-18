const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, "Name is required"], trim: true },
    email:    { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    phone:    { type: String, required: [true, "Phone is required"], trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    role:     { type: String, enum: ["user", "phlebotomist", "admin","mlt"], default: "user" },

    // Profile
    age:     { type: Number },
    gender:  { type: String, enum: ["male", "female", "other"] },
    address: { type: String },
    avatar:  { type: String },

    // Phlebotomist-specific fields
    isAvailable:   { type: Boolean, default: false },
    serviceArea:   { type: String },
    licenseNumber: { type: String },
    rating:        { type: Number, default: 0 },
    totalRatings:  { type: Number, default: 0 },

    // Account
    isActive:   { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // GPS location (for phlebotomists)
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

// Geo index for location-based queries
userSchema.index({ location: "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
