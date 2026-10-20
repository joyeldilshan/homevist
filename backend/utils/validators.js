/**
 * UK phone and postcode validation + normalisation.
 *
 * Shared by the models (on save), the controllers (on input) and mirrored
 * in frontend/src/utils/validators.js for client-side feedback. The backend
 * copy is authoritative — never trust the client-side check alone.
 */

const locale = require("../config/locale");

// ── Phone ────────────────────────────────────────────────────────
// UK numbers in international form: +44 then 9 or 10 digits, first digit
// of the national number is 1-9 (the trunk 0 is dropped).
const UK_PHONE_INTL = /^\+44[1-9]\d{8,9}$/;
const UK_MOBILE_INTL = /^\+447[1-9]\d{8}$/;

/**
 * Accepts the shapes people actually type:
 *   07700 900123   +44 7700 900123   447700900123   (0)7700-900123
 * Returns "+447700900123", or null if it is not a plausible UK number.
 */
function normaliseUkPhone(input) {
  if (!input || typeof input !== "string") return null;

  // Drop the separators people type; keep digits and a leading +
  let s = input.trim().replace(/[\s().\-]/g, "");

  // Longest prefix first — "0044" also starts with "0".
  if (s.startsWith("+44")) {
    s = "+44" + s.slice(3).replace(/^0+/, "");
  } else if (s.startsWith("0044")) {
    s = "+44" + s.slice(4).replace(/^0+/, "");
  } else if (s.startsWith("44")) {
    s = "+44" + s.slice(2).replace(/^0+/, "");
  } else if (s.startsWith("0")) {
    s = "+44" + s.slice(1).replace(/^0+/, "");
  } else if (/^\d{10}$/.test(s)) {
    // 10 digits, no trunk code — assume a national number
    s = "+44" + s;
  }

  return UK_PHONE_INTL.test(s) ? s : null;
}

function isValidUkPhone(input) {
  return normaliseUkPhone(input) !== null;
}

function isUkMobile(input) {
  const n = normaliseUkPhone(input);
  return n !== null && UK_MOBILE_INTL.test(n);
}

const PHONE_MESSAGE =
  "Enter a UK phone number, for example 07700 900123 or +44 7700 900123.";

// ── Postcode ─────────────────────────────────────────────────────
// Covers the standard UK formats (A9 9AA, A99 9AA, A9A 9AA, AA9 9AA,
// AA99 9AA, AA9A 9AA). Deliberately not handling BFPO or overseas codes.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

/** "cf101aa" -> "CF10 1AA"; returns null if not a valid shape. */
function normaliseUkPostcode(input) {
  if (!input || typeof input !== "string") return null;
  const compact = input.toUpperCase().replace(/\s+/g, "");
  if (!UK_POSTCODE.test(compact)) return null;
  // Inward code is always the final three characters.
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function isValidUkPostcode(input) {
  return normaliseUkPostcode(input) !== null;
}

const POSTCODE_MESSAGE = "Enter a valid UK postcode, for example CF10 1AA.";

/** "CF10 1AA" -> "CF10" */
function outwardCode(postcode) {
  const n = normaliseUkPostcode(postcode);
  return n ? n.split(" ")[0] : null;
}

// ── Service area ─────────────────────────────────────────────────
/**
 * Is this postcode inside a covered area?
 * Matches on the leading letters of the outward code, so "CF" covers
 * CF10, CF24, CF64 and so on.
 */
function isInServiceArea(postcode, prefixes = locale.serviceAreaPrefixes) {
  const out = outwardCode(postcode);
  if (!out) return false;
  return prefixes.some((p) => out.toUpperCase().startsWith(p.toUpperCase()));
}

/** Patient-facing explanation when a postcode is outside the covered area. */
function outOfAreaMessage(postcode, prefixes = locale.serviceAreaPrefixes) {
  const out = outwardCode(postcode) || (postcode || "").toUpperCase();
  return (
    `Sorry — we do not currently visit ${out}. ` +
    `We cover postcodes starting ${prefixes.join(", ")} at the moment. ` +
    `Please contact us if you would like to be told when we reach your area.`
  );
}

// ── Email ────────────────────────────────────────────────────────
/*
 * Pragmatic check, not RFC 5322. The goal is to catch typos and obvious
 * rubbish ("abc", "a@b") at the point of entry. Full RFC validation
 * rejects addresses that really work and accepts ones that do not — the
 * only true test is sending mail.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function isValidEmail(input) {
  if (!input || typeof input !== "string") return false;
  const v = input.trim();
  return v.length <= 254 && EMAIL.test(v);
}

const EMAIL_MESSAGE = "Enter a valid email address, for example name@example.com.";

// ── Password ─────────────────────────────────────────────────────
/*
 * APPLIES TO NEW PASSWORDS ONLY — registration and password change.
 *
 * Deliberately NOT a mongoose schema validator: that would run on every
 * save and lock existing users out of editing their profile, and could
 * block sign-in flows for accounts created under the old 6-character
 * rule. Existing passwords keep working until the user changes one.
 */
const PASSWORD_MIN = 8;

function isValidPassword(input) {
  if (!input || typeof input !== "string") return false;
  if (input.length < PASSWORD_MIN) return false;
  if (!/[A-Za-z]/.test(input)) return false;
  if (!/[0-9]/.test(input)) return false;
  return true;
}

const PASSWORD_MESSAGE =
  `Choose a password of at least ${PASSWORD_MIN} characters that includes ` +
  "at least one letter and one number.";

module.exports = {
  isValidEmail,
  EMAIL_MESSAGE,
  isValidPassword,
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  normaliseUkPhone,
  isValidUkPhone,
  isUkMobile,
  PHONE_MESSAGE,
  normaliseUkPostcode,
  isValidUkPostcode,
  POSTCODE_MESSAGE,
  outwardCode,
  isInServiceArea,
  outOfAreaMessage,
};
