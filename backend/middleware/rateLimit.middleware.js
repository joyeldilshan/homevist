const rateLimit = require("express-rate-limit");

/**
 * Rate limiting for the authentication endpoints.
 *
 * Without this, /login accepts unlimited password guesses. These limits
 * are deliberately generous enough that a real person fumbling their
 * password will never hit them, but tight enough to make automated
 * credential stuffing impractical.
 *
 * NOTE: requires app.set("trust proxy", 1) in server.js. Render, Vercel
 * and most PaaS hosts put a proxy in front of the app, so without that
 * every request appears to come from the proxy's IP and one user getting
 * limited would lock out everybody.
 */

const friendly = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

/*
 * Each limiter is built by a factory so tests can get a fresh one with
 * its own in-memory store. The app uses the single shared instances
 * exported below; their behaviour is unchanged.
 */

/** Login: 10 attempts per 15 minutes per IP. */
const createLoginLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,   // RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // only failed logins count toward the limit
  handler: friendly(
    "Too many sign-in attempts. Please wait 15 minutes and try again, " +
    "or reset your password if you have forgotten it."
  ),
});

/** Registration: 5 new accounts per hour per IP. */
const createRegisterLimiter = () => rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: friendly(
    "Too many accounts created from this connection. " +
    "Please wait an hour and try again."
  ),
});

/** Password change: 5 per hour for a signed-in user. */
const createPasswordLimiter = () => rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: friendly(
    "Too many password change attempts. Please wait an hour and try again."
  ),
});

const loginLimiter    = createLoginLimiter();
const registerLimiter = createRegisterLimiter();
const passwordLimiter = createPasswordLimiter();

module.exports = {
  loginLimiter, registerLimiter, passwordLimiter,
  createLoginLimiter, createRegisterLimiter, createPasswordLimiter,
};
