/**
 * Single source of truth for locale, currency and service-area settings.
 *
 * Everything country-specific lives here so the app can be re-targeted
 * without hunting through controllers and components.
 */

module.exports = {
  // ── Region ────────────────────────────────────────────────────
  country:        "GB",
  locale:         "en-GB",
  currency:       "GBP",
  currencySymbol: "£",
  timeZone:       "Europe/London",
  dateFormat:     "DD/MM/YYYY",
  phoneCountryCode: "+44",

  /**
   * Bookings are only served to addresses whose postcode starts with one
   * of these outward-code prefixes. "CF" covers Cardiff and the immediate
   * South Wales area. Add more prefixes as the service area grows.
   */
  serviceAreaPrefixes: ["CF"],

  /*
   * Version recorded against a patient's privacy-policy consent.
   * Bump this whenever the policy text changes so you can tell which
   * version each patient actually agreed to.
   */
  policyVersion: "1.0-draft",

  /*
   * Organisation details printed on reports and emails.
   *
   * The originals were invented. Do not print a fabricated address or
   * phone number on a patient report — fill these in with real details,
   * or leave the placeholder visible so it is obvious they are missing.
   */
  organisation: {
    name:        "Home Visit",
    cityCountry: "Cardiff, Wales",
    addressLine: "[PLACEHOLDER - add registered address]",
    phone:       "[PLACEHOLDER - add contact number]",
    website:     "[PLACEHOLDER - add website]",
    email:       "noreply@homevisit.co.uk",
  },

  // ── Test prices ───────────────────────────────────────────────
  /*
   * =====================================================================
   *   PLACEHOLDER PRICES - THESE ARE NOT REAL COMMERCIAL PRICES
   * =====================================================================
   *   Every value below is an invented stand-in so the app has something
   *   to display. They are not based on any market rate.
   *
   *   Replace each amount with your real GBP price, then set
   *   pricesArePlaceholder to false.
   *
   *   Keyed by the TestType `code` in utils/seed.js.
   * =====================================================================
   */
  pricesArePlaceholder: true,

  testPrices: {
    CBC:     25.00,   // Complete Blood Count
    FBS:     12.00,   // Blood Glucose (Fasting)
    LIPID:   30.00,   // Lipid Profile
    THYROID: 45.00,   // Thyroid Profile
    LFT:     28.00,   // Liver Function Test
    HBA1C:   22.00,   // HbA1c
  },
};
