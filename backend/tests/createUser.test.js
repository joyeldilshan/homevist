const test   = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough, Writable } = require("node:stream");

const { main, createAccount, DuplicateEmailError } = require("../utils/createUser");
const { PASSWORD_MESSAGE } = require("../utils/validators");

/*
 * npm run create-user, driven through a fake terminal: each answer is
 * typed only when its question appears, as a person would. No database:
 * the User model is an in-memory stand-in.
 */

const DEV  = "mongodb://localhost:27017/hemovisit_dev";
const PROD = "mongodb+srv://u:p@cluster.example.net/hemovisit?retryWrites=true";
const PASSWORD = "Sup3rSecretPass";

function fakeUser(existing = []) {
  const rows = existing.map((r) => ({ ...r }));
  return {
    rows,
    findOne: ({ email }) => ({ lean: async () => rows.find((r) => r.email === email) || null }),
    create: async (doc) => { rows.push({ ...doc }); return doc; },
  };
}

function terminal(answers, { tty = true } = {}) {
  const input = new PassThrough();
  input.isTTY = tty;
  let text = "";
  const output = new Writable({
    write(chunk, _enc, done) {
      text += chunk.toString();
      // A question ends in ": ". Answer it on the next tick.
      if (/: $/.test(text) && answers.length) {
        const next = answers.shift();
        setImmediate(() => input.write(next + "\n"));
      }
      done();
    },
  });
  return { input, output, read: () => text };
}

async function run({ answers, env = { MONGO_URI: DEV }, User = fakeUser(), tty = true }) {
  const t = terminal([...answers], { tty });
  let connects = 0;
  const code = await main({
    input: t.input, output: t.output, env, User,
    connect: async () => { connects++; }, disconnect: async () => {},
  });
  return { code, out: t.read(), User, connects };
}

const GOOD = ["hemovisit_dev", "admin", "Ada Admin", "Ada@Example.com", "07700 900123", PASSWORD, PASSWORD];

test("creates an admin; prints the database first; never shows the password", async () => {
  const { code, out, User } = await run({ answers: [...GOOD] });
  assert.equal(code, 0, out);
  assert.ok(out.indexOf("database: hemovisit_dev") < out.indexOf("Role"), "database name shown before anything is asked");
  assert.match(out, /Created admin account ada@example\.com in hemovisit_dev/);
  assert.equal(out.includes(PASSWORD), false, "password appeared in the output");
  assert.equal(User.rows.length, 1);
  const row = User.rows[0];
  assert.deepEqual({ role: row.role, email: row.email, phone: row.phone, isActive: row.isActive },
                   { role: "admin", email: "ada@example.com", phone: "+447700900123", isActive: true });
});

test("creates a lab technician", async () => {
  const answers = [...GOOD]; answers[1] = "MLT";
  const { code, out, User } = await run({ answers });
  assert.equal(code, 0, out);
  assert.equal(User.rows[0].role, "mlt");
  assert.match(out, /Created lab technician account/);
});

test("the typed database name must match, before connecting", async () => {
  const { code, out, User, connects } = await run({ answers: ["hemovisit"] });
  assert.equal(code, 1);
  assert.match(out, /did not match/);
  assert.equal(connects, 0);
  assert.equal(User.rows.length, 0);
});

test("refuses without an interactive terminal", async () => {
  const { code, out, connects } = await run({ answers: [...GOOD], tty: false });
  assert.equal(code, 1);
  assert.match(out, /interactive terminal/);
  assert.equal(connects, 0);
});

test("outside production, a production-looking database is refused without asking anything", async () => {
  const { code, out, connects } = await run({ answers: [...GOOD], env: { MONGO_URI: PROD } });
  assert.equal(code, 1);
  assert.match(out, /Refusing to connect/);
  assert.doesNotMatch(out, /Type the database name/);
  assert.equal(connects, 0);
});

test("works in production against the production database", async () => {
  const answers = [...GOOD]; answers[0] = "hemovisit";
  const { code, out } = await run({ answers, env: { MONGO_URI: PROD, NODE_ENV: "production" } });
  assert.equal(code, 0, out);
  assert.match(out, /database: hemovisit  \(NODE_ENV=production\)/);
  assert.doesNotMatch(out, /u:p@|cluster\.example/, "the URI is never printed");
});

test("an existing email is refused before the password is asked, and the account is untouched", async () => {
  const User = fakeUser([{ email: "ada@example.com", role: "user", name: "Existing" }]);
  const { code, out } = await run({ answers: [...GOOD], User });
  assert.equal(code, 1);
  assert.match(out, /already exists\. Nothing was changed/);
  assert.doesNotMatch(out, /Password/);
  assert.deepEqual(User.rows, [{ email: "ada@example.com", role: "user", name: "Existing" }]);
});

test("a weak password is refused with the shared rule, then a good one is accepted", async () => {
  const answers = [...GOOD.slice(0, 5), "abc12", PASSWORD, PASSWORD];
  const { code, out, User } = await run({ answers });
  assert.equal(code, 0, out);
  assert.ok(out.includes(PASSWORD_MESSAGE));
  assert.equal(out.includes("abc12"), false, "a refused password was echoed");
  assert.equal(User.rows.length, 1);
});

test("mismatched passwords are asked again", async () => {
  const answers = [...GOOD.slice(0, 5), PASSWORD, "Different1x", PASSWORD, PASSWORD];
  const { code, out } = await run({ answers });
  assert.equal(code, 0, out);
  assert.match(out, /did not match/);
});

test("only admin or mlt; three wrong answers stop without creating anything", async () => {
  const { code, out, User } = await run({ answers: ["hemovisit_dev", "user", "phlebotomist", "superadmin"] });
  assert.equal(code, 1);
  assert.match(out, /Too many attempts\. Nothing was created/);
  assert.equal(User.rows.length, 0);
});

test("invalid email and phone are refused with the shared messages", async () => {
  const answers = ["hemovisit_dev", "admin", "Ada", "not-an-email", "ada@example.com", "12345", "07700 900123", PASSWORD, PASSWORD];
  const { code, out } = await run({ answers });
  assert.equal(code, 0, out);
  assert.match(out, /valid email address/);
  assert.match(out, /UK/);
});

test("a save error never prints its message (it could quote the password)", async () => {
  const User = fakeUser();
  User.create = async () => {
    const err = new Error(`Path \`password\` (\`${PASSWORD}\`) is invalid.`);
    err.errors = { password: {} };
    throw err;
  };
  const { code, out } = await run({ answers: [...GOOD], User });
  assert.equal(code, 1);
  assert.match(out, /could not be created \(check: password\)/);
  assert.equal(out.includes(PASSWORD), false);
});

test("createAccount never overwrites: existing email or a duplicate-key race is refused", async () => {
  const User = fakeUser([{ email: "a@example.com" }]);
  await assert.rejects(createAccount(User, { email: "a@example.com" }), DuplicateEmailError);
  const racing = fakeUser();
  racing.create = async () => { throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 }); };
  await assert.rejects(createAccount(racing, { email: "b@example.com" }), DuplicateEmailError);
});
