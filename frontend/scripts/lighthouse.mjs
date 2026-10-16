/**
 * Lighthouse against a PRODUCTION build — never the Vite dev server.
 *
 *   npm run build
 *   npx vite preview --port 4173 --strictPort
 *   node scripts/lighthouse.mjs                      # mobile (Lighthouse default)
 *   node scripts/lighthouse.mjs --preset=desktop
 *
 * BASE_URL defaults to http://localhost:4173. The script fetches the page
 * first and refuses to run if it looks like the dev server: dev HTML
 * injects /@vite/client and loads /src/main.jsx, a build has neither.
 * Dev-server scores are meaningless (unminified, unbundled, HMR socket).
 *
 * Uses Playwright's Chromium so no separate Chrome install is needed.
 * Reports land in OUT_DIR (default: ../docs/lighthouse/, gitignored).
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE    = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
const OUT     = process.env.OUT_DIR || path.resolve("../docs/lighthouse");
const PAGES   = (process.env.PAGES || "/,/login,/register").split(",");
const LABEL   = process.env.LABEL || "run";
const preset  = process.argv.find((a) => a.startsWith("--preset="))?.split("=")[1] || "mobile";
const LH      = "lighthouse@13.5.0";

const html = await fetch(BASE + "/").then((r) => r.text()).catch((e) => {
  console.error(`Cannot reach ${BASE}: ${e.message}`);
  process.exit(1);
});
if (html.includes("/@vite/client") || html.includes("/src/main.jsx")) {
  console.error(`${BASE} is the Vite dev server. Build and preview first:`);
  console.error("  npm run build && npx vite preview --port 4173 --strictPort");
  process.exit(1);
}
console.log(`${BASE} serves a production build (no /@vite/client, bundled assets).`);

await mkdir(OUT, { recursive: true });
const chrome = chromium.executablePath();
const rows = [];

for (const page of PAGES) {
  const slug = page === "/" ? "landing" : page.replace(/\W+/g, "");
  const file = path.join(OUT, `${LABEL}-${preset}-${slug}.json`);
  const args = [
    "--yes", LH, BASE + page,
    "--quiet", "--output=json", `--output-path=${file}`,
    `--chrome-path=${chrome}`,
    "--chrome-flags=--headless=new --no-sandbox",
    "--only-categories=performance,accessibility,best-practices,seo",
  ];
  if (preset === "desktop") args.push("--preset=desktop");
  // npx is a .cmd shim on Windows, so it needs a shell; quote anything
  // with a space (this repo and Chromium both live under a spaced path).
  const cmd = ["npx", ...args].map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(" ");
  const r = spawnSync(cmd, { stdio: ["ignore", "inherit", "inherit"], shell: true });
  if (r.status !== 0) { console.error(`Lighthouse failed on ${page}`); process.exitCode = 1; continue; }

  const lhr = JSON.parse(await readFile(file, "utf8"));
  const c = lhr.categories;
  const pct = (k) => Math.round(c[k].score * 100);
  rows.push({
    page,
    perf: pct("performance"), a11y: pct("accessibility"),
    bp: pct("best-practices"), seo: pct("seo"),
    lcp: lhr.audits["largest-contentful-paint"].displayValue,
    tbt: lhr.audits["total-blocking-time"].displayValue,
    cls: lhr.audits["cumulative-layout-shift"].displayValue,
  });
}

console.log(`\n${LABEL} · ${preset}`);
console.table(rows);
