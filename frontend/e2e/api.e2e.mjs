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
import { io } from "socket.io-client";

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
  await make("phleb3", "phlebotomist", "07700 900209");   // deactivated by PATCH
  await make("phleb4", "phlebotomist", "07700 900210");   // deactivated by DELETE
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


/* ── 4. Object-level authorization ───────────────────────────────────── */
const D = {};    // shared records: bookings, sample, report, plan, subscription
const NOT_A_RECORD = "000000000000000000000000";   // well-formed, matches nothing
const PDF = Buffer.from("%PDF-1.4\n% e2e authorization test\n%%EOF\n");

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const book = async (who) => {
  const tests = (await req("GET", "/test-types")).json.testTypes;
  D.testId = tests[0]._id;
  const r = await req("POST", "/bookings", { token: who.token, body: {
    testTypeIds: [D.testId], appointmentDate: tomorrow(), appointmentTime: "09:00",
    address: "1 Example Street, Cardiff, CF10 1AA", addressParts: { line1: "1 Example Street", city: "Cardiff", postcode: "CF10 1AA" } } });
  assert.equal(r.status, 201);
  return r.json.booking;
};
const upload = async (token, sampleId) => {
  const fd = new FormData();
  fd.append("report", new Blob([PDF], { type: "application/pdf" }), "r.pdf");
  fd.append("sampleId", sampleId);
  return req("POST", "/reports", { token, raw: fd });
};
const noLeak = (r) => {
  const text = JSON.stringify(r.json || {});
  assert.doesNotMatch(text, /Cast to ObjectId|stack|mongoose|E2E patB|07700 ?900207/i, `response leaks: ${text.slice(0, 120)}`);
};

test("setup: a booking for each patient; patient A's goes through the lab", async () => {
  D.bookA = await book(U.patA);
  D.bookB = await book(U.patB);
  let r = await req("PATCH", `/bookings/${D.bookA._id}/assign`, { token: U.admin.token, body: { phlebotomistId: U.phleb.id } });
  assert.equal(r.status, 200);
  r = await req("POST", "/samples", { token: U.phleb.token, body: { bookingId: D.bookA._id } });
  assert.equal(r.status, 201);
  D.sampleA = r.json.sample;
});

test("a lab technician cannot upload a report before the sample is being processed", async () => {
  for (const step of [null, "received"]) {
    if (step) assert.equal((await req("PATCH", `/samples/${D.sampleA._id}/status`, { token: U.mlt.token, body: { status: step } })).status, 200);
    const r = await upload(U.mlt.token, D.sampleA._id);
    assert.equal(r.status, 409, `upload at "${step || "sent_to_lab"}" must be refused`);
  }
  assert.equal((await req("PATCH", `/samples/${D.sampleA._id}/status`, { token: U.mlt.token, body: { status: "processing" } })).status, 200);
  const ok = await upload(U.mlt.token, D.sampleA._id);
  assert.equal(ok.status, 201);
  D.reportA = ok.json.report;
  assert.equal((await req("PATCH", `/reports/${D.reportA._id}/send`, { token: U.mlt.token })).status, 200);
});

test("lab statuses only move forward, and 'completed' only comes from sending a report", async () => {
  const back = await req("PATCH", `/samples/${D.sampleA._id}/status`, { token: U.mlt.token, body: { status: "received" } });
  assert.equal(back.status, 409, "completed -> received must be refused");
  const done = await req("PATCH", `/samples/${D.sampleA._id}/status`, { token: U.mlt.token, body: { status: "completed" } });
  assert.ok([400, 409].includes(done.status), `completed via PATCH -> ${done.status}`);
});

test("patient A cannot see patient B's bookings", async () => {
  const r = await req("GET", "/bookings", { token: U.patA.token });
  assert.equal(r.status, 200);
  assert.ok(r.json.bookings.every((b) => String(b.user?._id || b.user) === U.patA.id));
  assert.equal(r.json.bookings.some((b) => b._id === D.bookB._id), false);
  // The status filter takes a string only; an operator object must not widen the query.
  const inj = await req("GET", "/bookings?status[$ne]=nothing", { token: U.patA.token });
  assert.equal(inj.status, 400);
});

