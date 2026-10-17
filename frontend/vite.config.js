import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Mirror vercel.json under `vite preview`: the pre-rendered landing page
 * (dist/index.html) answers "/" and "/home"; every other page request
 * gets dist/app.html, the same shell with an empty #root. Without this,
 * preview would send the landing markup to /login and the Lighthouse
 * numbers measured locally would not match production.
 */
const previewRoutes = {
  name: "hv-preview-routes",
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = (req.url || "/").split("?")[0];
      const isPage = req.method === "GET" && (req.headers.accept || "").includes("text/html") && !/\.[a-z0-9]+$/i.test(url);
      if (isPage && url !== "/" && url !== "/home") req.url = "/app.html";
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), previewRoutes],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* calls to the backend during development
      "/api": {
        target:      "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target:      "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  // dist/.vite/manifest.json: scripts/prerender.mjs reads it to find
  // the landing chunk's CSS and JS.
  build: { manifest: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    // Keep the build out of the test run.
    exclude: ["node_modules", "dist", "dist-ssr"],
  },
});
