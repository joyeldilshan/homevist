/**
 * End-to-end: typing into every dialog and form, one real keystroke at a
 * time, in a real browser against a production build.
 *
 * Regression for: typing in "Add a phlebotomist" sent focus back to "Full
 * name" after one character, so the rest went into the wrong field. The
 * shared Modal re-ran its initial-focus effect on every re-render.
 *
 * Keys go through page.keyboard, which types into whatever has focus, the
 * way a person does. (Locator.pressSequentially re-focuses its target
 * first, which would hide the bug.) After every key the field being typed
 * in must still have focus; after each form, every field must hold exactly
 * its own text. Nothing is submitted: dialogs are closed with Escape, and
 * focus must return to the button that opened them.
 *
 * Same setup as lifecycle.e2e.mjs: backend on hemovisit_dev with mock
 * email, the build served on 4173. Users and the few records some forms
 * need (a booking at each stage, a plan) are created for the run and
 * removed at the end, pass or fail.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as db from "./db.mjs";

const FRONT = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
const API   = (process.env.API_URL  || "http://localhost:5000/api").replace(/\/$/, "");

const U = {};          // key -> { email, password, token, user }
const D = {};          // records the forms need
let browser;
const opened = [];

/* ── setup helpers ─────────────────────────────────────────────────── */
async function req(method, path, { token, body } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = r.headers.get("content-type") || "";
  return { status: r.status, json: type.includes("json") ? await r.json() : null };
}

async function signedIn(key, path) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  opened.push(ctx);
  await ctx.addInitScript(({ token, user }) => {
    try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {}
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
  }, { token: U[key].token, user: U[key].user });
  const page = await ctx.newPage();
  await page.goto(`${FRONT}${path}`);
  return page;
}

async function signedOut(path) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  opened.push(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${FRONT}${path}`);
  return page;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nav = (page, label) => page.locator(".db-side").getByRole("button", { name: new RegExp("^" + esc(label) + "(\\s|$)") }).click();

/* ── the check ─────────────────────────────────────────────────────── */
/** What has focus, in words, for failure messages. */
const describeFocus = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return "nothing (body)";
  const label = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
  return label ? `the "${label.textContent.trim()}" field` : `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") || el.textContent.trim().slice(0, 30)}`;
});

/**
 * Click into each field and type its text one key at a time through the
 * keyboard. After every key, the field must still be the focused element.
 * Then every field must hold its starting value plus its own text, and
 * nothing else.
 */
async function typeEachField(page, scope, fields, formName) {
  const expected = [];
  for (const [label, text] of fields) {
    const field = scope.getByLabel(label, { exact: true });
    await field.click();
    await field.press("End");
    const start = await field.inputValue();
    let typed = "";
    for (const ch of text) {
      await page.keyboard.type(ch);
      typed += ch;
      const kept = await field.evaluate((el) => document.activeElement === el);
      if (!kept) assert.fail(`${formName} › ${label}: after typing "${typed}", focus moved to ${await describeFocus(page)}`);
    }
    expected.push([label, field, start + text]);
  }
  for (const [label, field, value] of expected) {
    assert.equal(await field.inputValue(), value, `${formName} › ${label} holds the wrong text`);
  }
}

/** Open a dialog from a trigger, type in it, close with Escape, check focus came back. */
async function dialogRoundTrip(page, trigger, title, fields) {
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: title });
  await dialog.waitFor();
  if (fields.length) await typeEachField(page, dialog, fields, title);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  const back = await trigger.evaluate((el) => document.activeElement === el);
  assert.ok(back, `${title}: on close, focus went to ${await describeFocus(page)} instead of the button that opened it`);
}

/* ── setup ─────────────────────────────────────────────────────────── */
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
async function book(key) {
  const r = await req("POST", "/bookings", { token: U[key].token, body: {
    testTypeIds: [D.test._id], appointmentDate: tomorrow(), appointmentTime: "09:00",
    address: "1 Example Street, Cardiff, CF10 1AA", addressParts: { line1: "1 Example Street", city: "Cardiff", postcode: "CF10 1AA" } } });
  assert.equal(r.status, 201, "booking for setup");
  return r.json.booking;
}

