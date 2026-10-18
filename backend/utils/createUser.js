/**
 * Create one admin or lab technician account.
 *
 *   npm run create-user          (from backend/)
 *
 * The admin dashboard can create phlebotomists, test types and plans, but
 * not admins or lab technicians, and the seed refuses to run in
 * production (it also deletes every user). This is the supported way to
 * create the first admin of a new deployment, and lab technicians later.
 *
 * Safety:
 *   - The same database guard as the server: outside NODE_ENV=production
 *     the database name must look like a development one. In production it
 *     runs against the production database, which is the point.
 *   - It prints the database name and you must type it to continue.
 *   - Interactive only: it refuses when stdin is not a terminal, because
 *     the password is typed with echo turned off.
 *   - The password is checked with the shared rule (8+ characters, a letter
 *     and a number), asked twice, never printed or logged, and stored only
 *     as the bcrypt hash the User model makes on save.
 *   - It only ever creates: an existing email is refused, nothing is
 *     updated or overwritten (no upsert; the unique index backs this up).
 *
 * A phone number is asked for too: the User model requires one.
 */
const readline = require("readline");
const { Writable } = require("stream");
const { checkDatabaseTarget, connectionFailedMessage } = require("./dbGuard");
const {
  isValidEmail, EMAIL_MESSAGE, isValidPassword, PASSWORD_MESSAGE,
  isValidUkPhone, normaliseUkPhone, PHONE_MESSAGE,
} = require("./validators");

const ROLES = { admin: "admin", mlt: "mlt" };
const ROLE_LABEL = { admin: "admin", mlt: "lab technician" };
const TRIES = 3;

class DuplicateEmailError extends Error {}

/**
 * Create the account. Never updates: an existing email is refused before
 * the insert, and a duplicate-key error from a race is refused the same way.
 */
async function createAccount(User, { role, name, email, phone, password }) {
  if (await User.findOne({ email }).lean()) throw new DuplicateEmailError();
  try {
    return await User.create({ role, name, email, phone, password, isActive: true });
  } catch (err) {
    if (err && err.code === 11000) throw new DuplicateEmailError();
    throw err;
  }
}

/**
 * One readline session whose echo can be switched off for a password.
 * Characters typed while hidden never reach the terminal.
 */
function prompter(input, output) {
  // Echo is off except while a visible question waits for its answer, so
  // anything typed ahead (a password included) is never shown.
  let muted = true;
  const echo = new Writable({
    write(chunk, _enc, done) { if (!muted) output.write(chunk); done(); },
  });
  const rl = readline.createInterface({ input, output: echo, terminal: true });
  const lines = [];
  let waiting = null;
  rl.on("line", (line) => { if (waiting) { const w = waiting; waiting = null; w(line); } else lines.push(line); });
  let closed = false;
  rl.on("close", () => { closed = true; if (waiting) { const w = waiting; waiting = null; w(null); } });
  // In raw mode Ctrl+C reaches readline, not the process: cancel cleanly
  // (without this the script would just pause and hang).
  rl.on("SIGINT", () => { output.write("\n  Cancelled. Nothing was created.\n"); rl.close(); });

  const ask = (question, { hidden = false } = {}) => new Promise((resolve) => {
    output.write(question);
    muted = hidden;
    const done = (answer) => {
      muted = true;
      if (hidden) output.write("\n");
      resolve(answer === null ? null : String(answer));
    };
    if (lines.length) done(lines.shift());
    else if (closed) done(null);
    else waiting = done;
  });
  return { ask, close: () => rl.close() };
}

/**
 * Ask until the answer passes `check` (returns an error message or null),
 * up to TRIES times. Returns the answer, or null to stop.
 */
async function askValid(ask, say, question, check, opts) {
  for (let i = 0; i < TRIES; i++) {
    const answer = await ask(question, opts);
    if (answer === null) return null;
    const problem = check(answer);
    if (!problem) return answer;
    say(`  ${problem}`);
  }
  say("  Too many attempts. Nothing was created.");
  return null;
}

/**
 * The whole flow. Everything outside is injectable so it can be tested
 * without a terminal or a database. Returns the process exit code.
 */
