/**
 * Locale settings for the frontend.
 *
 * MIRRORS backend/config/locale.js. The two are separate builds so they
 * cannot share a module — if you change one, change the other. The backend
 * copy is authoritative for anything money- or validation-related.
 */

const locale = {
  country:          "GB",
  locale:           "en-GB",
  currency:         "GBP",
  timeZone:         "Europe/London",
  phoneCountryCode: "+44",

  // Postcode prefixes the service currently covers.
  serviceAreaPrefixes: ["CF"],

  // Example values used in form placeholders.
  examplePhone:    "07700 900123",
  examplePostcode: "CF10 1AA",
};

export default locale;
