const mongoose     = require("mongoose");
const bcrypt       = require("bcryptjs");
const { shape: addressParts, attachPostcodeNormaliser } = require("./addressParts.schema");
const { normaliseUkPhone, PHONE_MESSAGE } = require("../utils/validators");

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
    address: { type: String },        // legacy free-text, still populated
    addressParts,                     // structured UK address, all optional
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

    /*
     * Record of the patient agreeing to the privacy policy at registration.
     * Optional so accounts created before this existed still load and save;
     * an absent record means consent was never captured, not that it was
     * refused. Storing the version lets you tell which text they agreed to.
     */
    consent: {
      privacyPolicyAccepted: { type: Boolean },
      acceptedAt:            { type: Date },
      policyVersion:         { type: String },
    },

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

/**
 * Normalise a UK phone number to +44 form on save.
 *
 * Deliberately only runs when `phone` was actually modified, so a record
 * created before UK localisation can still be saved when some other field
 * changes. Existing stored numbers are left exactly as they are until
 * someone edits them.
 */
userSchema.pre("save", function (next) {
  if (!this.isModified("phone") || !this.phone) return next();
  const normalised = normaliseUkPhone(this.phone);
  if (!normalised) return next(new Error(PHONE_MESSAGE));
  this.phone = normalised;
  next();
});

// Same rule for the structured postcode: uppercase and spaced on save.
attachPostcodeNormaliser(userSchema);

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
