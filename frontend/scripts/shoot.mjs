/**
 * Screenshots + a per-page health check at each breakpoint.
 *
 * Writes full-page PNGs to docs/screenshots/ and reports, for every page:
 *   - computed heading and body font (Phase 1 regression guard)
 *   - console errors and warnings
 *   - whether the ErrorBoundary appeared
 *   - whether the document scrolls horizontally (layout overflow)
 *
 *   node scripts/shoot.mjs [--phase phase2]
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const phaseArg = process.argv.indexOf("--phase");
const PHASE = phaseArg > -1 ? process.argv[phaseArg + 1] : "phase2";
const OUT = path.resolve("../docs/screenshots", PHASE + (process.argv.includes("--reduced") ? "-reduced" : ""));

const SIZES = [
  { w: 390,  h: 844,  tag: "390"  },
  { w: 768,  h: 1024, tag: "768"  },
  { w: 1440, h: 900,  tag: "1440" },
];

const PAGES = [
  ["/",         "landing"],
  ["/login",    "login"],
  // Same component as /login, but it opens on the register tab, so it is
  // a view of its own worth capturing.
  ["/register", "register"],
  ["/privacy",  "privacy"],
  ["/terms",    "terms"],
  ["/nonsense", "404"],
];

await mkdir(OUT, { recursive: true });
const REDUCED = process.argv.includes("--reduced");
const browser = await chromium.launch();
let problems = 0;

for (const { w, h, tag } of SIZES) {
  console.log(`\n═══ ${w}px`);
  for (const [route, name] of PAGES) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      reducedMotion: REDUCED ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    const msgs = [];
    page.on("console", (m) => {
      const t = m.type();
      if (t === "error" || t === "warning") msgs.push(`[${t}] ${m.text().slice(0, 150)}`);
    });
    page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message.slice(0, 150)}`));

    // The notice records its dismissal in localStorage, so set that up
    // front. It is fixed-position and would otherwise sit over the hero
    // in every full-page capture.
    await page.addInitScript(() => {
      try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {}
    });

    await page.goto(BASE + route, { waitUntil: "networkidle" }).catch((e) =>
      msgs.push(`[nav] ${e.message}`)
    );
    /*
     * Scroll the whole page at a human-ish pace so every scroll reveal
     * fires and lazy images load, then return to the top and let things
     * settle. Scrolling too fast skips reveals and produces a screenshot
     * full of invisible sections — which is exactly what happened the
     * first time this script ran.
     */
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      // scrollHeight is re-read every step on purpose: lazy images load
      // as we descend and the document grows, so a height captured once
      // at the top stops the loop short of the real bottom and leaves
      // the last sections never scrolled into view.
      const step = Math.round(window.innerHeight * 0.7);
      let y = 0;
      let guard = 0;
      while (y < document.body.scrollHeight - window.innerHeight && guard < 120) {
        y += step;
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 190));
        guard++;
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);

    const info = await page.evaluate(() => {
      const heading = document.querySelector("h1, h2, h3");
      return {
        heading: heading ? getComputedStyle(heading).fontFamily : "(none)",
        body: getComputedStyle(document.body).fontFamily,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });

    /*
     * Guard against the failure this script originally missed: content
     * present in the DOM but stuck at opacity 0.
     *
     * Polled rather than sampled once. A single reading right after a
     * scroll catches reveals mid-transition and reports phantom
     * failures; only content still hidden after repeated checks is a
     * real problem.
     */
    const countHidden = () => page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll("section, header, .card, .role, .flow-item, .step, .faq, .cta")) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.height > 20 && Number(cs.opacity) < 0.05) n++;
        const pe = el.parentElement;
        if (pe && r.height > 20 && Number(getComputedStyle(pe).opacity) < 0.05) n++;
      }
      return n;
    });

    let hidden = await countHidden();
    for (let i = 0; i < 6 && hidden > 0; i++) {
      await page.waitForTimeout(400);
      hidden = await countHidden();
    }

    const crashed = await page.getByText("This page could not be displayed").count().catch(() => 0);
    const file = path.join(OUT, `${name}-${tag}.png`);
    await page.screenshot({ path: file, fullPage: true });

    const fontOK = info.heading.includes("Archivo") || info.heading === "(none)";
    const bodyOK = info.body.includes("Inter");
    if (crashed || msgs.length || !fontOK || !bodyOK || info.overflow || hidden) problems++;

    const flags = [
      crashed ? "CRASHED" : null,
      !fontOK ? `heading font = ${info.heading.slice(0, 30)}` : null,
      !bodyOK ? `body font = ${info.body.slice(0, 30)}` : null,
      info.overflow ? `H-OVERFLOW ${info.scrollW}>${info.clientW}` : null,
      hidden ? `${hidden} element(s) STUCK AT OPACITY 0` : null,
      msgs.length ? `${msgs.length} console` : null,
    ].filter(Boolean);

    console.log(`  ${name.padEnd(9)} ${flags.length ? flags.join(" | ") : "ok"}`);
    msgs.forEach((m) => console.log(`      ${m}`));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n═══ ${problems} problem(s). Screenshots in docs/screenshots/${PHASE}/`);
