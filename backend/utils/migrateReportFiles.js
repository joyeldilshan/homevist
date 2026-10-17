/**
 * One-off migration for report PDFs uploaded before reports went private.
 *
 *   node utils/migrateReportFiles.js            # dry run: counts only
 *   node utils/migrateReportFiles.js --apply    # do it
 *
 * Before: LabReport.fileUrl held a public URL (…/uploads/reports/report-
 * <timestamp>-<random>.pdf) and the file was served to anyone with it.
 * The new code already serves those files through the authenticated
 * route without any migration (it reads the name from the old URL), so
 * this is about the names: they were guessable.
 *
 * For each report with no fileName, --apply:
 *   1. copies the file to a new random name (crypto, 32 hex) in the same
 *      private folder;
 *   2. sets fileName to it and fileUrl to the download route;
 *   3. checks the copy byte-for-byte, then deletes the old name.
 * A failure at any step leaves the old file and record untouched, and
 * the script can be re-run: records that already have a fileName are
 * skipped. Reports whose file is missing are counted and left alone.
 *
 * Same database guard as the server: outside NODE_ENV=production the
 * database name must look like a development one. Prints counts only:
 * no patient data, no URIs.
 */
require("dotenv").config();
const fs       = require("fs");
const mongoose = require("mongoose");
const { checkDatabaseTarget } = require("./dbGuard");
const LabReport = require("../models/LabReport");
const { storedNameOf, pathFor, newFileName, downloadPath, ensureDir } = require("./reportFiles");

async function main() {
  const apply = process.argv.includes("--apply");
  const target = checkDatabaseTarget({ uri: process.env.MONGO_URI, nodeEnv: process.env.NODE_ENV, allowNonDevDb: process.env.ALLOW_NON_DEV_DB });
  if (!target.ok) { console.error(target.error); process.exit(1); }
  console.log(`database: ${target.name} · ${apply ? "APPLY" : "dry run (add --apply to change anything)"}`);

  await mongoose.connect(process.env.MONGO_URI);
  ensureDir();
  const legacy = await LabReport.find({ $or: [{ fileName: { $exists: false } }, { fileName: null }, { fileName: "" }] });
  const counts = { legacyRecords: legacy.length, migrated: 0, fileMissing: 0, unreadableName: 0, failed: 0 };

  for (const report of legacy) {
    const oldName = storedNameOf(report);
    const oldPath = pathFor(oldName);
    if (!oldPath) { counts.unreadableName++; continue; }
    if (!fs.existsSync(oldPath)) { counts.fileMissing++; continue; }
    if (!apply) { counts.migrated++; continue; }

    const newName = newFileName();
    const newPath = pathFor(newName);
    try {
      await fs.promises.copyFile(oldPath, newPath, fs.constants.COPYFILE_EXCL);
      const [a, b] = await Promise.all([fs.promises.readFile(oldPath), fs.promises.readFile(newPath)]);
      if (!a.equals(b)) throw new Error("copy differs");
      report.fileName = newName;
      report.fileUrl  = downloadPath(report._id);
      await report.save();
      await fs.promises.unlink(oldPath);
      counts.migrated++;
    } catch {
      await fs.promises.unlink(newPath).catch(() => {});
      counts.failed++;
    }
  }

  console.log(JSON.stringify(counts));
  if (!apply && counts.migrated) console.log(`${counts.migrated} file(s) would be renamed. Re-run with --apply.`);
  await mongoose.disconnect();
  process.exit(counts.failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Migration stopped:", e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
