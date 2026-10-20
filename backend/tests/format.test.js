const test   = require("node:test");
const assert = require("node:assert/strict");

const { formatMoney, formatDate, formatTime, formatDateTime, formatAppointment } =
  require("../utils/format");
const locale = require("../config/locale");

test("config is set to the UK", () => {
  assert.equal(locale.currency, "GBP");
  assert.equal(locale.locale,   "en-GB");
  assert.equal(locale.timeZone, "Europe/London");
  assert.equal(locale.country,  "GB");
});

test("formats money as GBP", () => {
  assert.equal(formatMoney(25),      "£25.00");
  assert.equal(formatMoney(25.5),    "£25.50");
  assert.equal(formatMoney(0),       "£0.00");
  assert.equal(formatMoney(1234.56), "£1,234.56");
});

test("money falls back for missing or bad values", () => {
  for (const bad of [null, undefined, "", "abc", NaN]) {
    assert.equal(formatMoney(bad), "—");
  }
});

test("never emits the old rupee prefix", () => {
  assert.doesNotMatch(formatMoney(2500), /Rs|LKR/);
});

test("formats dates as DD/MM/YYYY", () => {
  assert.equal(formatDate("2026-10-09T12:00:00Z"), "09/10/2026");
  assert.equal(formatDate("2026-01-02T12:00:00Z"), "02/01/2026");
});

test("formats time as 24-hour", () => {
  // 14:30 UTC in January = 14:30 London (GMT)
  assert.equal(formatTime("2026-01-15T14:30:00Z"), "14:30");
});

test("applies Europe/London summer time", () => {
  // 14:30 UTC in July = 15:30 London (BST, UTC+1)
  assert.equal(formatTime("2026-07-15T14:30:00Z"), "15:30");
});

test("formatDateTime combines both", () => {
  assert.equal(formatDateTime("2026-01-15T14:30:00Z"), "15/01/2026 14:30");
});

test("date helpers fall back for missing values", () => {
  for (const bad of [null, undefined, "", "not a date"]) {
    assert.equal(formatDate(bad), "—");
    assert.equal(formatTime(bad), "—");
    assert.equal(formatDateTime(bad), "—");
  }
});

test("formatAppointment keeps the stored wall-clock slot", () => {
  assert.equal(formatAppointment("2026-10-09T00:00:00Z", "09:00"), "09/10/2026 09:00");
  assert.equal(formatAppointment("2026-10-09T00:00:00Z", null), "09/10/2026");
});
