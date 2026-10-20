const test   = require("node:test");
const assert = require("node:assert/strict");
const fs     = require("node:fs");
const path   = require("node:path");

const {
  isValidEmail, EMAIL_MESSAGE,
  isValidPassword, PASSWORD_MESSAGE, PASSWORD_MIN,
} = require("../utils/validators");

// ── Email ────────────────────────────────────────────────────────
test("accepts ordinary email addresses", () => {
  for (const ok of [
    "a@b.com", "name@example.com", "first.last@sub.domain.co.uk",
    "user+tag@example.org", "  spaced@example.com  ",
  ]) {
    assert.equal(isValidEmail(ok), true, `should accept ${ok}`);
  }
});

test("rejects the rubbish that used to get through", () => {
  for (const bad of [
    "", null, undefined, "abc", "a@b", "@example.com", "user@",
    "user @example.com", "user@exam ple.com", "no-at-sign.com",
  ]) {
    assert.equal(isValidEmail(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test("rejects an absurdly long address", () => {
  assert.equal(isValidEmail("a".repeat(250) + "@example.com"), false);
});

// ── Password ─────────────────────────────────────────────────────
test("accepts passwords meeting the new rule", () => {
  for (const ok of ["Passw0rd", "abcdefg1", "12345678a", "correct horse 9"]) {
    assert.equal(isValidPassword(ok), true, `should accept ${ok}`);
  }
});

test("rejects passwords that miss length, a letter or a number", () => {
  assert.equal(isValidPassword("Pa0"), false, "too short");
  assert.equal(isValidPassword("password"), false, "no number");
  assert.equal(isValidPassword("12345678"), false, "no letter");
  assert.equal(isValidPassword(""), false);
  assert.equal(isValidPassword(null), false);
});

test("the old 6-character minimum would no longer pass", () => {
  assert.equal(PASSWORD_MIN, 8);
  assert.equal(isValidPassword("abc123"), false);
});

test("messages tell the user what to do without leaking internals", () => {
  assert.match(PASSWORD_MESSAGE, /8 characters/);
  assert.match(PASSWORD_MESSAGE, /letter/);
  assert.match(PASSWORD_MESSAGE, /number/);
  assert.match(EMAIL_MESSAGE, /valid email/i);
  for (const m of [PASSWORD_MESSAGE, EMAIL_MESSAGE]) {
    assert.doesNotMatch(m, /regex|undefined|null|stack/i);
  }
});

/*
 * The critical backward-compatibility guarantee: these rules apply to NEW
 * credentials only. If login ever starts validating, every user created
 * under the old 6-character rule is locked out of their own account.
 */
test("login does not apply the new password or email rules", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "controllers", "auth.controller.js"), "utf8"
  );
  const login = src.slice(src.indexOf("exports.login"), src.indexOf("exports.getMe"));

  assert.doesNotMatch(login, /isValidPassword/,
    "login must not enforce the new password rule — it would lock out existing users");
  assert.doesNotMatch(login, /isValidEmail/,
    "login must not enforce the email rule — it would lock out existing users");
  assert.match(login, /comparePassword/, "login should still compare the hash");
});

test("register and change-password DO apply the rules", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "controllers", "auth.controller.js"), "utf8"
  );
  const register = src.slice(src.indexOf("exports.register"), src.indexOf("exports.login"));
  const change   = src.slice(src.indexOf("exports.changePassword"));

  assert.match(register, /isValidEmail/);
  assert.match(register, /isValidPassword/);
  assert.match(change,   /isValidPassword\(newPassword\)/);
});
