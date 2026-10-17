/**
 * Test-data helper for the end-to-end suite. Talks to MongoDB through the
 * backend's own mongoose models.
 *
 * SAFETY
 *   - Uses backend/.env MONGO_URI and refuses to connect unless its
 *     database name passes the same guard as server.js (dev, test, local,
 *     sandbox or staging) AND is not the live name "hemovisit".
 *   - Every record it creates belongs to a user whose email starts with
 *     this run's tag (e2e-<run>-...@example.com). cleanup() deletes those
 *     users and everything that references them: bookings, samples, lab
 *     reports and the uploaded PDF files. Nothing else is touched.
 *   - Never logs the URI, a password or a token.
 */
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, "../../backend");
const requireBackend = createRequire(path.join(backendDir, "package.json"));

requireBackend("dotenv").config({ path: path.join(backendDir, ".env") });
const mongoose = requireBackend("mongoose");
const jwt = requireBackend("jsonwebtoken");
const { checkDatabaseTarget, databaseNameFrom } = requireBackend("./utils/dbGuard");

const User      = requireBackend("./models/User");
const Booking   = requireBackend("./models/Booking");
const Sample    = requireBackend("./models/Sample");
const LabReport = requireBackend("./models/LabReport");
const Subscription = requireBackend("./models/Subscription");
const Plan      = requireBackend("./models/Plan");
const { storedNameOf, pathFor } = requireBackend("./utils/reportFiles");

export const RUN = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
export const emailFor = (role) => `e2e-${RUN}-${role}@example.com`;
/** Plans have no owner, so test plans carry the run tag in their name. */
export const planName = (label) => `E2E-${RUN} ${label}`;
const RUN_EMAIL = new RegExp(`^e2e-${RUN}-`);

/** A password that meets the current rule. Never printed. */
export const strongPassword = () => `Hv${crypto.randomBytes(9).toString("base64url")}9a`;
/** A 6-character password, as the old rule allowed. Never printed. */
export const legacyPassword = () => `a${crypto.randomBytes(3).toString("hex").slice(0, 4)}1`;

export async function connect() {
  const uri  = process.env.MONGO_URI;
  const name = databaseNameFrom(uri);
  const target = checkDatabaseTarget({ uri, nodeEnv: "development", allowNonDevDb: undefined });
  if (!target.ok || name === "hemovisit") {
    throw new Error(`e2e refuses to run against database "${name}". Point backend/.env MONGO_URI at hemovisit_dev.`);
  }
  await mongoose.connect(uri);
  return name;   // the name only, for the report
}

/** Accounts the UI cannot create for itself (admin, lab technician, legacy). */
export async function createUser({ key, role, name, password, phone }) {
  const u = await User.create({ name, email: emailFor(key), password, phone, role });
  return { id: String(u._id), email: u.email };
}

/** A token for this user that expired a minute ago (expired-session check). */
export function expiredTokenFor(userId) {
  return jwt.sign({ id: userId, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
}

/** What exists for this run, for the report (counts only). */
export async function counts() {
  const users = await User.find({ email: RUN_EMAIL }).select("_id");
  const ids = users.map((u) => u._id);
  const bookings = await Booking.find({ user: { $in: ids } }).select("_id");
  const bIds = bookings.map((b) => b._id);
  return {
    users: users.length,
    bookings: bookings.length,
    samples: await Sample.countDocuments({ booking: { $in: bIds } }),
    reports: await LabReport.countDocuments({ booking: { $in: bIds } }),
  };
}

export async function cleanup() {
  const users = await User.find({ email: RUN_EMAIL }).select("_id");
  const ids = users.map((u) => u._id);
  const bookings = await Booking.find({ $or: [{ user: { $in: ids } }, { phlebotomist: { $in: ids } }] }).select("_id");
  const bIds = bookings.map((b) => b._id);
  const reports = await LabReport.find({ booking: { $in: bIds } }).select("fileName fileUrl");
  let files = 0;
  for (const r of reports) {
    const file = pathFor(storedNameOf(r));   // the backend's own, traversal-checked lookup
    if (file && fs.existsSync(file)) { fs.unlinkSync(file); files++; }
  }
  const removed = {
    subscriptions: (await Subscription.deleteMany({ user: { $in: ids } })).deletedCount,
    plans:    (await Plan.deleteMany({ name: new RegExp(`^E2E-${RUN} `) })).deletedCount,
    reports:  (await LabReport.deleteMany({ booking: { $in: bIds } })).deletedCount,
    samples:  (await Sample.deleteMany({ booking: { $in: bIds } })).deletedCount,
    bookings: (await Booking.deleteMany({ _id: { $in: bIds } })).deletedCount,
    users:    (await User.deleteMany({ _id: { $in: ids } })).deletedCount,
    files,
  };
  return removed;
}

/** Deactivate / reactivate a test account (only this run's users). */
export async function setActive(userId, isActive) {
  await User.updateOne({ _id: userId, email: RUN_EMAIL }, { isActive });
}

export async function disconnect() { await mongoose.disconnect(); }