before(async () => {
  await db.connect();
  const make = async (key, role, phone) => {
    const password = db.strongPassword();
    const u = await db.createUser({ key, role, name: `E2E ${key}`, password, phone });
    const r = await req("POST", "/auth/login", { body: { email: u.email, password } });
    assert.equal(r.status, 200, `login for ${key}`);
    U[key] = { ...u, password, token: r.json.token, user: r.json.user };
  };
  await make("admin",   "admin",        "07700 900401");
  await make("mlt",     "mlt",          "07700 900402");
  await make("phleb",   "phlebotomist", "07700 900403");
  await make("patient", "user",         "07700 900404");

  const tests = (await req("GET", "/test-types")).json.testTypes;
  assert.ok(tests.length, "the dev database needs at least one active test type");
  D.test = tests[0];

  // A sample in "processing", so the lab can open "Upload report".
  const forLab = await book("patient");
  assert.equal((await req("PATCH", `/bookings/${forLab._id}/assign`, { token: U.admin.token, body: { phlebotomistId: U.phleb.user._id } })).status, 200);
  const s = await req("POST", "/samples", { token: U.phleb.token, body: { bookingId: forLab._id } });
  assert.equal(s.status, 201);
  for (const status of ["received", "processing"]) {
    assert.equal((await req("PATCH", `/samples/${s.json.sample._id}/status`, { token: U.mlt.token, body: { status } })).status, 200);
  }
  // A pending booking the patient can cancel.
  D.pending = await book("patient");
  // A plan, for "Edit plan" and the patient's subscribe form.
  const p = await req("POST", "/plans", { token: U.admin.token, body: {
    name: db.planName("Forms"), description: "E2E plan", testTypeIds: [D.test._id], visitsPerCycle: 1, cycleLengthDays: 30, price: 10 } });
  assert.equal(p.status, 201, "plan for setup");
  D.plan = p.json.plan;

  browser = await chromium.launch();
});

after(async () => {
  try {
    for (const c of opened) await c.close().catch(() => {});
    await browser?.close();
    const removed = await db.cleanup();
    console.log(`cleanup: removed ${JSON.stringify(removed)}`);
  } finally { await db.disconnect(); }
});

/* ── admin ─────────────────────────────────────────────────────────── */
test("admin › Add a phlebotomist: every field keeps focus and its own text", async () => {
  const page = await signedIn("admin", "/admin");
  await nav(page, "Phlebotomists");
  await dialogRoundTrip(page, page.getByRole("button", { name: "Add phlebotomist" }), "Add a phlebotomist", [
    ["Full name", "Jo Lee"], ["Email", "jo.lee@example.com"], ["Phone", "07700 900999"],
    ["Temporary password", "Abc12345x"], ["Service area", "CF10"], ["Licence number", "LIC-123"],
  ]);
});

test("admin › Edit phlebotomist", async () => {
  const page = await signedIn("admin", "/admin");
  await nav(page, "Phlebotomists");
  const row = page.locator(".db-card, .db-row, tr").filter({ hasText: "E2E phleb" }).first();
  await dialogRoundTrip(page, row.getByRole("button", { name: "Edit" }), "Edit phlebotomist", [
    ["Full name", " Jr"], ["Phone", "1"], ["Service area", "CF11"], ["Licence number", "L-9"],
  ]);
});

test("admin › Add a test and Edit test (test catalogue)", async () => {
  const page = await signedIn("admin", "/admin");
  await nav(page, "Test catalogue");
  await dialogRoundTrip(page, page.getByRole("button", { name: "Add test", exact: true }), "Add a test", [
    ["Test name", "Vitamin D"], ["Code", "VITD"], ["Price (£)", "25.5"], ["Turnaround", "48h"], ["Preparation", "None needed"],
  ]);
  const row = page.getByRole("row").filter({ hasText: D.test.name }).first();
  await dialogRoundTrip(page, row.getByRole("button", { name: "Edit" }), "Edit test", [
    ["Test name", " x"], ["Price (£)", "1"], ["Turnaround", "h"], ["Preparation", " ok"],
  ]);
});

