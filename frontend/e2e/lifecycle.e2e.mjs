/**
 * End-to-end: the whole booking lifecycle across all four roles, in real
 * browsers, against a production build and a backend on hemovisit_dev.
 *
 *   1. backend:  EMAIL_USER= EMAIL_PASS= CLIENT_URL=http://localhost:4173 node server.js
 *                (check it logs "database: hemovisit_dev"; blank email = mock mode)
 *   2. frontend: npm run build && npx vite preview --port 4173 --strictPort
 *   3. here:     npm run test:e2e
 *
 * The register limiter allows 5 sign-ups per hour per IP, and every run
 * registers one patient through the form. Past five runs in an hour,
 * restart the backend (the limiter's store is in memory).
 *
 * Creates its own users and data (emails e2e-<run>-...@example.com) and
 * deletes them, and their uploaded files, at the end, pass or fail.
 * Passwords are generated per run and never printed; tokens never leave
 * the browser contexts or this process.
 *
 * Screenshots and the lifecycle recording go to docs/screenshots/phase4/
 * (gitignored).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { chromium } from "playwright";
import * as db from "./db.mjs";

const FRONT = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
const API   = (process.env.API_URL  || "http://localhost:5000/api").replace(/\/$/, "");
const OUT   = path.resolve("../docs/screenshots/phase4");
const LIVE  = 15000;   // how long a socket-driven change may take to show

const people = {};     // role -> { email, password, id?, name }
let browser;
const opened = [];

/* ── helpers ──────────────────────────────────────────────────────── */
async function context(size = { width: 1440, height: 900 }, extra = {}) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, ...extra });
  await ctx.addInitScript(() => { try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {} });
  opened.push(ctx);
  return ctx;
}

async function uiLogin(page, who) {
  await page.goto(`${FRONT}/login`);
  await page.getByLabel("Email address").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: /^Sign in/ }).click();
}

/** Signed-in context without the UI: token straight into sessionStorage. */
async function apiSession(who, size) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: who.email, password: who.password }),
  });
  assert.equal(r.status, 200, `API login for ${who.role} failed`);
  const body = await r.json();
  const ctx = await context(size);
  await ctx.addInitScript(({ token, user }) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
  }, { token: body.token, user: body.user });
  return { ctx, token: body.token, user: body.user };
}

// Nav buttons with a badge are named e.g. "Assign jobs 1 waiting", so match the label as a prefix.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const navName = (label) => new RegExp("^" + esc(label) + "(\\s|$)");
const nav = (page, label) => page.locator(".db-side").getByRole("button", { name: navName(label) }).click();
const card = (page, bookingId) => page.locator(".db-card").filter({ has: page.locator(`[data-booking="${bookingId}"]`) });
const pillOf = (page, bookingId) => card(page, bookingId).locator(".db-pill").first();

const tomorrow = () => { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10); };

/** A small but valid one-page PDF. */
function makePdf() {
  const file = path.join(os.tmpdir(), `hv-e2e-${db.RUN}.pdf`);
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const text = "BT /F1 18 Tf 72 760 Td (HemoVisit e2e test report - not a real result) Tj ET";
  objs[3] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(file, pdf);
  return file;
}

/* ── setup / teardown ─────────────────────────────────────────────── */
before(async () => {
  const dbName = await db.connect();
  console.log(`e2e run ${db.RUN} against database: ${dbName}`);
  fs.mkdirSync(OUT, { recursive: true });

  people.admin  = { role: "admin", name: "E2E Admin",       password: db.strongPassword() };
  people.mlt    = { role: "mlt",   name: "E2E Lab Tech",    password: db.strongPassword() };
  people.legacy = { role: "user",  name: "E2E Legacy User", password: db.legacyPassword() };
  // A patient with no bookings, for the empty-state screenshots.
  people.emptyPatient = { role: "user", name: "E2E Empty Patient", password: db.strongPassword() };
  const phones = { admin: "07700 900101", mlt: "07700 900102", legacy: "07700 900103", emptyPatient: "07700 900104" };
  for (const key of Object.keys(phones)) {
    const p = people[key];
    Object.assign(p, await db.createUser({ key, role: p.role, name: p.name, password: p.password, phone: phones[key] }));
  }

  people.patient = { role: "user", name: "E2E Patient", email: db.emailFor("patient"), password: db.strongPassword() };
  people.phleb   = { role: "phlebotomist", name: "E2E Phlebotomist", email: db.emailFor("phleb"), password: db.strongPassword() };

  browser = await chromium.launch();
});

