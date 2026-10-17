const test   = require("node:test");
const assert = require("node:assert/strict");

/*
 * With no EMAIL_USER/EMAIL_PASS, the email modules must build messages
 * and send nothing (README: "Blank = email runs in mock mode"). Before
 * this, emailService.js and reportEmail.js always used Gmail: a blank
 * config made "send report to patient" fail, a real one sent real mail
 * from any test run. jsonTransport makes no network connection.
 */
/*
 * The email modules log with emoji to stdout. Under node:test's default
 * process isolation that output shares the child's stdout with the
 * runner's serialised results and can corrupt them ("Unable to
 * deserialize cloned data"), so silence it for these tests.
 */
test.beforeEach((t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "warn", () => {});
});

function fresh(mod) {
  delete require.cache[require.resolve(mod)];
  return require(mod);
}

test("report email is built, not sent, when credentials are blank", async () => {
  const saved = { u: process.env.EMAIL_USER, p: process.env.EMAIL_PASS };
  process.env.EMAIL_USER = ""; process.env.EMAIL_PASS = "";
  try {
    const { sendReportToPatient } = fresh("../utils/reportEmail");
    const info = await sendReportToPatient({
      to: "patient@example.com", patientName: "Test", reportId: "RPT-TEST",
      sampleId: "S1", bookingId: "BK1", tests: "CBC", labComments: "", filePath: null, fileUrl: null,
    });
    const msg = JSON.parse(info.message);
    assert.equal(msg.to[0].address, "patient@example.com");
    assert.match(msg.subject, /RPT-TEST/);
  } finally {
    process.env.EMAIL_USER = saved.u ?? ""; process.env.EMAIL_PASS = saved.p ?? "";
    if (saved.u === undefined) delete process.env.EMAIL_USER;
    if (saved.p === undefined) delete process.env.EMAIL_PASS;
  }
});

test("booking emails are built, not sent, when credentials are blank", async () => {
  const saved = { u: process.env.EMAIL_USER, p: process.env.EMAIL_PASS };
  process.env.EMAIL_USER = ""; process.env.EMAIL_PASS = "";
  try {
    const { sendPhlebotomistAssignment } = fresh("../utils/emailService");
    await assert.doesNotReject(sendPhlebotomistAssignment(
      { bookingId: "BK1", appointmentDate: new Date(), appointmentTime: "09:30", address: "CF10 1AA", testTypes: [] },
      { name: "Patient", phone: "07700900123" },
      { name: "Phleb", email: "phleb@example.com" },
    ));
  } finally {
    if (saved.u === undefined) delete process.env.EMAIL_USER; else process.env.EMAIL_USER = saved.u;
    if (saved.p === undefined) delete process.env.EMAIL_PASS; else process.env.EMAIL_PASS = saved.p;
  }
});
