/**
 * "Your report is ready" email. A notification only: no PDF attached and
 * no results, tests or lab comments in the body, because email is not a
 * private channel. The patient signs in to read and download the report
 * (the download route checks it is theirs).
 */
const nodemailer = require("nodemailer");
const { formatDate } = require("./format");
const logger = require("../utils/logger");

// Text from the database goes into HTML: escape it. Lab comments and
// names were interpolated raw, so a comment could inject markup.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// The signed-in reports page. Never a link to the file. A signed-out
// patient is sent to sign in first and comes back here.
const reportsUrl = () => `${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}/user?tab=reports`;

let transporter = null;
// Mock mode when EMAIL_USER/EMAIL_PASS are unset (see emailService.js):
// the message is built but not sent.
const getTransporter = () => {
  if (!transporter) {
    const live = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    transporter = live
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        })
      : nodemailer.createTransport({ jsonTransport: true });
    if (!live) logger.debug("EMAIL MOCK: no EMAIL_USER/EMAIL_PASS, report emails are built but not sent");
  }
  return transporter;
};

const row = (label, value) => `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid #EEF1F4;width:150px;">
      <span style="font-size:12px;font-weight:600;color:#718096;text-transform:uppercase;letter-spacing:.5px;">${label}</span>
    </td>
    <td style="padding:9px 0;border-bottom:1px solid #EEF1F4;">
      <span style="font-size:14px;font-weight:600;color:#1A202C;">${esc(value || "—")}</span>
    </td>
  </tr>`;

const reportTemplate = (data) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:28px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:#1E6F5C;border-radius:14px 14px 0 0;padding:28px 34px;text-align:center;">
    <div style="font-size:34px;margin-bottom:6px;">🧬</div>
    <h1 style="color:#fff;margin:0;font-size:21px;font-weight:700;">Your Lab Report is Ready</h1>
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px;">HemoVisit · Your Test Results</p>
  </td></tr>
  <tr><td style="background:#fff;padding:30px 34px;border-radius:0 0 14px 14px;box-shadow:0 4px 18px rgba(0,0,0,.07);">
    <p style="font-size:15px;color:#1A202C;margin:0 0 22px;">
      Dear <strong>${esc(data.patientName)}</strong>, the laboratory has issued your report. For your privacy it is not attached to this email.
    </p>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${reportsUrl()}" style="display:inline-block;background:#1E6F5C;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:9px;">Sign in to view your report</a>
    </p>
    <p style="font-size:12px;color:#718096;margin:0 0 22px;">
      Or open this address: <a href="${reportsUrl()}" style="color:#0F6E62;">${esc(reportsUrl())}</a>
    </p>
    <div style="background:#F0FBF7;border:1.5px solid #C3EDDE;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row("Report ID",  data.reportId)}
        ${row("Booking ID", data.bookingId)}
        ${row("Issued On",  formatDate(new Date()))}
      </table>
    </div>
    <div style="background:#FFF5F5;border:1.5px solid #FED7D7;border-radius:9px;padding:14px 18px;">
      <div style="font-size:12px;color:#9B2C2C;line-height:1.6;">
        ⚠️ Your report is confidential. Please consult your physician to interpret the results.
      </div>
    </div>
  </td></tr>
  <tr><td style="padding:16px 0;text-align:center;">
    <p style="font-size:11px;color:#A0AEC0;margin:0;">🩸 HemoVisit · Cardiff, Wales · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

/**
 * Tell the patient their report is ready: { to, patientName, reportId,
 * bookingId }. Anything else passed in is ignored, and nothing is attached.
 */
exports.sendReportToPatient = async (data) => {
  if (!data.to) throw new Error("No patient email address.");

  const mail = {
    from:    `"HemoVisit Lab 🧬" <${process.env.EMAIL_USER}>`,
    to:      data.to,
    subject: `🧬 Your lab report is ready — ${data.reportId} | HemoVisit`,
    html:    reportTemplate(data),
  };

  const info = await getTransporter().sendMail(mail);
  logger.debug(`📧 Report ${data.reportId} notification sent to ${data.to}`);
  return info;
};

exports._reportsUrl = reportsUrl;