after(async () => {
  for (const c of opened) await c.close().catch(() => {});
  await browser?.close().catch(() => {});
  try {
    const left = await db.counts();
    const removed = await db.cleanup();
    console.log(`cleanup: removed ${JSON.stringify(removed)} (had ${JSON.stringify(left)})`);
    assert.deepEqual(await db.counts(), { users: 0, bookings: 0, samples: 0, reports: 0 });
  } finally {
    await db.disconnect();
  }
});

/* ── the lifecycle ────────────────────────────────────────────────── */
let bookingId;

test("full booking lifecycle across patient, admin, phlebotomist and lab", { timeout: 240000 }, async (t) => {
  const adminCtx = await context();
  const admin = await adminCtx.newPage();
  const patientCtx = await context();
  const patient = await patientCtx.newPage();

  await t.test("admin signs in and waits on the overview", async () => {
    await uiLogin(admin, people.admin);
    await admin.waitForURL(`${FRONT}/admin`);
    await admin.getByRole("heading", { name: "Overview." }).waitFor();
  });

  await t.test("patient registers through the sign-up form", async () => {
    await patient.goto(`${FRONT}/register`);
    await patient.getByLabel("Full name").fill(people.patient.name);
    await patient.getByLabel("Email", { exact: true }).fill(people.patient.email);
    await patient.getByLabel("Phone").fill("07700 900105");
    await patient.getByLabel("Password", { exact: true }).fill(people.patient.password);
    await patient.getByLabel("Confirm password").fill(people.patient.password);
    await patient.getByRole("checkbox").check();
    await patient.getByRole("button", { name: /Create account/ }).click();
    await patient.waitForURL(`${FRONT}/user`);
    await patient.getByRole("heading", { name: /Hello/ }).waitFor();
  });

  await t.test("patient books a test (four steps)", async () => {
    await nav(patient, "Book a test");
    await patient.locator(".db-option").first().click();
    await patient.getByRole("button", { name: /^Continue/ }).click();
    await patient.getByLabel("Appointment date").fill(tomorrow());
    await patient.getByRole("button", { name: "Continue" }).click();
    await patient.getByLabel("Address line 1").fill("1 Example Street");
    await patient.getByLabel("Town or city").fill("Cardiff");
    await patient.getByLabel("Postcode").fill("CF10 1AA");
    await patient.getByText("We cover CF10 1AA").waitFor();
    await patient.getByRole("button", { name: "Continue" }).click();
    // Start watching the admin page before the booking exists: the live
    // toast only stays a few seconds.
    people.adminSawToast = admin.getByText(/^New booking BK/).waitFor({ timeout: LIVE }).then(() => true, () => false);
    await patient.getByRole("button", { name: /^Confirm 1 test/ }).click();
    await patient.getByRole("heading", { name: "My bookings." }).waitFor();
    bookingId = await patient.locator("[data-booking]").first().getAttribute("data-booking");
    assert.match(bookingId, /^BK/);
    assert.equal((await pillOf(patient, bookingId).textContent()).trim(), "Pending");
  });

  await t.test("real-time: the admin sees the new booking without reloading", async () => {
    assert.equal(await people.adminSawToast, true, "no live 'New booking' toast on the admin page");
    // And the overview's table refreshed itself with the new booking ID.
    await admin.locator(".db-table").getByText(bookingId).waitFor({ timeout: LIVE });
  });

  await t.test("admin adds a phlebotomist through the UI", async () => {
    await nav(admin, "Phlebotomists");
    await admin.getByRole("button", { name: "Add phlebotomist" }).click();
    const dlg = admin.getByRole("dialog", { name: "Add a phlebotomist" });
    await dlg.getByLabel("Full name").fill(people.phleb.name);
    await dlg.getByLabel("Email").fill(people.phleb.email);
    await dlg.getByLabel("Phone").fill("07700 900106");
    await dlg.getByLabel("Temporary password").fill(people.phleb.password);
    await dlg.getByLabel("Service area").fill("CF10");
    await dlg.getByRole("button", { name: "Create account" }).click();
    await admin.getByText("Phlebotomist account created.").waitFor();
    await dlg.waitFor({ state: "detached" });
  });

  await t.test("admin assigns the booking; the patient's page updates live", async () => {
    await nav(admin, "Assign jobs");
    await card(admin, bookingId).getByRole("button", { name: "Assign phlebotomist" }).click();
    const dlg = admin.getByRole("dialog", { name: "Assign a phlebotomist" });
    await dlg.getByRole("listitem").filter({ hasText: people.phleb.name }).click();
    await admin.getByText("Phlebotomist assigned.").waitFor();
    // No reload on the patient side: this is the socket.
    await assert.doesNotReject(pillOf(patient, bookingId).filter({ hasText: "Confirmed" }).waitFor({ timeout: LIVE }));
  });

  const phlebCtx = await context();
  const phleb = await phlebCtx.newPage();

  await t.test("phlebotomist signs in, goes online, and the toggle is saved", async () => {
    await uiLogin(phleb, people.phleb);
    await phleb.waitForURL(`${FRONT}/phlebotomist`);
    const sw = phleb.locator(".db-side").getByRole("switch", { name: /Available for visits/ });
    await sw.click();
    await phleb.getByText("You are now available for visits.").waitFor();
    assert.equal(await sw.getAttribute("aria-checked"), "true");
    // Saved on the server, not just in the page (it used to be dropped).
    const me = await phleb.evaluate(async (api) => {
      const r = await fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
      return (await r.json()).user?.isAvailable;
    }, API);
    assert.equal(me, true);
  });

  await t.test("phlebotomist collects the sample; the patient sees it live", async () => {
    await card(phleb, bookingId).getByRole("button", { name: /send to lab/ }).click();
    await assert.doesNotReject(pillOf(patient, bookingId).filter({ hasText: "Sample collected" }).waitFor({ timeout: LIVE }));
  });

  const mltCtx = await context();
  const mlt = await mltCtx.newPage();
  const sampleCard = () => mlt.locator(".db-card").filter({ hasText: `Booking ${bookingId}` });

  await t.test("lab receives the sample and starts processing; the patient sees Processing", async () => {
    await uiLogin(mlt, people.mlt);
    await mlt.waitForURL(`${FRONT}/mlt`);
    await sampleCard().getByRole("button", { name: "Mark received" }).click();
    await mlt.getByText("Sample marked received.").waitFor();
    await sampleCard().getByRole("button", { name: "Start processing" }).click();
    await mlt.getByText("Processing started.").waitFor();
    await assert.doesNotReject(pillOf(patient, bookingId).filter({ hasText: "Processing" }).waitFor({ timeout: LIVE }));
  });

  await t.test("lab uploads the PDF and sends it; the patient sees Report ready", async () => {
    const pdf = makePdf();
    await sampleCard().getByRole("button", { name: "Upload report" }).click();
    const dlg = mlt.getByRole("dialog", { name: "Upload report" });
    await dlg.locator('input[type="file"]').setInputFiles(pdf);
    await dlg.getByLabel(/Comments for the patient/).fill("End-to-end test report. Not a real result.");
    await dlg.getByRole("button", { name: "Upload report" }).click();
    await mlt.getByText(/Report uploaded/).waitFor();
    await sampleCard().getByRole("button", { name: "Send report to patient" }).click();
    await mlt.getByRole("dialog", { name: "Send report to patient?" }).getByRole("button", { name: "Send report" }).click();
    await mlt.getByText("Report sent to the patient.").waitFor();
    fs.rmSync(pdf, { force: true });
    await assert.doesNotReject(pillOf(patient, bookingId).filter({ hasText: "Report ready" }).waitFor({ timeout: LIVE }));
  });

  await t.test("patient finds the report and downloads it", async () => {
    await nav(patient, "My reports");
    const rep = patient.locator(".db-card").filter({ hasText: `Booking ${bookingId}` });
    await rep.waitFor();
    // Reports are private: the button fetches the PDF with the patient's
    // token and hands the browser a file to save.
    const [download] = await Promise.all([
      patient.waitForEvent("download"),
      rep.getByRole("button", { name: "Download report" }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^Report_RPT[A-Z0-9]+\.pdf$/);
    const bytes = fs.readFileSync(await download.path());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");

    // The file route refuses anyone not signed in, and the old public
    // folder no longer serves anything.
    const reportId = await patient.evaluate(async (api) => {
      const r = await fetch(`${api}/reports`, { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
      return (await r.json()).reports[0]._id;
    }, API);
    people.reportId = reportId;
    assert.equal((await fetch(`${API}/reports/${reportId}/file`)).status, 401);
    const origin = new URL(API).origin;
    assert.equal((await fetch(`${origin}/uploads/reports/x.pdf`)).status, 404);
  });

  await t.test("the report email's link: signed out, sign in, land on My reports", async () => {
    // The email carries no PDF, only a link to /user?tab=reports.
    const page = await (await context()).newPage();
    await page.goto(`${FRONT}/user?tab=reports`);
    await page.waitForURL(`${FRONT}/login`);
    await page.getByLabel("Email address").fill(people.patient.email);
    await page.getByLabel("Password", { exact: true }).fill(people.patient.password);
    await page.getByRole("button", { name: /^Sign in/ }).click();
    await page.waitForURL(`${FRONT}/user?tab=reports`);
    await page.locator(".db-card").filter({ hasText: `Booking ${bookingId}` }).getByRole("button", { name: "Download report" }).waitFor();
  });

});

/* ── access and session checks ────────────────────────────────────── */
test("a wrong password is rejected and stays on the sign-in page", async () => {
  const page = await (await context()).newPage();
  await uiLogin(page, { ...people.patient, password: `${people.patient.password}x` });
  await page.getByText("Invalid email or password.").waitFor();
  assert.equal(new URL(page.url()).pathname, "/login");
});

test("a patient cannot reach admin pages or admin API routes", async () => {
  const { ctx, token } = await apiSession(people.patient);
  const page = await ctx.newPage();
  await page.goto(`${FRONT}/admin`);
  await page.waitForURL(`${FRONT}/user`);
  assert.equal(await page.getByRole("heading", { name: "Overview." }).count(), 0);
  const r = await fetch(`${API}/phlebotomists`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(r.status, 403);
});

test("an account with a short pre-2026 password can still sign in", async () => {
  assert.ok(people.legacy.password.length < 8, "legacy password must be under the new minimum");
  const page = await (await context()).newPage();
  await uiLogin(page, people.legacy);
  await page.waitForURL(`${FRONT}/user`);
  await page.getByRole("heading", { name: /Hello/ }).waitFor();
});

test("an unknown route shows the 404 page", async () => {
  const page = await (await context()).newPage();
  await page.goto(`${FRONT}/no-such-page-${db.RUN}`);
  await page.getByText(/couldn.t find that page/i).waitFor();
});

test("an expired session goes back to sign-in", async () => {
  const ctx = await context();
  const token = db.expiredTokenFor(people.legacy.id);
  await ctx.addInitScript(({ token, user }) => {
    if (sessionStorage.getItem("e2e-seeded")) return;   // only on the first load
    sessionStorage.setItem("e2e-seeded", "1");
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
  }, { token, user: { _id: people.legacy.id, name: people.legacy.name, email: people.legacy.email, role: "user" } });
  const page = await ctx.newPage();
  await page.goto(`${FRONT}/user`);
  await page.waitForURL(`${FRONT}/login`, { timeout: LIVE });
  assert.equal(await page.evaluate(() => sessionStorage.getItem("token")), null);
});

test("keyboard: skip link, navigation, and a modal that traps and returns focus", async () => {
  const { ctx } = await apiSession(people.admin);
  const page = await ctx.newPage();
  await page.goto(`${FRONT}/admin`);
  await page.getByRole("heading", { name: "Overview." }).waitFor();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Skip to content");

  const catalogue = page.locator(".db-side").getByRole("button", { name: navName("Test catalogue") });
  await catalogue.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Test catalogue." }).waitFor();

  const add = page.getByRole("button", { name: "Add test" });
  await add.focus();
  await page.keyboard.press("Enter");
  const dlg = page.getByRole("dialog", { name: "Add a test" });
  await dlg.waitFor();
  assert.equal(await dlg.evaluate((d) => d.contains(document.activeElement)), true, "focus moves into the dialog");
  for (let i = 0; i < 25; i++) await page.keyboard.press("Tab");
  assert.equal(await dlg.evaluate((d) => d.contains(document.activeElement)), true, "Tab stays inside the dialog");
  await page.keyboard.press("Escape");
  await dlg.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Add test", "focus returns to the opener");
  await ctx.close();
});

/* ── screenshots: every dashboard tab, 1440 and 390, populated + empty ─ */
const TABS = {
  patient: ["Home", "Book a test", "My bookings", "My reports", "Subscriptions", "Profile"],
  admin:   ["Overview", "All bookings", "Assign jobs", "Test catalogue", "Plans", "Subscriptions", "Phlebotomists", "Analytics", "Email & audit"],
  phleb:   ["Today", "My jobs", "History", "Profile"],
  mlt:     ["Incoming samples", "Reports", "Completed"],
};
const ROLE_PATH = { patient: "/user", admin: "/admin", phleb: "/phlebotomist", mlt: "/mlt" };

async function shootDashboard(key, who, size, tag, label = "") {
  const { ctx } = await apiSession(who, size);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await page.goto(`${FRONT}${ROLE_PATH[key]}`);
  await page.locator(".db-main h1").first().waitFor();
  const overflow = [];
  for (const tab of TABS[key]) {
    if (size.width >= 860) {
      await page.locator(".db-side").getByRole("button", { name: navName(tab) }).click();
    } else {
      const bottom = page.locator(".db-bottom").getByRole("button", { name: navName(tab) });
      if (await bottom.count()) await bottom.click();
      else {
        await page.locator(".db-bottom").getByRole("button", { name: "More" }).click();
        await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: navName(tab) }).click();
      }
    }
    await page.waitForTimeout(900);   // page transition, count-ups, skeleton -> data
    const name = `${key}${label}-${tab.toLowerCase().replace(/[^a-z]+/g, "-")}-${tag}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) overflow.push(tab);
  }
  // Touch targets on phones: every visible button/link at least 44px tall.
  let small = [];
  if (size.width < 860) {
    small = await page.evaluate(() => [...document.querySelectorAll(".db button, .db a")]
      .filter((el) => el.offsetParent && !el.closest(".db-side"))
      .map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) }))
      .filter((x) => x.h > 0 && x.h < 44));
  }
  await ctx.close();
  return { errors, overflow, small };
}

test("screenshots: every dashboard tab at 1440 and 390, populated and empty", { timeout: 300000 }, async () => {
  const problems = [];
  const who = { patient: people.patient, admin: people.admin, phleb: people.phleb, mlt: people.mlt };
  for (const [size, tag] of [[{ width: 1440, height: 900 }, "1440"], [{ width: 390, height: 844 }, "390"]]) {
    for (const key of Object.keys(TABS)) {
      const r = await shootDashboard(key, who[key], size, tag);
      if (r.errors.length) problems.push(`${key}@${tag} console: ${r.errors.join(" | ")}`);
      if (r.overflow.length) problems.push(`${key}@${tag} horizontal scroll on: ${r.overflow.join(", ")}`);
      if (r.small.length) problems.push(`${key}@${tag} targets under 44px: ${JSON.stringify(r.small.slice(0, 6))}`);
    }
    // Empty state: a patient with no bookings.
    {
      const r = await shootDashboard("patient", people.emptyPatient, size, tag, "-empty");
      if (r.errors.length) problems.push(`patient-empty@${tag} console: ${r.errors.join(" | ")}`);
    }
  }
  assert.deepEqual(problems, []);
});

/* ── recording: the lifecycle as the patient sees it, ~30 s ─────────── */
test("record a 30-second lifecycle from the patient's live bookings page", { timeout: 120000 }, async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const login = async (who) => (await (await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: who.email, password: who.password }),
  })).json()).token;
  const call = async (token, method, url, body) => {
    const r = await fetch(`${API}${url}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    assert.ok(r.ok, `${method} ${url} -> ${r.status}`);
    return r.json();
  };
  const [adminT, phlebT, mltT] = [await login(people.admin), await login(people.phleb), await login(people.mlt)];

  const { token: patT, user: patU } = await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: people.patient.email, password: people.patient.password }) })).json();
  const tests = (await (await fetch(`${API}/test-types`)).json()).testTypes;
  const created = await call(patT, "POST", "/bookings", {
    testTypeIds: [tests[0]._id], appointmentDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), appointmentTime: "10:30",
    address: "1 Example Street, Cardiff, CF10 1AA", addressParts: { line1: "1 Example Street", city: "Cardiff", postcode: "CF10 1AA" },
  });
  const b = created.booking;

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
  await ctx.addInitScript(({ t, u }) => { sessionStorage.setItem("token", t); sessionStorage.setItem("user", JSON.stringify(u)); localStorage.setItem("hv-storage-notice-dismissed", "1"); }, { t: patT, u: patU });
  const page = await ctx.newPage();
  await page.goto(`${FRONT}/user`);
  await nav(page, "My bookings");
  await card(page, b.bookingId).waitFor();
  await card(page, b.bookingId).getByRole("button", { name: "Track progress" }).click();
  await pause(3000);

  const phlebId = (await call(phlebT, "GET", "/auth/me")).user._id;
  await call(adminT, "PATCH", `/bookings/${b._id}/assign`, { phlebotomistId: phlebId });
  await pause(4500);
  await call(phlebT, "POST", "/samples", { bookingId: b._id });
  await pause(4500);
  const sample = (await call(mltT, "GET", "/samples")).samples.find((s) => s.booking?.bookingId === b.bookingId);
  await call(mltT, "PATCH", `/samples/${sample._id}/status`, { status: "received" });
  await pause(2500);
  await call(mltT, "PATCH", `/samples/${sample._id}/status`, { status: "processing" });
  await pause(4500);
  const pdf = makePdf();
  const fd = new FormData();
  fd.append("report", new Blob([fs.readFileSync(pdf)], { type: "application/pdf" }), "report.pdf");
  fd.append("sampleId", sample._id);
  fd.append("labComments", "End-to-end test report. Not a real result.");
  const up = await fetch(`${API}/reports`, { method: "POST", headers: { Authorization: `Bearer ${mltT}` }, body: fd });
  assert.ok(up.ok, `upload -> ${up.status}`);
  fs.rmSync(pdf, { force: true });
  const report = (await up.json()).report;
  await call(mltT, "PATCH", `/reports/${report._id}/send`);
  await pillOf(page, b.bookingId).filter({ hasText: "Report ready" }).waitFor({ timeout: LIVE });
  await pause(3500);

  const video = page.video();
  await ctx.close();
  await video.saveAs(path.join(OUT, "lifecycle-patient-1280.webm"));
  await fs.promises.rm(await video.path(), { force: true });
});
