import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Writable } from "node:stream";
import AppShell from "./AppShell";

/**
 * Build-time render of one URL to an HTML string. Used only by
 * scripts/prerender.mjs; never shipped to the browser.
 *
 * onAllReady waits for every Suspense boundary to settle, so the output
 * is complete HTML with no streaming scripts. (The landing's
 * below-the-fold chunk is mounted only after hydration, by design; see
 * pages/Home.jsx.) Must render the same tree as main.jsx, or hydration
 * fails.
 */
export function render(url) {
  return new Promise((resolve, reject) => {
    let html = "";
    const { pipe } = renderToPipeableStream(
      <React.StrictMode>
        <StaticRouter location={url}>
          <AppShell />
        </StaticRouter>
      </React.StrictMode>,
      {
        onAllReady() {
          pipe(new Writable({
            write(chunk, _enc, cb) { html += chunk; cb(); },
            final(cb) { resolve(html); cb(); },
          }));
        },
        onShellError: reject,
        onError: reject,
      }
    );
  });
}
