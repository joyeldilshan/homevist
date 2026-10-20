const test   = require("node:test");
const assert = require("node:assert/strict");
const fs     = require("node:fs");
const path   = require("node:path");

const files = require("../utils/reportFiles");
const { _canDownload: canDownload } = require("../controllers/labReport.controller");

/*
 * Report PDFs are patient health data. These pin: no path outside the
 * reports folder can be reached, uploads are judged by their bytes, names
 * are random, and only the right people may download. No database.
 */

test("pathFor refuses anything that is not a plain stored name", () => {
  for (const bad of [
    "../../.env", "..\\..\\.env", "/etc/passwd", "C:\\Windows\\win.ini", "%2e%2e%2f.env",
    "reports/../x.pdf", "x.pdf", "report-1.PDF", "report-1.pdf.exe", "", null, undefined, 42,
    "0123456789abcdef0123456789abcdef.pdf/..",
  ]) {
    assert.equal(files.pathFor(bad), null, `${JSON.stringify(bad)} must be refused`);
  }
});

test("pathFor accepts new random names and legacy names, inside the folder", () => {
  for (const ok of ["0123456789abcdef0123456789abcdef.pdf", "report-1781647127639-383813709.pdf", "report_BKTEST01_1700000000000.pdf"]) {
    const p = files.pathFor(ok);
    assert.ok(p && p.startsWith(files.REPORTS_DIR + path.sep), ok);
  }
});

test("new names are 32 random hex characters, never repeated", () => {
  const names = new Set(Array.from({ length: 200 }, files.newFileName));
  assert.equal(names.size, 200);
  for (const n of names) assert.match(n, /^[a-f0-9]{32}\.pdf$/);
});

test("storedNameOf reads fileName, else the last segment of a legacy public URL", () => {
  assert.equal(files.storedNameOf({ fileName: "0123456789abcdef0123456789abcdef.pdf" }), "0123456789abcdef0123456789abcdef.pdf");
  assert.equal(files.storedNameOf({ fileUrl: "https://api.example.com/uploads/reports/report-1-2.pdf" }), "report-1-2.pdf");
  assert.equal(files.storedNameOf({ fileUrl: "/api/reports/abc/file" }), null);
});

test("an upload is judged by its bytes, not its name or type", async () => {
  await assert.rejects(files.saveReportPdf(Buffer.from("<html>not a pdf</html>")), /Only PDF files/);
  await assert.rejects(files.saveReportPdf(Buffer.alloc(0)), /upload a PDF/);
  await assert.rejects(files.saveReportPdf(Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(files.MAX_BYTES)])), /10 MB/);

  const name = await files.saveReportPdf(Buffer.from("%PDF-1.4\n% test\n%%EOF\n"));
  try {
    assert.match(name, /^[a-f0-9]{32}\.pdf$/);
    assert.ok(fs.existsSync(files.pathFor(name)));
  } finally { await files.removeReportFile(name); }
  assert.equal(fs.existsSync(files.pathFor(name)), false);
});

test("who may download a report", () => {
  const patient = "p1", other = "p2", mlt = "m1", mltOther = "m2";
  const report = { patient, mlt, sample: { mlt }, sentToPatient: true };
  const u = (role, _id) => ({ role, _id });

  assert.equal(canDownload(u("admin", "a1"), report), true);
  assert.equal(canDownload(u("user", patient), report), true);
  assert.equal(canDownload(u("user", patient), { ...report, sentToPatient: false }), false, "not before it is sent");
  assert.equal(canDownload(u("user", other), report), false, "another patient");
  assert.equal(canDownload(u("mlt", mlt), report), true);
  assert.equal(canDownload(u("mlt", mltOther), report), false, "a different lab technician");
  assert.equal(canDownload(u("phlebotomist", "x"), report), false);
});
