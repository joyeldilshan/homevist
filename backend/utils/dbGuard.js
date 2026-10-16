/**
 * Which database is this process about to connect to, and is that allowed?
 *
 * Shared by server.js and utils/seed.js so both apply the same rule.
 * No mongoose import here — this file must be cheap to require in tests.
 *
 * Nothing in this file ever returns or logs the URI itself: it can carry
 * a username and password. Only the database name leaves this module.
 */

/**
 * Pull the database name out of a MongoDB connection string.
 * Handles mongodb:// and mongodb+srv://, with or without a query string.
 */
function databaseNameFrom(uri) {
  if (!uri || typeof uri !== "string") return null;
  const afterHost = uri.split("://")[1];
  if (!afterHost) return null;
  const path = afterHost.split("/").slice(1).join("/");
  if (!path) return null;
  const name = path.split("?")[0].trim();
  return name || null;
}

const SAFE_NAME = /(dev|test|local|sandbox|staging)/i;

/**
 * Decide whether the server may connect.
 *
 * Outside production, the database name must look like a development one
 * (hemovisit_dev passes, the live hemovisit does not). The only way past
 * that is ALLOW_NON_DEV_DB=true, which is reported back as a warning.
 * In production the check is skipped: the live server is meant to use
 * the live database.
 *
 * Returns { ok, name, error?, warning? } — never the URI.
 */
function checkDatabaseTarget({ uri, nodeEnv, allowNonDevDb } = {}) {
  const name = databaseNameFrom(uri);

  if (!uri) {
    return { ok: false, name: null, error: "MONGO_URI is not set." };
  }
  if (nodeEnv === "production") {
    return { ok: true, name };
  }

  const override = allowNonDevDb === "true";
  const looksSafe = !!name && SAFE_NAME.test(name);
  if (looksSafe) return { ok: true, name };

  const label = name ? `"${name}"` : "(no database name in MONGO_URI)";
  if (override) {
    return {
      ok: true,
      name,
      warning:
        `ALLOW_NON_DEV_DB=true — connecting to non-development database ${label}. ` +
        "Writes from this machine will land in that database.",
    };
  }
  return {
    ok: false,
    name,
    error:
      `Refusing to connect: database ${label} does not look like a development database. ` +
      "Outside production the name must contain dev, test, local, sandbox or staging " +
      "(e.g. .../hemovisit_dev?retryWrites=true). " +
      "If you really mean it, set ALLOW_NON_DEV_DB=true.",
  };
}

/** Strip user:password@ from anything that might echo a connection string. */
function redactCredentials(text) {
  return String(text).replace(/(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/gi, "$1<credentials>@");
}

module.exports = { databaseNameFrom, SAFE_NAME, checkDatabaseTarget, redactCredentials };