test("patient A cannot cancel, rate or change patient B's booking", async () => {
  const cancel = await req("PATCH", `/bookings/${D.bookB._id}/status`, { token: U.patA.token, body: { status: "cancelled" } });
  assert.equal(cancel.status, 404); noLeak(cancel);
  const rate = await req("POST", `/bookings/${D.bookB._id}/rate`, { token: U.patA.token, body: { rating: 5 } });
  assert.equal(rate.status, 404); noLeak(rate);
  const after = await req("GET", "/bookings", { token: U.patB.token });
  assert.equal(after.json.bookings.find((b) => b._id === D.bookB._id).status, "pending", "B's booking untouched");
});

test("a patient cannot cancel a booking that is already finished", async () => {
  const r = await req("PATCH", `/bookings/${D.bookA._id}/status`, { token: U.patA.token, body: { status: "cancelled" } });
  assert.equal(r.status, 409);
});

test("patient A cannot download patient B's report; patient B cannot download A's", async () => {
  const own = await fetch(`${API}/reports/${D.reportA._id}/file`, { headers: { Authorization: `Bearer ${U.patA.token}` } });
  assert.equal(own.status, 200);
  assert.equal(Buffer.from(await own.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const other = await req("GET", `/reports/${D.reportA._id}/file`, { token: U.patB.token });
  assert.equal(other.status, 404); noLeak(other);
  const list = await req("GET", "/reports", { token: U.patB.token });
  assert.equal(list.json.reports.length, 0, "B lists no reports");
  const mlt2 = await req("GET", `/reports/${D.reportA._id}/file`, { token: U.mlt2.token });
  assert.equal(mlt2.status, 404, "a different lab technician cannot download it either");
});

test("patient A cannot read or change patient B's profile", async () => {
  const me = await req("GET", "/auth/me", { token: U.patA.token });
  assert.equal(me.json.user._id, U.patA.id);
  const r = await req("PUT", "/auth/update-profile", { token: U.patA.token, body: { _id: U.patB.id, id: U.patB.id, user: U.patB.id, name: "Changed by A", role: "admin" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.user._id, U.patA.id, "only A's own record was updated");
  assert.equal(r.json.user.role, "user", "role cannot be changed through the profile");
  const b = await req("GET", "/auth/me", { token: U.patB.token });
  assert.equal(b.json.user.name, "E2E patB");
});

test("patient A cannot pause, resume or cancel patient B's subscription", async () => {
  const plan = await req("POST", "/plans", { token: U.admin.token, body: { name: db.planName("authz plan"), testTypeIds: [D.testId], visitsPerCycle: 1, cycleLengthDays: 30, price: 10 } });
  assert.equal(plan.status, 201);
  D.plan = plan.json.plan;
  const sub = await req("POST", "/subscriptions", { token: U.patB.token, body: { planId: D.plan._id, address: "1 Example Street, Cardiff", addressParts: { postcode: "CF10 1AA" }, appointmentTime: "09:00" } });
  assert.equal(sub.status, 201);
  D.subB = sub.json.subscription;
  for (const action of ["pause", "resume", "cancel"]) {
    const r = await req("PATCH", `/subscriptions/${D.subB._id}/${action}`, { token: U.patA.token });
    assert.equal(r.status, 404, `${action} must be refused`); noLeak(r);
  }
  // Transitions make sense for the owner too: a cancelled plan cannot be resumed.
  assert.equal((await req("PATCH", `/subscriptions/${D.subB._id}/cancel`, { token: U.patB.token })).status, 200);
  assert.equal((await req("PATCH", `/subscriptions/${D.subB._id}/resume`, { token: U.patB.token })).status, 409);
});

test("a phlebotomist sees and acts only on bookings assigned to them", async () => {
  const other = await req("GET", "/bookings", { token: U.phleb2.token });
  assert.equal(other.json.bookings.some((b) => b._id === D.bookA._id), false, "not someone else's booking");
  assert.equal(other.json.bookings.some((b) => b._id === D.bookB._id), false, "not an unassigned booking");
  assert.ok(other.json.bookings.every((b) => String(b.phlebotomist?._id || b.phlebotomist) === U.phleb2.id));
  const status = await req("PATCH", `/bookings/${D.bookB._id}/status`, { token: U.phleb2.token, body: { status: "confirmed" } });
  assert.equal(status.status, 404); noLeak(status);
  const sample = await req("POST", "/samples", { token: U.phleb2.token, body: { bookingId: D.bookB._id } });
  assert.equal(sample.status, 404, "cannot send an unassigned booking to the lab"); noLeak(sample);
  const lab = await req("PATCH", `/bookings/${D.bookA._id}/status`, { token: U.phleb.token, body: { status: "completed" } });
  assert.equal(lab.status, 403, "a phlebotomist cannot set laboratory statuses");
});

test("a normal user cannot call admin or staff routes", async () => {
  const calls = [
    ["GET", "/phlebotomists"], ["POST", "/phlebotomists", {}], ["PATCH", `/phlebotomists/${U.phleb.id}`, { name: "x" }],
    ["DELETE", `/phlebotomists/${U.phleb.id}`], ["POST", "/test-types", {}], ["PUT", `/test-types/${D.testId}`, { price: 1 }],
    ["DELETE", `/test-types/${D.testId}`], ["GET", "/plans/all"], ["POST", "/plans", {}], ["GET", "/subscriptions"],
    ["PATCH", `/subscriptions/${D.subB._id}/mark-paid`], ["PATCH", `/bookings/${D.bookB._id}/assign`, { phlebotomistId: U.phleb.id }],
    ["GET", "/samples"], ["PATCH", `/samples/${D.sampleA._id}/status`, { status: "received" }], ["POST", "/reports", {}],
    ["PATCH", `/reports/${D.reportA._id}/send`],
  ];
  for (const [method, path, body] of calls) {
    const r = await req(method, path, { token: U.patA.token, body });
    assert.equal(r.status, 403, `${method} ${path} -> ${r.status}`);
  }
});

test("the admin phlebotomist routes only touch phlebotomist accounts", async () => {
  const r = await req("PATCH", `/phlebotomists/${U.patB.id}`, { token: U.admin.token, body: { isActive: false } });
  assert.equal(r.status, 404, "editing a patient through the phlebotomist route");
  const d = await req("DELETE", `/phlebotomists/${U.mlt2.id}`, { token: U.admin.token });
  assert.equal(d.status, 404, "deactivating a lab technician through the phlebotomist route");
  assert.equal((await req("GET", "/auth/me", { token: U.patB.token })).status, 200, "patient B still active");
  assert.equal((await req("GET", "/auth/me", { token: U.mlt2.token })).status, 200, "lab technician 2 still active");
});

test("the booking verification lookup is not public", async () => {
  const anon = await req("GET", `/bookings/verify/${D.bookA.bookingId}`);
  assert.equal(anon.status, 401); noLeak(anon);
  const patient = await req("GET", `/bookings/verify/${D.bookA.bookingId}`, { token: U.patB.token });
  assert.equal(patient.status, 403);
  const other = await req("GET", `/bookings/verify/${D.bookA.bookingId}`, { token: U.phleb2.token });
  assert.equal(other.status, 404, "a phlebotomist not on this booking");
  const assigned = await req("GET", `/bookings/verify/${D.bookA.bookingId}`, { token: U.phleb.token });
  assert.equal(assigned.status, 200);
});

test("malformed or unknown IDs give 403/404 without leaking anything", async () => {
  const cases = [
    ["PATCH", "/bookings/not-an-id/status", U.patA, { status: "cancelled" }],
    ["PATCH", `/bookings/${NOT_A_RECORD}/status`, U.patA, { status: "cancelled" }],
    ["POST", "/bookings/not-an-id/rate", U.patA, { rating: 4 }],
    ["GET", "/reports/not-an-id/file", U.patA],
    ["GET", `/reports/${NOT_A_RECORD}/file`, U.patA],
    ["PATCH", "/subscriptions/not-an-id/pause", U.patA],
    ["PATCH", "/bookings/not-an-id/assign", U.admin, { phlebotomistId: U.phleb.id }],
    ["PATCH", "/samples/not-an-id/status", U.mlt, { status: "received" }],
    ["PATCH", "/reports/not-an-id/send", U.mlt],
    ["PATCH", "/phlebotomists/not-an-id", U.admin, { name: "x" }],
    ["PUT", "/test-types/not-an-id", U.admin, { price: 1 }],
    ["POST", "/samples", U.phleb, { bookingId: "not-an-id" }],
  ];
  for (const [method, path, who, body] of cases) {
    const r = await req(method, path, { token: who.token, body });
    assert.ok([403, 404].includes(r.status), `${method} ${path} -> ${r.status}`);
    noLeak(r);
  }
});

test("a deactivated account is refused on every route, including lab routes", async () => {
  await db.setActive(U.mlt2.id, false);
  try {
    for (const [method, path] of [["GET", "/samples"], ["GET", "/reports"], ["GET", "/auth/me"], ["GET", "/bookings"]]) {
      const r = await req(method, path, { token: U.mlt2.token });
      assert.equal(r.status, 403, `${method} ${path} -> ${r.status}`);
    }
  } finally { await db.setActive(U.mlt2.id, true); }
});

/* ── sockets: real-time rooms need a signed-in, entitled user ────────── */
const SOCKET = new URL(API).origin;
// Every socket is closed after the tests, pass or fail: an open one keeps
// the process alive.
const opened = [];
after(() => opened.forEach((s) => s.close()));
const connect = (token) => new Promise((resolve) => {
  const s = io(SOCKET, { auth: token ? { token } : {}, transports: ["websocket"], reconnection: false, timeout: 4000 });
  s.on("connect", () => resolve({ s, ok: true }));
  s.on("connect_error", (e) => resolve({ s, ok: false, error: e.message }));
});
const heard = (s, event, ms = 2500) => new Promise((resolve) => {
  const t = setTimeout(() => resolve(null), ms);
  s.once(event, (d) => { clearTimeout(t); resolve(d); });
});

test("sockets: no token, no connection", async () => {
  const { s, ok } = await connect(null);
  opened.push(s);
  assert.equal(ok, false);
});

test("sockets: a patient cannot listen to another patient's booking or to the admin room", async () => {
  const { s, ok } = await connect(U.patA.token);
  opened.push(s);
  assert.equal(ok, true);
  s.emit("join_booking", D.bookB.bookingId);
  s.emit("join_admin");
  await new Promise((r) => setTimeout(r, 300));
  const waitStatus = heard(s, "status_update");
  const waitAdmin  = heard(s, "new_booking");
  // B cancels their own booking (emits to B's room); a new booking emits to the admin room.
  assert.equal((await req("PATCH", `/bookings/${D.bookB._id}/status`, { token: U.patB.token, body: { status: "cancelled" } })).status, 200);
  D.bookB2 = await book(U.patB);
  assert.equal(await waitStatus, null, "A heard B's booking update");
  assert.equal(await waitAdmin, null, "A heard the admin room");
  s.close();
});

test("sockets: the owner hears their booking, the admin hears new bookings", async () => {
  const owner = await connect(U.patB.token);
  const admin = await connect(U.admin.token);
  opened.push(owner.s, admin.s);
  assert.ok(owner.ok && admin.ok);
  owner.s.emit("join_booking", D.bookB2.bookingId);
  admin.s.emit("join_admin");
  await new Promise((r) => setTimeout(r, 300));
  const ownerHears = heard(owner.s, "status_update", 5000);
  const adminHears = heard(admin.s, "new_booking", 5000);
  assert.equal((await req("PATCH", `/bookings/${D.bookB2._id}/status`, { token: U.patB.token, body: { status: "cancelled" } })).status, 200);
  await book(U.patB);
  assert.equal((await ownerHears)?.status, "cancelled");
  assert.ok(await adminHears, "admin hears new bookings");
  owner.s.close(); admin.s.close();
});

test("sockets: deactivating an account drops its open sockets at once, and it cannot reconnect", async () => {
  const dropped = (s) => new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 5000);
    s.once("disconnect", (reason) => { clearTimeout(t); resolve(reason); });
  });
  const bystander = await connect(U.phleb.token);
  opened.push(bystander.s);
  assert.ok(bystander.ok);

  for (const [key, how] of [
    ["phleb3", () => req("PATCH",  `/phlebotomists/${U.phleb3.id}`, { token: U.admin.token, body: { isActive: false } })],
    ["phleb4", () => req("DELETE", `/phlebotomists/${U.phleb4.id}`, { token: U.admin.token })],
  ]) {
    // Two tabs: both must go.
    const tabs = [await connect(U[key].token), await connect(U[key].token)];
    tabs.forEach((t) => opened.push(t.s));
    assert.ok(tabs.every((t) => t.ok), `${key} connects while active`);
    const gone = tabs.map((t) => dropped(t.s));
    assert.equal((await how()).status, 200);
    // "io server disconnect" = the server ended it (not a timeout or the client).
    for (const reason of await Promise.all(gone)) assert.equal(reason, "io server disconnect", `${key}'s socket was not dropped`);
    const again = await connect(U[key].token);
    opened.push(again.s);
    assert.equal(again.ok, false, `${key} reconnected after deactivation`);
  }
  assert.ok(bystander.s.connected, "another user's socket was dropped too");
  bystander.s.close();
});
