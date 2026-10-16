/**
 * Smoke test for the pre-rendered build: every public route loads with
 * no console errors (hydration mismatches surface as console errors),
 * the landing hydrates its HTML instead of replacing it, and no other
 * route ever paints the landing page.
 *
 *   BASE_URL=http://localhost:4173 node scripts/smoke-routes.mjs
 *
 * Run against `npm run build` + `vite preview`, never the dev server.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
const ROUTES = ["/", "/home", "/login", "/register", "/privacy", "/terms", "/no-such-page"];

const browser = await chromium.launch();
let failures = 0;

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("hv-storage-notice-dismissed", "1"); } catch {}
    // Record whether the landing hero was ever in the DOM while #root
    // was visible. On other routes it is parsed (index.html carries it)
    // but must stay under data-noshell (visibility: hidden) until it is
    // removed, so it can never paint.
    new MutationObserver(() => {
      if (document.getElementById("hero") && !document.documentElement.hasAttribute("data-noshell")) {
        window.__sawHero = true;
      }
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 220)));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 220)}`));

  // Tag the server-rendered hero <h1> before any script runs, then check
  // the same node is still there after hydration (hydrate keeps nodes;
  // a client re-render would replace them).
  if (route === "/" || route === "/home") {
    await ctx.addInitScript(() => {
      document.addEventListener("readystatechange", () => {
        const h = document.querySelector("#hero h1");
        if (h && !h.dataset.ssr) h.dataset.ssr = "1";
      }, { once: true });
    });
  }

  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => ({
    sawHero: !!window.__sawHero,
    keptSsrNode: document.querySelector("#hero h1")?.dataset.ssr === "1",
    title: document.querySelector("h1, h2")?.textContent.trim().slice(0, 40) || "(none)",
  }));

  const landing = route === "/" || route === "/home";
  const problems = [...errors];
  if (landing && !state.keptSsrNode) problems.push("hero was re-rendered, not hydrated");
  if (!landing && state.sawHero) problems.push("landing markup appeared on a non-landing route");

  failures += problems.length;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${route.padEnd(14)} ${state.title}` +
    (problems.length ? "\n       " + problems.join("\n       ") : ""));
  await ctx.close();
}

/* A signed-in visitor on "/" is redirected to their dashboard; the
   pre-rendered landing must not flash first. Session values are fake and
   no API call is needed for the redirect itself. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("token", "smoke-test");
      sessionStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Smoke", role: "user" }));
      localStorage.setItem("hv-storage-notice-dismissed", "1");
    } catch {}
    new MutationObserver(() => {
      if (document.getElementById("hero") && !document.documentElement.hasAttribute("data-noshell")) window.__sawHero = true;
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const sawHero = await page.evaluate(() => !!window.__sawHero);
  const url = new URL(page.url()).pathname;
  const problems = [...pageErrors];
  if (sawHero) problems.push("landing flashed for a signed-in visitor");
  if (url !== "/user") problems.push(`expected redirect to /user, got ${url}`);
  failures += problems.length;
  console.log(`${problems.length ? "FAIL" : "ok  "} / (signed in)  -> ${url}` +
    (problems.length ? "\n       " + problems.join("\n       ") : ""));
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} problem(s)` : "all routes clean");
process.exit(failures ? 1 : 0);
