const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

/**
 * Where report PDFs live, and the only code that turns a stored name into
 * a path on disk.
 *
 * Reports are patient health data. They used to be served to anyone with
 * the link by express.static("/uploads"), under names built from a
 * timestamp and Math.random(). Now:
 *   - nothing serves this folder; files go out only through the
 *     authenticated GET /api/reports/:id/file;
 *   - new files get a server-generated name: 32 hex characters from
 *     crypto.randomBytes(16), plus ".pdf". Nothing the uploader sends
 *     (file name, extension, form fields) reaches the path;
 *   - every lookup is checked: the name must match a strict pattern and
 *     the resolved path must stay inside this folder (no traversal).
 *
 * The folder is unchanged (backend/uploads/reports, gitignored), so files
 * uploaded before this change keep working: their record stores only the
 * old public URL, and storedNameOf() falls back to its last segment.
 * scripts: utils/migrateReportFiles.js renames those to random names.
 */

const REPORTS_DIR = path.join(__dirname, "..", "uploads", "reports");
const MAX_BYTES   = 10 * 1024 * 1024;

// New names: 32 hex + .pdf. Legacy names: report-<ms>-<digits>.pdf or
// report_<bookingId>_<ms>.pdf. Anything else is refused.
const SAFE_NAME = /^(?:[a-f0-9]{32}|report[-_][A-Za-z0-9_-]{1,80})\.pdf$/;

const ensureDir = () => { if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true }); };

const newFileName = () => `${crypto.randomBytes(16).toString("hex")}.pdf`;

/** A real PDF starts with "%PDF-" (the extension and MIME type are the uploader's word). */
const isPdf = (buf) => Buffer.isBuffer(buf) && buf.length > 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-";

/** Absolute path for a stored name, or null if the name is not acceptable. */
function pathFor(name) {
  if (typeof name !== "string" || !SAFE_NAME.test(name) || path.basename(name) !== name) return null;
  const full = path.resolve(REPORTS_DIR, name);
  return full.startsWith(REPORTS_DIR + path.sep) ? full : null;
}

/** The stored name for a LabReport: fileName, or the last segment of a legacy fileUrl. */
function storedNameOf(report) {
  if (report?.fileName) return report.fileName;
  const legacy = report?.legacyFileUrl || report?.fileUrl || "";
  if (!/\/uploads\/reports\//.test(legacy)) return null;
  return path.basename(legacy.split("?")[0]);
}

/** Write a validated PDF buffer under a fresh random name. Returns the name. */
async function saveReportPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw Object.assign(new Error("Please upload a PDF report file."), { statusCode: 400 });
  if (buffer.length > MAX_BYTES) throw Object.assign(new Error("The PDF must be 10 MB or smaller."), { statusCode: 413 });
  if (!isPdf(buffer)) throw Object.assign(new Error("Only PDF files are allowed."), { statusCode: 400 });
  ensureDir();
  const name = newFileName();
  await fs.promises.writeFile(pathFor(name), buffer, { flag: "wx" });   // wx: never overwrite
  return name;
}

async function removeReportFile(name) {
  const full = pathFor(name);
  if (full) await fs.promises.unlink(full).catch(() => {});
}

/** The URL clients use for a report's file: the authenticated route. */
const downloadPath = (reportId) => `/api/reports/${reportId}/file`;

module.exports = { REPORTS_DIR, MAX_BYTES, SAFE_NAME, newFileName, isPdf, pathFor, storedNameOf, saveReportPdf, removeReportFile, downloadPath, ensureDir };
