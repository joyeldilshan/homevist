const nodemailer = require("nodemailer");
const locale = require("../config/locale");
const logger = require("../utils/logger");

// SMS via Twilio
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

// Email via Nodemailer
// If credentials are not set, runs in mock mode (prints to console)
exports.sendEmail = async (to, subject, htmlBody) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.debug("EMAIL MOCK -> To:", to);
    logger.debug("EMAIL MOCK -> Subject:", subject);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp.gmail.com",
      port:   process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || `Home Visit <${locale.organisation.email}>`,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <div style="background:#C62828;padding:20px;text-align:center">
            <h1 style="color:white;margin:0">Home Visit</h1>
          </div>
          <div style="padding:24px;background:#fff">
            ${htmlBody}
          </div>
          <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#888">
            Home Visit · Cardiff, Wales
          </div>
        </div>
      `,
    });
    logger.debug("Email sent to", to);
  } catch (err) {
    logger.error("Email failed:", err.message);
  }
};