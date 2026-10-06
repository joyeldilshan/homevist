/**
 * Structured UK address, shared by User, Booking and Subscription.
 *
 * Backward compatible by design: every field is optional and this sits
 * ALONGSIDE the original free-text `address` string rather than replacing
 * it. Existing records that only have `address` keep working untouched;
 * new records can populate both.
 */
module.exports = {
  line1:    { type: String, trim: true },
  line2:    { type: String, trim: true },
  city:     { type: String, trim: true },
  county:   { type: String, trim: true },   // optional in UK addresses
  postcode: { type: String, trim: true, uppercase: true },
};
