const test   = require("node:test");
const assert = require("node:assert/strict");
const { mailFrom, displayName } = require("../utils/mailFrom");

/*
 * Email goes out through Gmail as EMAIL_USER, so the address is always
 * EMAIL_USER. EMAIL_FROM sets only the display name.
 */

test("unset EMAIL_FROM: each email keeps its own name, sent as EMAIL_USER", () => {
  assert.deepEqual(mailFrom("HemoVisit Lab", { EMAIL_USER: "lab@gmail.example" }),
                   { name: "HemoVisit Lab", address: "lab@gmail.example" });
  assert.equal(mailFrom("X", { EMAIL_FROM: "   ", EMAIL_USER: "a@b.example" }).name, "X");
});

test("EMAIL_FROM sets the display name only; an address in it is ignored", () => {
  assert.deepEqual(mailFrom("Default", { EMAIL_FROM: "HemoVisit", EMAIL_USER: "send@gmail.example" }),
                   { name: "HemoVisit", address: "send@gmail.example" });
  // The older "Name <address>" form: the name is used, the address is not.
  assert.deepEqual(mailFrom("Default", { EMAIL_FROM: "HemoVisit Care <noreply@other.example>", EMAIL_USER: "send@gmail.example" }),
                   { name: "HemoVisit Care", address: "send@gmail.example" });
  // A bare address has no name in it: fall back to the default name.
  assert.equal(mailFrom("Default", { EMAIL_FROM: "ops@other.example", EMAIL_USER: "s@g.example" }).name, "Default");
});

test("no value can add a header or break the From line", () => {
  assert.equal(displayName("Evil\r\nBcc: victim@example.com"), "Evil Bcc: victim@example.com");
  assert.equal(displayName('"Quoted" <x@y.z>'), "Quoted");
  assert.equal(displayName("<script>"), null);
  assert.equal(displayName("A".repeat(200)).length, 64);
});

test("the emails that are sent use it", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { EMAIL_USER: "", EMAIL_PASS: "", EMAIL_FROM: "HemoVisit Test" });
  try {
    delete require.cache[require.resolve("../utils/reportEmail")];
    const { sendReportToPatient } = require("../utils/reportEmail");
    const info = await sendReportToPatient({ to: "p@example.com", patientName: "P", reportId: "RPT-1", bookingId: "BK1" });
    const from = JSON.parse(info.message).from;
    assert.deepEqual(from, { name: "HemoVisit Test", address: "mock-sender@hemovisit.invalid" }, "mock mode: unroutable address");
    const src = require("node:fs").readFileSync(require.resolve("../utils/emailService"), "utf8");
    assert.equal((src.match(/from:\s+mailFrom\(/g) || []).length, 3, "all three booking emails use mailFrom");
    assert.doesNotMatch(src, /EMAIL_USER\}>/);
  } finally {
    for (const k of ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"]) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
});

test("no invented domain is hard-coded as the sender", () => {
  for (const f of ["../config/locale", "../utils/mailFrom"]) {
    const src = require("node:fs").readFileSync(require.resolve(f), "utf8");
    assert.doesNotMatch(src, /homevisit\.co\.uk/);
  }
});
