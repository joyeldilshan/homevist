/**
 * UK phone and postcode validation for client-side feedback.
 *
 * MIRRORS backend/utils/validators.js. This copy exists only to give the
 * user fast feedback in the form — the backend check is authoritative and
 * is never skipped.
 */

import locale from "../config/locale";

// ── Phone ────────────────────────────────────────────────────────
const UK_PHONE_INTL  = /^\+44[1-9]\d{8,9}$/;
const UK_MOBILE_INTL = /^\+447[1-9]\d{8}$/;

export function normaliseUkPhone(input) {
  if (!input || typeof input !== "string") return null;

  let s = input.trim().replace(/[\s().\-]/g, "");

  // Longest prefix first — "0044" also starts with "0".
  if (s.startsWith("+44"))       s = "+44" + s.slice(3).replace(/^0+/, "");
  else if (s.startsWith("0044")) s = "+44" + s.slice(4).replace(/^0+/, "");
  else if (s.startsWith("44"))   s = "+44" + s.slice(2).replace(/^0+/, "");
  else if (s.startsWith("0"))    s = "+44" + s.slice(1).replace(/^0+/, "");
  else if (/^\d{10}$/.test(s))   s = "+44" + s;

  return UK_PHONE_INTL.test(s) ? s : null;
}

export const isValidUkPhone = (v) => normaliseUkPhone(v) !== null;
export const isUkMobile = (v) => {
  const n = normaliseUkPhone(v);
  return n !== null && UK_MOBILE_INTL.test(n);
};

export const PHONE_MESSAGE =
  `Enter a UK phone number, for example ${locale.examplePhone} or +44 7700 900123.`;

// ── Postcode ─────────────────────────────────────────────────────
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export function normaliseUkPostcode(input) {
  if (!input || typeof input !== "string") return null;
  const compact = input.toUpperCase().replace(/\s+/g, "");
  if (!UK_POSTCODE.test(compact)) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export const isValidUkPostcode = (v) => normaliseUkPostcode(v) !== null;

export const POSTCODE_MESSAGE =
  `Enter a valid UK postcode, for example ${locale.examplePostcode}.`;

export function outwardCode(postcode) {
  const n = normaliseUkPostcode(postcode);
  return n ? n.split(" ")[0] : null;
}

// ── Service area ─────────────────────────────────────────────────
export function isInServiceArea(postcode, prefixes = locale.serviceAreaPrefixes) {
  const out = outwardCode(postcode);
  if (!out) return false;
  return prefixes.some((p) => out.toUpperCase().startsWith(p.toUpperCase()));
}

export function outOfAreaMessage(postcode, prefixes = locale.serviceAreaPrefixes) {
  const out = outwardCode(postcode) || (postcode || "").toUpperCase();
  return (
    `Sorry — we do not currently visit ${out}. ` +
    `We cover postcodes starting ${prefixes.join(", ")} at the moment. ` +
    `Please contact us if you would like to be told when we reach your area.`
  );
}

// ── Password ─────────────────────────────────────────────────────
// MIRRORS backend/utils/validators.js isValidPassword. New passwords
// only (registration, new accounts); sign-in never checks it, so older
// accounts with shorter passwords still sign in.
export const PASSWORD_MIN = 8;
export const isValidPassword = (v) =>
  typeof v === "string" && v.length >= PASSWORD_MIN && /[A-Za-z]/.test(v) && /[0-9]/.test(v);
export const PASSWORD_MESSAGE =
  `Choose a password of at least ${PASSWORD_MIN} characters that includes at least one letter and one number.`;
