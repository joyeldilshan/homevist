/**
 * Signs in as each role and visits every route that role can reach,
 * reporting console output and whether the ErrorBoundary appeared.
 *
 * Not part of the build. Requires the app running against a DEV database:
 *   node scripts/dashboard-sweep.mjs
 *
 * The password comes from SWEEP_PASSWORD so no credential is written here.
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const PASSWORD = process.env.SWEEP_PASSWORD;

if (!PASSWORD) {
  console.error("Set SWEEP_PASSWORD to the seeded dev password.");
  process.exit(1);
}

const ROLES = [
  { label: "admin",        email: "admin@example.com",          home: "/admin" },
  { label: "patient",      email: "patient@example.com",        home: "/user" },
  { label: "phlebotomist", email: "phlebotomist1@example.com",  home: "/phlebotomist" },
  { label: "lab (MLT)",    email: "lab@example.com",            home: "/mlt" },
];

// Routes every signed-in user should be able to open.
const SHARED = ["/privacy", "/terms", "/nonsense"];

const browser = await chromium.launch();
let problems = 0;

for (const role of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const msgs = [];

  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") msgs.push({ t, text: m.text() });
  });
  page.on("pageerror", (e) => msgs.push({ t: "pageerror", text: e.message }));

  console.log(`\n═══ ${role.label}`);

  // Sign in through the real form — no auth shortcut.
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', role.email);
  await page.fill('#login-password', PASSWORD);
  await page.click('button.cta[type="submit"]');

  try {
    await page.waitForURL(`**${role.home}`, { timeout: 20000 });
    console.log(`   signed in -> ${role.home}`);
  } catch {
    console.log(`   SIGN-IN FAILED (still at ${new URL(page.url()).pathname})`);
    problems++;
    const t = await page.locator("body").innerText().catch(() => "");
    console.log("   page says:", t.replace(/\s+/g, " ").slice(0, 160));
    await ctx.close();
    continue;
  }

  // Walk the dashboard's own tabs, then the shared routes.
  const routes = [role.home, ...SHARED];
  for (const r of routes) {
    msgs.length = 0;
    await page.goto(BASE + r, { waitUntil: "networkidle" }).catch((e) =>
      msgs.push({ t: "pageerror", text: "nav failed: " + e.message })
    );
    await page.waitForTimeout(1400);

    const crashed = await page.getByText("This page could not be displayed").count().catch(() => 0);
    const errs = msgs.filter((m) => m.t !== "warning");
    const warns = msgs.filter((m) => m.t === "warning");
    if (crashed || errs.length) problems++;

    const status = crashed ? "CRASHED" : errs.length ? `${errs.length} error` : warns.length ? `${warns.length} warn` : "clean";
    console.log(`   ${r.padEnd(16)} ${status}`);
    for (const m of msgs) console.log(`      [${m.t}] ${m.text.slice(0, 160)}`);
  }

  // Click through every sidebar tab on the dashboard.
  await page.goto(BASE + role.home, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tabs = await page.locator(".side-tab, .tab, nav button").all().catch(() => []);
  let tabIssues = 0;
  for (let i = 0; i < Math.min(tabs.length, 10); i++) {
    msgs.length = 0;
    await tabs[i].click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    const crashed = await page.getByText("This page could not be displayed").count().catch(() => 0);
    const errs = msgs.filter((m) => m.t !== "warning");
    if (crashed || errs.length) {
      tabIssues++; problems++;
      console.log(`   tab ${i}: ${crashed ? "CRASHED" : errs[0]?.text.slice(0, 120)}`);
    }
  }
  console.log(`   ${tabs.length} tab(s) clicked, ${tabIssues} with problems`);

  await ctx.close();
}

await browser.close();
console.log(`\n═══ total problems: ${problems}`);
process.exit(problems ? 1 : 0);
