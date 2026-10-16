/**
 * Pre-render the landing page into dist/index.html.
 *
 * Runs after `vite build` (client) and `vite build --ssr` (server entry),
 * as the last step of `npm run build`. The hero headline and photo then
 * arrive in the HTML and paint before any JavaScript runs; main.jsx
 * hydrates that markup instead of replacing it.
 *
 * Only "/" is pre-rendered. Vercel (vercel.json) and `vite preview` both
 * serve this same index.html for every route; an inline script in it
 * empties #root before first paint on any other route, and for a
 * signed-in visitor, so they never see the landing page flash.
 */
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dist = path.resolve("dist");
const ssr  = path.resolve("dist-ssr");
const MARK = "<!--app-html-->";

const { render } = await import(pathToFileURL(path.join(ssr, "entry-server.js")).href);
const html = await render("/");

const file = path.join(dist, "index.html");
const tpl  = await readFile(file, "utf8");
if (!tpl.includes(MARK)) throw new Error(`prerender: ${MARK} not found in dist/index.html`);
if (!html.includes('id="hero"')) throw new Error("prerender: rendered HTML has no hero; refusing to write it");

await writeFile(file, tpl.replace(MARK, html));
await rm(ssr, { recursive: true, force: true });   // server bundle is build-only
console.log(`prerender: / -> dist/index.html (${(html.length / 1024).toFixed(1)} kB of markup)`);
