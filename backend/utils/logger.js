/**
 * Tiny logger. No dependency, no configuration file.
 *
 * The point is that debug chatter disappears in production while
 * anything actionable still gets through:
 *
 *   logger.debug   development only — socket connects, mock SMS/email
 *   logger.info    development only — chatty progress notes
 *   logger.startup always           — server up, DB connected, jobs armed
 *   logger.warn    always           — recoverable problems
 *   logger.error   always           — failures worth investigating
 *
 * startup exists because a production server that logs absolutely
 * nothing on boot is impossible to operate — you cannot tell a healthy
 * start from a silent crash loop in the Render dashboard.
 *
 * Render and most hosts capture stdout/stderr, so warn and error stay on
 * console.* rather than going somewhere a buyer would have to discover.
 *
 * Deliberately NOT used by utils/seed.js: the seed prints credentials and
 * progress that must always show, including when NODE_ENV=production.
 */

const isProd = process.env.NODE_ENV === "production";

const logger = {
  debug: (...args) => { if (!isProd) console.log(...args); },
  info:  (...args) => { if (!isProd) console.log(...args); },
  startup: (...args) => console.log(...args),
  warn:  (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

module.exports = logger;
module.exports.logger = logger;
