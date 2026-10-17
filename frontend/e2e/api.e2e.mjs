/**
 * API tests against a running backend on a development database: the
 * password policy and object-level authorization.
 *
 *   backend:  EMAIL_USER= EMAIL_PASS= node server.js   (logs database: hemovisit_dev)
 *   here:     npm run test:api
 *
 * No browser. Users and records are created per run (e2e-<run>-...) and
 * removed at the end (e2e/db.mjs). Passwords and tokens are never printed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import * as db from "./db.mjs";

const API = (process.env.API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const U = {};          // key -> { email, password, id, token }

async function req(method, path, { token, body, raw } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !raw ? { "Content-Type": "application/json" } : {}) },
    body: raw || (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  const type = r.headers.get("content-type") || "";
  if (type.includes("json")) json = await r.json();
  return { status: r.status, json, type };
}

async function login(u) {
  const r = await req("POST", "/auth/login", { body: { email: u.email, password: u.password } });
  assert.equal(r.status, 200, `login for ${u.email.split("-").pop()} failed`);
  u.token = r.json.token;
  u.id = r.json.user._id;
  return u;
}

before(async () => {
  await db.connect();
  const make = async (key, role, phone, password = db.strongPassword()) => {
    const u = { key, role, password, ...(await db.createUser({ key, role, name: `E2E ${key}`, password, phone })) };
    U[key] = await login(u);
  };
  await make("admin",  "admin",        "07700 900201");
  await make("mlt",    "mlt",          "07700 900202");
  await make("mlt2",   "mlt",          "07700 900203");
  await make("phleb",  "phlebotomist", "07700 900204");
  await make("phleb2", "phlebotomist", "07700 900205");
  await make("patA",   "user",         "07700 900206");
  await make("patB",   "user",         "07700 900207");
  await make("legacy", "user",         "07700 900208", db.legacyPassword());
});

after(async () => {
  try {
    const removed = await db.cleanup();
    console.log(`cleanup: removed ${JSON.stringify(removed)}`);
    assert.deepEqual(await db.counts(), { users: 0, bookings: 0, samples: 0, reports: 0 });
  } finally { await db.disconnect(); }
});

/* ── 3. Password policy: one rule for every new password, not for login ── */
const WEAK = ["abc123", "abcdefgh", "12345678", "Ab1"];

test("admin cannot create a phlebotomist with a weak password", async () => {
  for (const password of WEAK) {
    const r = await req("POST", "/phlebotomists", { token: U.admin.token, body: { name: "Weak", email: db.emailFor(`weak${password.length}`), phone: "07700 900290", password } });
    assert.equal(r.status, 400, `"${password}" must be refused`);
    assert.match(r.json.message, /at least 8 characters/);
  }
  const ok = await req("POST", "/phlebotomists", { token: U.admin.token, body: { name: "Strong", email: db.emailFor("phlebnew"), phone: "07700 900291", password: db.strongPassword() } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.phlebotomist.password, undefined, "password never returned");
});

test("registration refuses a weak password", async () => {
  // Two cases only: the register limiter counts every attempt (5 an hour).
  for (const password of WEAK.slice(0, 2)) {
    const r = await req("POST", "/auth/register", { body: { name: "Weak", email: db.emailFor("regweak"), phone: "07700 900292", password, privacyPolicyAccepted: true } });
    assert.equal(r.status, 400, `"${password}" must be refused`);
  }
});

test("changing a password applies the rule to the new password", async () => {
  const r = await req("PUT", "/auth/change-password", { token: U.patA.token, body: { currentPassword: U.patA.password, newPassword: "abc123" } });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /at least 8 characters/);
});

test("login does not apply the rule: a short pre-2026 password still signs in", async () => {
  assert.ok(U.legacy.password.length < 8);
  const r = await req("POST", "/auth/login", { body: { email: U.legacy.email, password: U.legacy.password } });
  assert.equal(r.status, 200);
});

export { API, U, req, login };
