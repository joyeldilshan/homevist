/**
 * Structured UK address, shared by User, Booking and Subscription.
 *
 * Backward compatible by design: every field is optional and this sits
 * ALONGSIDE the original free-text `address` string rather than replacing
 * it. Existing records that only have `address` keep working untouched;
 * new records can populate both.
 */

const { normaliseUkPostcode, POSTCODE_MESSAGE } = require("../utils/validators");

const shape = {
  line1:    { type: String, trim: true },
  line2:    { type: String, trim: true },
  city:     { type: String, trim: true },
  county:   { type: String, trim: true },   // optional in UK addresses
  postcode: { type: String, trim: true, uppercase: true },
};

/**
 * Uppercase and space the postcode on save ("cf101aa" -> "CF10 1AA").
 *
 * Only runs when the postcode was actually modified, so records created
 * before UK localisation can still be saved when another field changes.
 * Nothing already in the database is rewritten until it is edited.
 */
function attachPostcodeNormaliser(schema) {
  schema.pre("save", function (next) {
    if (!this.isModified("addressParts.postcode")) return next();
    const raw = this.addressParts && this.addressParts.postcode;
    if (!raw) return next();
    const normalised = normaliseUkPostcode(raw);
    if (!normalised) return next(new Error(POSTCODE_MESSAGE));
    this.addressParts.postcode = normalised;
    next();
  });
}

module.exports = { shape, attachPostcodeNormaliser };