test("admin › Add a subscription plan and Edit plan", async () => {
  const page = await signedIn("admin", "/admin");
  await nav(page, "Plans");
  await dialogRoundTrip(page, page.getByRole("button", { name: "Add plan", exact: true }), "Add a subscription plan", [
    ["Plan name", "Quarterly"], ["Description (optional)", "Every three months"],
    ["Visits per cycle", "2"], ["Cycle length (days)", "90"], ["Price per cycle (£)", "45"],
  ]);
  const row = page.getByRole("row").filter({ hasText: D.plan.name }).first();
  await dialogRoundTrip(page, row.getByRole("button", { name: "Edit" }), "Edit plan", [
    ["Plan name", " v2"], ["Description (optional)", " more"], ["Visits per cycle", "1"], ["Cycle length (days)", "0"], ["Price per cycle (£)", "5"],
  ]);
});

/* ── lab ───────────────────────────────────────────────────────────── */
test("lab › Upload report: the comments box keeps focus", async () => {
  const page = await signedIn("mlt", "/mlt");
  const card = page.locator(".db-card").filter({ has: page.getByRole("button", { name: /Upload report|Replace report/ }) }).first();
  await dialogRoundTrip(page, card.getByRole("button", { name: /Upload report|Replace report/ }), "Upload report", [
    ["Comments for the patient (optional)", "Sample slightly haemolysed. Repeat if needed."],
  ]);
});

/* ── phlebotomist ──────────────────────────────────────────────────── */
test("phlebotomist › Profile form", async () => {
  const page = await signedIn("phleb", "/phlebotomist");
  await nav(page, "Profile");
  await typeEachField(page, page.locator("main"), [["Full name", " Smith"], ["Phone", "9"]], "Phlebotomist profile");
});

/* ── patient ───────────────────────────────────────────────────────── */
test("patient › Profile form", async () => {
  const page = await signedIn("patient", "/user");
  await nav(page, "Profile");
  await typeEachField(page, page.locator("main"), [
    ["Full name", " Smith"], ["Phone number", "9"], ["Age (optional)", "42"], ["Address", "2 Example Road, Cardiff"],
  ], "Patient profile");
});

test("patient › Cancel booking confirm: focus moves into it and comes back", async () => {
  const page = await signedIn("patient", "/user");
  await nav(page, "My bookings");
  const card = page.locator(".db-card").filter({ has: page.locator(`[data-booking="${D.pending.bookingId}"]`) });
  await dialogRoundTrip(page, card.getByRole("button", { name: "Cancel booking" }), "Cancel this booking?", []);
});

test("patient › Book a test: the address step", async () => {
  const page = await signedIn("patient", "/user");
  await nav(page, "Book a test");
  await page.locator(".db-option, .db-card").filter({ hasText: D.test.name }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Appointment date").fill(tomorrow());
  await page.getByRole("button", { name: "Continue" }).click();
  await typeEachField(page, page.locator("main"), [
    ["Address line 1", "12 Example Street"], ["Address line 2 (optional)", "Flat 3"], ["Town or city", "Cardiff"],
    ["County (optional)", "South Glamorgan"], ["Postcode", "CF10 1AA"], ["Notes for the phlebotomist (optional)", "Ring twice"],
  ], "Booking address");
});

test("patient › Subscribe form", async () => {
  const page = await signedIn("patient", "/user");
  await nav(page, "Subscriptions");
  const plan = page.locator(".db-card").filter({ hasText: D.plan.name }).first();
  await plan.getByRole("button", { name: "Subscribe" }).click();
  await typeEachField(page, plan, [["Home address", "3 Example Lane, Cardiff"], ["Postcode", "CF10 1AA"]], "Subscribe");
});

/* ── sign-in and register ──────────────────────────────────────────── */
test("sign-in form", async () => {
  const page = await signedOut("/login");
  await typeEachField(page, page, [["Email address", "someone@example.com"], ["Password", "Abc12345x"]], "Sign in");
});

test("register form", async () => {
  const page = await signedOut("/register");
  await typeEachField(page, page, [
    ["Full name", "Sam Ellis"], ["Email", "sam@example.com"], ["Phone", "07700 900998"],
    ["Password", "Abc12345x"], ["Confirm password", "Abc12345x"],
  ], "Register");
});
