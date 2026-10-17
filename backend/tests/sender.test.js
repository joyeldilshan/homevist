const test   = require("node:test");
const assert = require("node:assert/strict");

// config/locale reads EMAIL_FROM when it loads, so reload it per case.
function senderFor(value) {
  const saved = process.env.EMAIL_FROM;
  if (value === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = value;
  delete require.cache[require.resolve("../config/locale")];
  try {
    return require("../config/locale").organisation.email;
  } finally {
    if (saved === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = saved;
    delete require.cache[require.resolve("../config/locale")];
  }
}

test("sender falls back to an obviously fake address when EMAIL_FROM is unset", () => {
  assert.equal(senderFor(undefined), "noreply@example.com");
  assert.equal(senderFor("   "), "noreply@example.com");
});

test("sender takes the address out of a 'Name <address>' EMAIL_FROM", () => {
  assert.equal(senderFor("HemoVisit <noreply@example.org>"), "noreply@example.org");
});

test("sender accepts a bare address", () => {
  assert.equal(senderFor("ops@example.net"), "ops@example.net");
});

test("no invented domain is hard-coded as the sender", () => {
  const src = require("node:fs").readFileSync(require.resolve("../config/locale"), "utf8");
  assert.doesNotMatch(src, /homevisit\.co\.uk/);
});
