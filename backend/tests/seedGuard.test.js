const test   = require("node:test");
const assert = require("node:assert/strict");

// Safe to require: seed.js only calls seed() when run directly.
const { databaseNameFrom, SAFE_NAME } = require("../utils/seed");

test("requiring the seed module does not execute the seed", () => {
  // If this file runs at all, the require above did not wipe anything.
  assert.equal(typeof databaseNameFrom, "function");
});

test("reads the database name from a standard URI", () => {
  assert.equal(databaseNameFrom("mongodb://localhost:27017/homevisit_dev"), "homevisit_dev");
  assert.equal(databaseNameFrom("mongodb://127.0.0.1:27017/test"), "test");
});

test("reads the database name from an Atlas SRV URI with a query string", () => {
  assert.equal(
    databaseNameFrom("mongodb+srv://user:pw@cluster0.example.mongodb.net/homevisit?retryWrites=true&w=majority"),
    "homevisit"
  );
});

test("returns null when no database name is present", () => {
  for (const uri of [
    "mongodb+srv://user:pw@cluster.mongodb.net",
    "mongodb+srv://user:pw@cluster.mongodb.net/",
    "mongodb+srv://user:pw@cluster.mongodb.net/?retryWrites=true",
    "", null, undefined, "not-a-uri",
  ]) {
    assert.equal(databaseNameFrom(uri), null, `should be null for ${JSON.stringify(uri)}`);
  }
});

test("a password containing a slash does not break name extraction", () => {
  assert.equal(
    databaseNameFrom("mongodb+srv://user:pa%2Fss@cluster.mongodb.net/mydb_dev"),
    "mydb_dev"
  );
});

// ── The safety rule itself ───────────────────────────────────────
test("recognises development-looking database names", () => {
  for (const ok of [
    "homevisit_dev", "dev", "homevisit-test", "testing", "local",
    "homevisit_local", "sandbox", "staging_db", "HOMEVISIT_DEV",
  ]) {
    assert.equal(SAFE_NAME.test(ok), true, `"${ok}" should be allowed`);
  }
});

test("REFUSES production-looking names — the whole point of the guard", () => {
  for (const bad of [
    "homevisit",      // the real production database for this project
    "hemovisit",
    "production",
    "prod",
    "main",
    "app",
  ]) {
    assert.equal(SAFE_NAME.test(bad), false,
      `"${bad}" must NOT pass the name check — seed deletes all users`);
  }
});
