const test    = require("node:test");
const assert  = require("node:assert/strict");
const express = require("express");

const {
  createLoginLimiter, createRegisterLimiter, createPasswordLimiter,
} = require("../middleware/rateLimit.middleware");

/**
 * Mounts a limiter on a throwaway express app on an ephemeral port.
 * Deliberately does NOT touch the real routes or the database.
 *
 * Every case builds its OWN limiter (fresh in-memory store). They used to
 * share the app's single loginLimiter, so each test started from the
 * previous one's count and only passed in file order.
 */
function serve(limiter, routePath = "/login") {
  const app = express();
  app.set("trust proxy", 1);
  app.post(routePath, limiter, (_req, res) => res.status(401).json({ ok: false }));
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () =>
      resolve({ server, url: `http://127.0.0.1:${server.address().port}${routePath}` })
    );
  });
}

const hit = (url) => fetch(url, { method: "POST" });

const cases = [
  ["login limiter allows the first 10 failed attempts", async () => {
    const { server, url } = await serve(createLoginLimiter());
    try {
      for (let i = 1; i <= 10; i++) {
        const r = await hit(url);
        assert.equal(r.status, 401, `attempt ${i} should still reach the handler`);
      }
    } finally { server.close(); }
  }],

  ["login limiter blocks the 11th attempt with 429 and a friendly message", async () => {
    const { server, url } = await serve(createLoginLimiter());
    try {
      // Checked, not just sent: a counter carried over from another test
      // would show up here as an early 429.
      for (let i = 1; i <= 10; i++) assert.equal((await hit(url)).status, 401, `attempt ${i}`);
      const blocked = await hit(url);
      assert.equal(blocked.status, 429);

      const body = await blocked.json();
      assert.equal(body.success, false);
      assert.match(body.message, /too many sign-in attempts/i);
      assert.match(body.message, /15 minutes/);
      // Must not leak internals to the user.
      assert.doesNotMatch(body.message, /rate ?limit|express|IP|stack/i);
    } finally { server.close(); }
  }],

  ["login limiter sets standard RateLimit headers, not legacy ones", async () => {
    const { server, url } = await serve(createLoginLimiter());
    try {
      const r = await hit(url);
      assert.equal(r.status, 401, "a fresh limiter lets the first request through");
      assert.ok(
        r.headers.get("ratelimit") || r.headers.get("ratelimit-limit"),
        "expected a standard RateLimit header"
      );
      assert.equal(r.headers.get("x-ratelimit-limit"), null, "legacy headers should be off");
    } finally { server.close(); }
  }],

  ["register limiter is stricter than login (5 per hour)", async () => {
    const { server, url } = await serve(createRegisterLimiter(), "/register");
    try {
      for (let i = 1; i <= 5; i++) {
        const r = await hit(url);
        assert.equal(r.status, 401, `registration ${i} should be allowed`);
      }
      const blocked = await hit(url);
      assert.equal(blocked.status, 429);
      const body = await blocked.json();
      assert.match(body.message, /too many accounts/i);
    } finally { server.close(); }
  }],

  ["password-change limiter allows 5 then blocks", async () => {
    const { server, url } = await serve(createPasswordLimiter(), "/change-password");
    try {
      for (let i = 1; i <= 5; i++) assert.equal((await hit(url)).status, 401, `change ${i}`);
      assert.equal((await hit(url)).status, 429);
    } finally { server.close(); }
  }],

  ["two limiters never share a counter", async () => {
    const a = await serve(createLoginLimiter());
    const b = await serve(createLoginLimiter());
    try {
      for (let i = 0; i < 10; i++) await hit(a.url);
      assert.equal((await hit(a.url)).status, 429, "first limiter is exhausted");
      assert.equal((await hit(b.url)).status, 401, "second limiter is untouched");
    } finally { a.server.close(); b.server.close(); }
  }],
];

/*
 * node:test has no shuffle flag, so: TEST_SHUFFLE=<seed> registers the
 * cases in a seeded random order, to prove none depends on another.
 */
const seed = Number(process.env.TEST_SHUFFLE);
if (Number.isFinite(seed) && process.env.TEST_SHUFFLE !== undefined) {
  let x = seed || 1;
  const rand = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = cases.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cases[i], cases[j]] = [cases[j], cases[i]];
  }
}

for (const [name, fn] of cases) test(name, fn);
