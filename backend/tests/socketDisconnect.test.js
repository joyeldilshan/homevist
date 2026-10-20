const test   = require("node:test");
const assert = require("node:assert/strict");
const { disconnectUser } = require("../utils/socketAuth");

// The live behaviour (two tabs dropped, no reconnect, others untouched) is
// in frontend e2e/api.e2e.mjs; this pins which sockets are targeted.
test("disconnectUser closes exactly that user's room", () => {
  const calls = [];
  const io = { in: (room) => ({ disconnectSockets: (close) => calls.push({ room, close }) }) };
  disconnectUser(io, { toString: () => "64f000000000000000000abc" });
  assert.deepEqual(calls, [{ room: "user:64f000000000000000000abc", close: true }]);
});

test("disconnectUser does nothing without a server or an id", () => {
  assert.doesNotThrow(() => disconnectUser(null, "x"));
  const io = { in: () => { throw new Error("should not be called"); } };
  assert.doesNotThrow(() => disconnectUser(io, null));
});
