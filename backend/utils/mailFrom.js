/**
 * The From of every outgoing email.
 *
 * All email is sent through Gmail as the EMAIL_USER account (utils/
 * emailService.js and utils/reportEmail.js), and Gmail sends as the
 * signed-in account, so the address is always EMAIL_USER.
 *
 * EMAIL_FROM sets only the display name patients see, e.g. "HemoVisit".
 * The older "Name <address>" form still works: the name is used and the
 * address is ignored. Unset, each email keeps its own default name.
 *
 * The name is passed to nodemailer as { name, address }, which quotes and
 * encodes it; control characters and angle brackets are removed first so
 * no value can add a header.
 */
const MAX = 64;

function displayName(raw) {
  let v = String(raw || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!v) return null;
  const named = /^(.*?)<[^<>]*>\s*$/.exec(v);
  if (named) v = named[1];
  else if (/^[^\s@]+@[^\s@]+$/.test(v)) return null;   // a bare address: no name in it
  v = v.replace(/[<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX).trim();
  return v || null;
}

// Without EMAIL_USER, email is in mock mode and nothing is sent; nodemailer
// still needs an address, so use one on the reserved .invalid domain,
// which can never deliver anywhere.
const MOCK_ADDRESS = "mock-sender@hemovisit.invalid";

function mailFrom(defaultName, env = process.env) {
  return { name: displayName(env.EMAIL_FROM) || defaultName, address: env.EMAIL_USER || MOCK_ADDRESS };
}

module.exports = { mailFrom, displayName };
