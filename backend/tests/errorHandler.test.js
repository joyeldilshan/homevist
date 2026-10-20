const test   = require("node:test");
const assert = require("node:assert/strict");
const { errorHandler } = require("../middleware/error.middleware");

// A tiny stand-in for Express's res.
const run = (err) => {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  const quiet = console.error; console.error = () => {};
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = quiet; }
  return out;
};

test("a malformed ID is a 404 with no mongoose detail", () => {
  const err = Object.assign(new Error('Cast to ObjectId failed for value "not-an-id" (type string) at path "_id" for model "Booking"'), { name: "CastError" });
  const { status, body } = run(err);
  assert.equal(status, 404);
  assert.equal(body.message, "Not found.");
  assert.doesNotMatch(JSON.stringify(body), /Cast|ObjectId|Booking|not-an-id/);
});

test("an unexpected error is a 500 with a generic message and no stack", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const { status, body } = run(new Error("E11000 duplicate key in collection users: email_1 dup key: { email: 'x@y.z' }"));
    assert.equal(status, 500);
    assert.equal(body.message, "Something went wrong. Please try again.");
    assert.equal(body.stack, undefined);
  } finally { process.env.NODE_ENV = prev; }
});

test("expected client errors keep their own message", () => {
  const { status, body } = run(Object.assign(new Error("Only PDF files are allowed."), { statusCode: 400 }));
  assert.equal(status, 400);
  assert.equal(body.message, "Only PDF files are allowed.");
});
