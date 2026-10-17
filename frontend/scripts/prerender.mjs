/**
 * Pre-render the landing page into dist/index.html.
 *
 * Runs after `vite build` (client) and `vite build --ssr` (server entry),
 * as the last step of `npm run build`. The hero headline and photo then
 * arrive in the HTML and paint before any JavaScript runs; main.jsx
 * hydrates that markup instead of replacing it.
 *
 * Only "/" is pre-rendered. Every other route is served dist/app.html,
 * the same shell with an empty #root, so it never downloads the
 * landing's markup or its hero photo (vercel.json rewrites; vite.config
 * does the same for `vite preview`). As a second line of defence, an
 * inline script in index.html hides and empties #root on any other path,
 * and for a signed-in visitor, before first paint.
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

await writeFile(path.join(dist, "app.html"), tpl.replace(MARK, ""));
await writeFile(file, tpl.replace(MARK, html));
await rm(ssr, { recursive: true, force: true });   // server bundle is build-only
console.log(`prerender: / -> dist/index.html (${(html.length / 1024).toFixed(1)} kB of markup); other routes -> dist/app.html`);
