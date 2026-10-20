/**
 * Shared formatters. Every currency, date and time string in the backend
 * goes through here so there is exactly one place that knows the locale.
 *
 * Driven entirely by config/locale.js — never hard-code a currency symbol
 * or a date order anywhere else.
 */

const locale = require("../config/locale");

// Intl formatters are expensive to construct, so build them once.
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

const timeFmt = new Intl.DateTimeFormat(locale.locale, {
  timeZone: locale.timeZone,
  hour:     "2-digit",
  minute:   "2-digit",
  hour12:   false,
});

const EMPTY = "—";

/** 25 -> "£25.00" */
function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === "") return EMPTY;
  const n = Number(amount);
  if (Number.isNaN(n)) return EMPTY;
  return moneyFmt.format(n);
}

/** Date -> "09/10/2026" (Europe/London) */
function formatDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return dateFmt.format(d);
}

/** Date -> "14:30" (24-hour, Europe/London) */
function formatTime(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return timeFmt.format(d);
}

/** Date -> "09/10/2026 14:30" */
function formatDateTime(value) {
  if (!value) return EMPTY;
  const d = formatDate(value);
  return d === EMPTY ? EMPTY : `${d} ${formatTime(value)}`;
}

/**
 * Appointment slots are stored as a Date plus a separate "HH:mm" string,
 * so the time is already in the clinic's local wall-clock terms.
 */
function formatAppointment(date, timeString) {
  const d = formatDate(date);
  if (!timeString) return d;
  return d === EMPTY ? timeString : `${d} ${timeString}`;
}

module.exports = {
  formatMoney,
  formatDate,
  formatTime,
  formatDateTime,
  formatAppointment,
};
