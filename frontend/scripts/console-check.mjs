/**
 * Visits each public route in a real browser and reports every console
 * message and page error.
 *
 * Not part of the build. Run against a served production build:
 *   npx vite preview --port 4173
 *   node scripts/console-check.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:4173";

const ROUTES = [
  ["/",         "landing"],
  ["/login",    "login"],
  ["/register", "register"],
  ["/privacy",  "privacy"],
  ["/terms",    "terms"],
  ["/nonsense", "404"],
];

const browser = await chromium.launch();
let totalErrors = 0;
let totalWarnings = 0;

for (const [path, label] of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const msgs = [];

  page.on("console", (m) => {
    const type = m.type();
    if (type === "error" || type === "warning") msgs.push({ type, text: m.text() });
  });
  page.on("pageerror", (e) => msgs.push({ type: "pageerror", text: e.message }));

  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch((e) =>
    msgs.push({ type: "pageerror", text: "navigation failed: " + e.message })
  );
  // Give lazy chunks and effects a moment to settle.
  await page.waitForTimeout(1200);

  // Did the ErrorBoundary catch anything?
  const boundary = await page
    .getByText("This page could not be displayed")
    .count()
    .catch(() => 0);

  const errors = msgs.filter((m) => m.type !== "warning");
  const warnings = msgs.filter((m) => m.type === "warning");
  totalErrors += errors.length + (boundary ? 1 : 0);
  totalWarnings += warnings.length;

  console.log(`\n── ${label}  (${path})`);
  console.log(`   ErrorBoundary visible: ${boundary ? "YES — PAGE CRASHED" : "no"}`);
  if (!msgs.length) console.log("   console: clean");
  for (const m of msgs) {
    console.log(`   [${m.type}] ${m.text.slice(0, 200)}`);
  }

  await page.close();
}

await browser.close();
console.log(`\n═══ totals: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
process.exit(totalErrors ? 1 : 0);