async function main({
  input = process.stdin,
  output = process.stdout,
  env = process.env,
  connect,
  disconnect,
  User,
} = {}) {
  const say = (line = "") => output.write(line + "\n");

  const target = checkDatabaseTarget({ uri: env.MONGO_URI, nodeEnv: env.NODE_ENV, allowNonDevDb: env.ALLOW_NON_DEV_DB });
  if (!target.ok) { say(target.error); return 1; }
  if (!input.isTTY) {
    say("Refusing to run: this must be run in an interactive terminal (it asks for a password with echo off).");
    return 1;
  }

  const { ask, close } = prompter(input, output);
  let connected = false;
  try {
    say("");
    say("  Create an admin or lab technician account");
    say(`    database: ${target.name || "(no database name in MONGO_URI)"}${env.NODE_ENV === "production" ? "  (NODE_ENV=production)" : ""}`);
    if (target.warning) say(`    ${target.warning}`);
    say("");
    const typed = await ask("  Type the database name to continue: ");
    if (typed === null || typed.trim() !== String(target.name)) {
      say("  The name did not match. Nothing was created.");
      return 1;
    }

    try { await connect(env.MONGO_URI); connected = true; }
    catch (err) { say(connectionFailedMessage(err)); return 1; }

    const role = await askValid(ask, say, "  Role (admin or mlt): ",
      (a) => (ROLES[a.trim().toLowerCase()] ? null : "Enter admin or mlt."));
    if (role === null) return 1;
    const name = await askValid(ask, say, "  Full name: ",
      (a) => (a.trim().length >= 2 ? null : "Enter a name of at least 2 characters."));
    if (name === null) return 1;
    const email = await askValid(ask, say, "  Email: ",
      (a) => (isValidEmail(a.trim()) ? null : EMAIL_MESSAGE));
    if (email === null) return 1;
    const cleanEmail = email.trim().toLowerCase();
    // Checked now so nobody types a password for nothing; checked again on create.
    if (await User.findOne({ email: cleanEmail }).lean()) {
      say("  An account with this email already exists. Nothing was changed.");
      return 1;
    }
    const phone = await askValid(ask, say, "  UK phone number: ",
      (a) => (isValidUkPhone(a) ? null : PHONE_MESSAGE));
    if (phone === null) return 1;

    let password = null;
    for (let i = 0; i < TRIES && password === null; i++) {
      const first = await ask("  Password (hidden): ", { hidden: true });
      if (first === null) return 1;
      if (!isValidPassword(first)) { say(`  ${PASSWORD_MESSAGE}`); continue; }
      const again = await ask("  Password again (hidden): ", { hidden: true });
      if (again === null) return 1;
      if (again !== first) { say("  The passwords did not match."); continue; }
      password = first;
    }
    if (password === null) { say("  Too many attempts. Nothing was created."); return 1; }

    const roleKey = ROLES[role.trim().toLowerCase()];
    try {
      await createAccount(User, { role: roleKey, name: name.trim(), email: cleanEmail, phone: normaliseUkPhone(phone), password });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        say("  An account with this email already exists. Nothing was changed.");
        return 1;
      }
      // Never err.message: mongoose validation messages can quote the
      // rejected value, and that could be the password.
      const fields = err && err.errors ? Object.keys(err.errors).join(", ") : "";
      say(`  The account could not be created${fields ? ` (check: ${fields})` : ""}.`);
      return 1;
    }

    say("");
    say(`  Created ${ROLE_LABEL[roleKey]} account ${cleanEmail} in ${target.name}.`);
    say("  They can sign in now. The password was not shown or stored anywhere but as a hash.");
    return 0;
  } finally {
    close();
    if (connected) await disconnect().catch(() => {});
  }
}

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const User = require("../models/User");
  main({
    connect:    (uri) => mongoose.connect(uri),
    disconnect: () => mongoose.disconnect(),
    User,
  }).then((code) => process.exit(code), () => {
    console.error("create-user stopped unexpectedly. Nothing was printed about the password.");
    process.exit(1);
  });
}

module.exports = { main, createAccount, DuplicateEmailError, prompter };
