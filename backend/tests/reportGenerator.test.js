const test   = require("node:test");
const assert = require("node:assert/strict");
const fs     = require("node:fs");
const path   = require("node:path");
const zlib   = require("node:zlib");

const { generateReport, ReportDataError } = require("../utils/reportGenerator");

/*
 * The PDF generator once printed a named doctor with a registration
 * number, a fixed "results are within acceptable ranges" remark, and a
 * made-up full blood count whenever a test had no parameters. These tests
 * pin the opposite: no real results, no report; nothing clinical invented.
 * No database: the booking is an in-memory object.
 */

const id = (s) => ({ toString: () => s });
const booking = () => ({
  _id: id("000000000000000000abc123"), bookingId: "BKTESTGEN01", barcodeValue: "BKTESTGEN01",
  user: { _id: id("000000000000000000aaa111"), name: "Test Patient", phone: "+447700900123", age: 40, gender: "female" },
  address: "1 Example St, Cardiff, CF10 1AA", appointmentDate: new Date("2026-10-20"), appointmentTime: "09:30",
  phlebotomist: { name: "Test Phlebotomist", _id: id("000000000000000000def456") },
  isHomeVisit: true, status: "processing",
  testType: { name: "Full Blood Count", code: "CBC", parameters: [{ name: "Haemoglobin", unit: "g/dL", refRange: "13.0 – 17.0" }] },
});

const reportsDir = path.join(__dirname, "..", "uploads", "reports");
const listReports = () => (fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir) : []);

/** Text shown on the page: pdfkit writes it hex-encoded inside deflated streams. */
function pdfText(file) {
  const raw = fs.readFileSync(file).toString("latin1");
  let out = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const body = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      out += [...body.matchAll(/<([0-9a-f]+)>/gi)].map((x) => Buffer.from(x[1], "hex").toString("latin1")).join("");
    } catch { /* not a deflated content stream */ }
  }
  return out.replace(/\s+/g, " ");
}

// Uses the name the generator returns, not a before/after listing of the
// folder: other test files write to it in parallel.
async function render(opts) {
  const rel = await generateReport(booking(), opts);
  const file = path.join(reportsDir, rel);
  assert.ok(fs.existsSync(file), "the returned file was written");
  try { return { rel, text: pdfText(file) }; } finally { fs.unlinkSync(file); }
}

test("refuses to generate a report without results", async () => {
  const before = listReports().length;
  for (const opts of [undefined, {}, { results: [] }, { results: null }]) {
    await assert.rejects(generateReport(booking(), opts), (e) => e instanceof ReportDataError && /no results were provided/.test(e.message));
  }
  assert.equal(listReports().length, before, "nothing written on refusal");
});

test("refuses when any result row has no value", async () => {
  for (const bad of [{ name: "Haemoglobin" }, { name: "Haemoglobin", result: "" }, { name: "Haemoglobin", result: "  " }, { result: "14" }]) {
    await assert.rejects(generateReport(booking(), { results: [bad] }), ReportDataError);
  }
});

test("prints the results it is given, and nothing invented", async () => {
  const { text } = await render({ results: [{ name: "Haemoglobin", result: "13.9", unit: "g/dL", refRange: "13.0 – 17.0" }] });
  assert.match(text, /Haemoglobin/);
  assert.match(text, /13\.9/);
  assert.match(text, /Test Phlebotomist/);                       // from the booking
  assert.match(text, /Authorised by the processing laboratory/); // blank line, nobody named
  for (const invented of [/Arulnathan/i, /MBBS/, /SLMC/, /Patholog/i, /acceptable ranges/i, /Reg:/, /Platelets/, /148,000/]) {
    assert.doesNotMatch(text, invented);
  }
  assert.doesNotMatch(text, /LABORATORY REMARKS/, "no remarks section unless the lab wrote some");
  assert.doesNotMatch(text, /Within normal range/i, "no interpretation of unflagged rows");
});

test("prints the laboratory's own remarks only when given", async () => {
  const { text } = await render({ results: [{ name: "HbA1c", result: "39", unit: "mmol/mol" }], remarks: "Sample slightly haemolysed." });
  assert.match(text, /LABORATORY REMARKS/);
  assert.match(text, /Sample slightly haemolysed\./);
});
