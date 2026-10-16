import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    // Keep the build out of the test run.
    exclude: ["node_modules", "dist", "dist-ssr"],
  },
});
