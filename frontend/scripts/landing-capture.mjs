/**
 * Landing page capture: per-section screenshots, a full-page screenshot
 * taken after scrolling (so every reveal has fired), console errors, and
 * optionally a slow-scroll screen recording.
 *
 *   BASE_URL=http://localhost:4173 node scripts/landing-capture.mjs [--video] [--reduced]
 *
 * Point BASE_URL at a production preview, never the Vite dev server.
 * Writes to ../docs/screenshots/landing-v2[-reduced]/ (gitignored).
 */
import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const BASE    = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
const VIDEO   = process.argv.includes("--video");
const REDUCED = process.argv.includes("--reduced");
const OUT     = path.resolve("../docs/screenshots", "landing-v2" + (REDUCED ? "-reduced" : ""));
const SCROLL_MS = 25000;   // recording: ~1.5 s settle + 25 s scroll + 1 s hold

const SIZES = [
  { tag: "1440", width: 1440, height: 900, mobile: false },
  { tag: "390",  width: 390,  height: 844, mobile: true },
];
const SECTIONS = ["hero", "about", "features", "process", "band", "roles", "booking", "faq", "contact"];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let problems = 0;

/** Linear scroll top -> bottom over `ms`. */
const scrollThrough = (page, ms) => page.evaluate(async (ms) => {
  document.documentElement.style.scrollBehavior = "auto";
  const start = performance.now();
  await new Promise((done) => {
    const tick = (now) => {
      const t = Math.min((now - start) / ms, 1);
      scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * t));
      t < 1 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });
}, ms);

const contextFor = (s, extra = {}) => browser.newContext({
  viewport: { width: s.width, height: s.height },
  deviceScaleFactor: 1,
  isMobile: s.mobile, hasTouch: s.mobile,
  reducedMotion: REDUCED ? "reduce" : "no-preference",
  ...extra,
});
const dismissNotice = () => { try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {} };

/* Recordings: their own context, so the file holds only load + scroll. */
if (VIDEO) {
  for (const s of SIZES) {
    const ctx = await contextFor(s, { recordVideo: { dir: OUT, size: { width: s.width, height: s.height } } });
    await ctx.addInitScript(dismissNotice);
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);           // the hero intro plays on camera
    await scrollThrough(page, SCROLL_MS);
    await page.waitForTimeout(1000);
    const video = page.video();
    await ctx.close();
    await video.saveAs(path.join(OUT, `scroll-${s.tag}.webm`));
    await rm(await video.path(), { force: true }).catch(() => {});   // drop the random-named copy
    console.log(`recorded scroll-${s.tag}.webm`);
  }
}

for (const s of SIZES) {
  const ctx = await contextFor(s);
  await ctx.addInitScript(dismissNotice);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);   // let the hero intro finish

  // Scroll through once so every reveal fires before the checks.
  await scrollThrough(page, 6000);
  await page.waitForTimeout(1200);

  // Anything still invisible after the scroll is a bug.
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal], .lp-card, .lp-step, .lp-faq, .lp-cta, h1, h2")]
      .filter((el) => el.getBoundingClientRect().height > 10 && Number(getComputedStyle(el).opacity) < 0.05)
      .map((el) => el.className || el.tagName)
  );

  await page.screenshot({ path: path.join(OUT, `full-${s.tag}.png`), fullPage: true });

  // One viewport shot per section, scrolled to its top.
  for (const id of SECTIONS) {
    await page.evaluate((id) => {
      const el = id === "band" ? document.querySelector(".lp-band") : document.getElementById(id);
      if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - (id === "hero" ? 0 : 70));
    }, id);
    await page.waitForTimeout(id === "process" ? 900 : 700);
    await page.screenshot({ path: path.join(OUT, `${id}-${s.tag}.png`) });
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await ctx.close();

  const bad = errors.length + hidden.length + (overflow ? 1 : 0);
  problems += bad;
  console.log(`${s.tag}px: ${bad ? "PROBLEMS" : "ok"}` +
    (errors.length ? `\n  console: ${errors.join("\n  console: ")}` : "") +
    (hidden.length ? `\n  hidden: ${hidden.join(", ")}` : "") +
    (overflow ? "\n  horizontal overflow" : ""));
}

await browser.close();
console.log(`${problems} problem(s). Output in ${OUT}`);
process.exit(problems ? 1 : 0);
