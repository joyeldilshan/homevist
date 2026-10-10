const helmet = require("helmet");

/**
 * Security headers.
 *
 * Tuned for this specific deployment — the defaults break three things
 * here, so each deviation is deliberate and explained:
 *
 * 1. Socket.io. The websocket upgrade is not an HTTP fetch, but the
 *    polling fallback is, and connect-src governs both. CLIENT_URL plus
 *    ws:/wss: must be allowed or real-time booking updates silently die
 *    and fall back to nothing.
 *
 * 2. Google Fonts. The frontend loads the stylesheet from
 *    fonts.googleapis.com and the font files from fonts.gstatic.com.
 *    Both need to be allowed in style-src and font-src.
 *
 * 3. The Vercel frontend origin. crossOriginResourcePolicy defaults to
 *    "same-origin", which would block the Vercel app from reading the
 *    PDF reports served from /uploads. Set to "cross-origin".
 *
 * Note that the CSP here protects responses served BY THIS BACKEND
 * (the /uploads static files and JSON). The React app is served by
 * Vercel and gets its own headers from there — this is not a substitute
 * for configuring Vercel.
 */

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        // Socket.io: polling transport is an XHR to the API origin, and
        // the websocket upgrade needs the ws:/wss: schemes explicitly.
        connectSrc: ["'self'", CLIENT, "ws:", "wss:"],
        styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc:     ["'self'", "data:", "blob:"],
        scriptSrc:  ["'self'"],
        objectSrc:  ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },

    // Let the Vercel-hosted frontend read PDFs from /uploads.
    crossOriginResourcePolicy: { policy: "cross-origin" },

    // COEP would block those same cross-origin reads. Off on purpose.
    crossOriginEmbedderPolicy: false,

    // HSTS only makes sense once served over HTTPS.
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 15552000, includeSubDomains: true }
      : false,

    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

module.exports = { securityHeaders };
