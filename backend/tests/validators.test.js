const test   = require("node:test");
const assert = require("node:assert/strict");

const {
  normaliseUkPhone, isValidUkPhone, isUkMobile,
  normaliseUkPostcode, isValidUkPostcode,
  outwardCode, isInServiceArea, outOfAreaMessage,
} = require("../utils/validators");

// ── Phone ────────────────────────────────────────────────────────
test("normalises UK mobile numbers to +44", () => {
  const expected = "+447700900123";
  for (const input of [
    "07700900123",
    "07700 900123",
    "+447700900123",
    "+44 7700 900123",
    "447700900123",
    "00447700900123",
    "(07700) 900-123",
  ]) {
    assert.equal(normaliseUkPhone(input), expected, `failed for ${input}`);
  }
});

test("normalises UK landline numbers", () => {
  assert.equal(normaliseUkPhone("02920 180123"), "+442920180123");
  assert.equal(normaliseUkPhone("+442920180123"), "+442920180123");
  assert.equal(normaliseUkPhone("01632 960123"), "+441632960123");
});

test("rejects numbers that are not plausible UK numbers", () => {
  for (const bad of [
    "", null, undefined, "123", "abc", "07700",
    "+94000000000",            // the old Sri Lankan format
    "+1 555 0100",
    "077009001234567",
  ]) {
    assert.equal(normaliseUkPhone(bad), null, `should reject ${bad}`);
    assert.equal(isValidUkPhone(bad), false);
  }
});

test("distinguishes mobile from landline", () => {
  assert.equal(isUkMobile("07700900123"), true);
  assert.equal(isUkMobile("02920180123"), false);
});

// ── Postcode ─────────────────────────────────────────────────────
test("normalises postcode case and spacing", () => {
  assert.equal(normaliseUkPostcode("cf101aa"),   "CF10 1AA");
  assert.equal(normaliseUkPostcode("CF10 1AA"),  "CF10 1AA");
  assert.equal(normaliseUkPostcode(" cf10  1aa "), "CF10 1AA");
  assert.equal(normaliseUkPostcode("sw1a1aa"),   "SW1A 1AA");
  assert.equal(normaliseUkPostcode("m11ae"),     "M1 1AE");
  assert.equal(normaliseUkPostcode("b338th"),    "B33 8TH");
});

test("rejects invalid postcodes", () => {
  for (const bad of ["", null, "12345", "CF10", "ZZZZ 999", "CF10 1A"]) {
    assert.equal(normaliseUkPostcode(bad), null, `should reject ${bad}`);
    assert.equal(isValidUkPostcode(bad), false);
  }
});

test("extracts the outward code", () => {
  assert.equal(outwardCode("cf101aa"), "CF10");
  assert.equal(outwardCode("SW1A 1AA"), "SW1A");
  assert.equal(outwardCode("nonsense"), null);
});

// ── Service area ─────────────────────────────────────────────────
test("accepts postcodes inside the service area", () => {
  assert.equal(isInServiceArea("CF10 1AA"), true);
  assert.equal(isInServiceArea("cf24 3re"), true);
  assert.equal(isInServiceArea("CF64 1AA"), true);
});

test("rejects postcodes outside the service area", () => {
  assert.equal(isInServiceArea("SW1A 1AA"), false);
  assert.equal(isInServiceArea("M1 1AE"), false);
  assert.equal(isInServiceArea("not a postcode"), false);
});

test("honours a custom prefix list", () => {
  assert.equal(isInServiceArea("SW1A 1AA", ["SW", "CF"]), true);
  assert.equal(isInServiceArea("CF10 1AA", ["SW"]), false);
});

test("out-of-area message names the postcode and the covered areas", () => {
  const msg = outOfAreaMessage("M1 1AE");
  assert.match(msg, /M1/);
  assert.match(msg, /CF/);
  assert.doesNotMatch(msg, /undefined/);
});
