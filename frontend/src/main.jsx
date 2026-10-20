import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppShell from "./AppShell";
import "./index.css";

/*
 * Opt in to the two v7 behaviours React Router already warns about on
 * every page load. Both are safe here: the only splat route
 * ("*" -> NotFound) renders no nested relative links.
 */
const app = (
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);

/*
 * The production build pre-renders the landing page into #root
 * (scripts/prerender.mjs). index.html empties #root again on any other
 * route, and for a signed-in visitor (who is redirected away from "/"),
 * so an element child here means "this is the landing page's own HTML":
 * hydrate it in place instead of replacing it. Replacing would restart
 * the hero's CSS intro and repaint the LCP element.
 *
 * firstElementChild, not hasChildNodes: the unbuilt index.html (Vite
 * dev server) holds a comment marker there.
 */
const root = document.getElementById("root");
if (root.firstElementChild) {
  ReactDOM.hydrateRoot(root, app);
} else {
  ReactDOM.createRoot(root).render(app);
}
