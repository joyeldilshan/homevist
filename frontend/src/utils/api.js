import axios from "axios";

// Base URL — points at your backend's /api prefix.
// Set VITE_API_URL in your frontend .env for production (e.g. your Render URL + /api)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request: attach JWT from localStorage ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 WITHOUT causing a reload loop ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Clear stale auth so App won't bounce us back to a dashboard
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Only redirect if we're NOT already on the login page.
      // This single guard is what stops the infinite reload loop.
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/" && path !== "/register") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;