const test    = require("node:test");
const assert  = require("node:assert/strict");
const express = require("express");

const { loginLimiter, registerLimiter } = require("../middleware/rateLimit.middleware");

/**
 * Mounts a limiter on a throwaway express app on an ephemeral port.
 * Deliberately does NOT touch the real routes or the database.
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

test("login limiter allows the first 10 failed attempts", async () => {
  const { server, url } = await serve(loginLimiter);
  try {
    for (let i = 1; i <= 10; i++) {
      const r = await hit(url);
      assert.equal(r.status, 401, `attempt ${i} should still reach the handler`);
    }
  } finally { server.close(); }
});

test("login limiter blocks the 11th attempt with 429 and a friendly message", async () => {
  const { server, url } = await serve(loginLimiter);
  try {
    for (let i = 0; i < 10; i++) await hit(url);
    const blocked = await hit(url);
    assert.equal(blocked.status, 429);

    const body = await blocked.json();
    assert.equal(body.success, false);
    assert.match(body.message, /too many sign-in attempts/i);
    assert.match(body.message, /15 minutes/);
    // Must not leak internals to the user.
    assert.doesNotMatch(body.message, /rate ?limit|express|IP|stack/i);
  } finally { server.close(); }
});

test("login limiter sets standard RateLimit headers, not legacy ones", async () => {
  const { server, url } = await serve(loginLimiter);
  try {
    const r = await hit(url);
    assert.ok(
      r.headers.get("ratelimit") || r.headers.get("ratelimit-limit"),
      "expected a standard RateLimit header"
    );
    assert.equal(r.headers.get("x-ratelimit-limit"), null, "legacy headers should be off");
  } finally { server.close(); }
});

test("register limiter is stricter than login (5 per hour)", async () => {
  const { server, url } = await serve(registerLimiter, "/register");
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
});
