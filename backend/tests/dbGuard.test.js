const test   = require("node:test");
const assert = require("node:assert/strict");
const path   = require("node:path");
const { spawnSync } = require("node:child_process");

const { checkDatabaseTarget, redactCredentials } = require("../utils/dbGuard");

const DEV_URI  = "mongodb+srv://user:s3cretPW@cluster.example.net/hemovisit_dev?retryWrites=true";
const LIVE_URI = "mongodb+srv://user:s3cretPW@cluster.example.net/hemovisit?retryWrites=true";

// ── The rule ─────────────────────────────────────────────────────
test("a development database name is allowed", () => {
  const r = checkDatabaseTarget({ uri: DEV_URI, nodeEnv: "development" });
  assert.equal(r.ok, true);
  assert.equal(r.name, "hemovisit_dev");
  assert.equal(r.warning, undefined);
});

test("the live database name is refused outside production", () => {
  for (const nodeEnv of [undefined, "", "development", "test"]) {
    const r = checkDatabaseTarget({ uri: LIVE_URI, nodeEnv });
    assert.equal(r.ok, false, `should refuse with NODE_ENV=${nodeEnv}`);
    assert.match(r.error, /"hemovisit"/);
    assert.match(r.error, /ALLOW_NON_DEV_DB=true/);
  }
});

test("a URI with no database name is refused (mongoose would silently use 'test')", () => {
  const r = checkDatabaseTarget({ uri: "mongodb://127.0.0.1:27017", nodeEnv: "development" });
  assert.equal(r.ok, false);
});

test("a missing MONGO_URI is refused", () => {
  assert.equal(checkDatabaseTarget({ uri: undefined, nodeEnv: "development" }).ok, false);
});

test("ALLOW_NON_DEV_DB=true lets the live name through, with a warning", () => {
  const r = checkDatabaseTarget({ uri: LIVE_URI, nodeEnv: "development", allowNonDevDb: "true" });
  assert.equal(r.ok, true);
  assert.match(r.warning, /ALLOW_NON_DEV_DB=true/);
  assert.match(r.warning, /"hemovisit"/);
});

test("only the exact string 'true' counts as the override", () => {
  for (const v of ["1", "yes", "TRUE ", "false", ""]) {
    const r = checkDatabaseTarget({ uri: LIVE_URI, nodeEnv: "development", allowNonDevDb: v });
    assert.equal(r.ok, false, `ALLOW_NON_DEV_DB=${JSON.stringify(v)} must not override`);
  }
});

test("production skips the name check", () => {
  const r = checkDatabaseTarget({ uri: LIVE_URI, nodeEnv: "production" });
  assert.equal(r.ok, true);
  assert.equal(r.name, "hemovisit");
  assert.equal(r.warning, undefined);
});

test("no result ever carries the URI or the password", () => {
  const cases = [
    { uri: DEV_URI,  nodeEnv: "development" },
    { uri: LIVE_URI, nodeEnv: "development" },
    { uri: LIVE_URI, nodeEnv: "development", allowNonDevDb: "true" },
    { uri: LIVE_URI, nodeEnv: "production" },
  ];
  for (const c of cases) {
    const text = JSON.stringify(checkDatabaseTarget(c));
    assert.doesNotMatch(text, /s3cretPW/);
    assert.doesNotMatch(text, /cluster\.example\.net/);
  }
});

test("redactCredentials strips user:password from connection strings", () => {
  assert.equal(
    redactCredentials("failed for mongodb+srv://user:s3cretPW@cluster.example.net/x"),
    "failed for mongodb+srv://<credentials>@cluster.example.net/x"
  );
});

// ── The real server process ──────────────────────────────────────
// Port 1 on loopback: nothing listens there, so even a guard failure
// could not reach a real database.
const SERVER = path.join(__dirname, "..", "server.js");
function runServer(env) {
  return spawnSync(process.execPath, [SERVER], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "development", ALLOW_NON_DEV_DB: "", PORT: "0", ...env },
    encoding: "utf8",
    timeout: 20000,
  });
}

test("server.js exits before connecting when MONGO_URI names a live database", () => {
  const r = runServer({ MONGO_URI: "mongodb://user:s3cretPW@127.0.0.1:1/hemovisit" });
  const out = r.stdout + r.stderr;
  assert.equal(r.status, 1);
  assert.match(out, /Refusing to connect: database "hemovisit"/);
  assert.doesNotMatch(out, /Connected to MongoDB/);
  assert.doesNotMatch(out, /s3cretPW/);
});

test("server.js with the override logs a loud warning and never the password", () => {
  const r = runServer({
    MONGO_URI: "mongodb://user:s3cretPW@127.0.0.1:1/hemovisit?serverSelectionTimeoutMS=300",
    ALLOW_NON_DEV_DB: "true",
  });
  const out = r.stdout + r.stderr;
  assert.match(out, /!! {2}ALLOW_NON_DEV_DB=true/);
  assert.match(out, /MongoDB connection failed/); // got past the guard, then hit the dead port
  assert.doesNotMatch(out, /s3cretPW/);
  assert.equal(r.status, 1);
});
