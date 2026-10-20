/**
 * Shared formatters for the UI.
 *
 * Every price, date and time rendered in the app goes through here.
 * Never hard-code a currency symbol or a date order in a component.
 */

import locale from "../config/locale";

const moneyFmt = new Intl.NumberFormat(locale.locale, {
  style:    "currency",
  currency: locale.currency,
});

const dateFmt = new Intl.DateTimeFormat(locale.locale, {
  timeZone: locale.timeZone,
  day:      "2-digit",
  month:    "2-digit",
  year:     "numeric",
});

const longDateFmt = new Intl.DateTimeFormat(locale.locale, {
  timeZone: locale.timeZone,
  weekday:  "long",
  day:      "numeric",
  month:    "long",
  year:     "numeric",
});

const timeFmt = new Intl.DateTimeFormat(locale.locale, {
  timeZone: locale.timeZone,
  hour:     "2-digit",
  minute:   "2-digit",
  hour12:   false,
});

const EMPTY = "—";

/** 25 -> "£25.00" */
export function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === "") return EMPTY;
  const n = Number(amount);
  if (Number.isNaN(n)) return EMPTY;
  return moneyFmt.format(n);
}

/** Compact money for stat tiles: 1234 -> "£1.2k" */
export function formatMoneyCompact(amount) {
  const n = Number(amount);
  if (!amount && amount !== 0) return EMPTY;
  if (Number.isNaN(n)) return EMPTY;
  if (Math.abs(n) >= 1000) {
    return moneyFmt.format(n / 1000).replace(/\.00$/, "") + "k";
  }
  return moneyFmt.format(n);
}

/** Date -> "09/10/2026" */
export function formatDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return dateFmt.format(d);
}

/** Date -> "Friday 9 October 2026" — for dashboard headers */
export function formatLongDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return EMPTY;
  return longDateFmt.format(d);
}

/** Date -> "14:30" (24-hour, Europe/London) */
export function formatTime(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return timeFmt.format(d);
}

/** Date -> "09/10/2026 14:30" */
export function formatDateTime(value) {
  if (!value) return EMPTY;
  const d = formatDate(value);
  return d === EMPTY ? EMPTY : `${d} ${formatTime(value)}`;
}

/**
 * Appointment slots are a Date plus a separate "HH:mm" string, already in
 * the clinic's local wall-clock terms — so the time is used as stored.
 */
export function formatAppointment(date, timeString) {
  const d = formatDate(date);
  if (!timeString) return d;
  return d === EMPTY ? timeString : `${d} ${timeString}`;
}

/** Joins structured address parts, falling back to the legacy string. */
export function formatAddress(addressParts, legacyAddress) {
  if (addressParts) {
    const joined = [
      addressParts.line1,
      addressParts.line2,
      addressParts.city,
      addressParts.county,
      addressParts.postcode,
    ].filter(Boolean).join(", ");
    if (joined) return joined;
  }
  return legacyAddress || EMPTY;
}

/**
 * A person's average rating, or null when nobody has rated them yet.
 *
 * New accounts are stored with rating 0 and totalRatings 0, and older
 * documents may have neither field. Neither case is a real score, so the
 * UI must say "No reviews yet" (or show nothing) — never a made-up 5.0.
 */
export function formatRating(person) {
  const n = Number(person?.totalRatings) || 0;
  const r = Number(person?.rating);
  if (n < 1 || !Number.isFinite(r) || r <= 0) return null;
  return r.toFixed(1);
}

/** "4.6 · 3 reviews", "5.0 · 1 review", or "No reviews yet". */
export function formatRatingSummary(person) {
  const r = formatRating(person);
  if (!r) return "No reviews yet";
  const n = Number(person.totalRatings);
  return `⭐ ${r} · ${n} ${n === 1 ? "review" : "reviews"}`;
}
