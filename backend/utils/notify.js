const logger = require("../utils/logger");

// SMS via Twilio. (Email is in emailService.js and reportEmail.js; an
// older sendEmail here, which nothing called, was the only reader of
// EMAIL_HOST and EMAIL_PORT and has been removed.)
// If credentials are not set, runs in mock mode (prints to console)
exports.sendSMS = async (to, body) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.debug("SMS MOCK -> To:", to);
    logger.debug("SMS MOCK -> Message:", body);
    return;
  }
  try {
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    logger.debug("SMS sent to", to);
  } catch (err) {
    logger.error("SMS failed:", err.message);
  }
};
