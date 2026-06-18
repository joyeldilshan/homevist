const nodemailer = require("nodemailer");
const fs = require("fs");

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

const row = (label, value) => `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid #EEF1F4;width:150px;">
      <span style="font-size:12px;font-weight:600;color:#718096;text-transform:uppercase;letter-spacing:.5px;">${label}</span>
    </td>
    <td style="padding:9px 0;border-bottom:1px solid #EEF1F4;">
      <span style="font-size:14px;font-weight:600;color:#1A202C;">${value || "—"}</span>
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
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px;">HemoVisit Laboratory · Verified Results</p>
  </td></tr>
  <tr><td style="background:#fff;padding:30px 34px;border-radius:0 0 14px 14px;box-shadow:0 4px 18px rgba(0,0,0,.07);">
    <p style="font-size:15px;color:#1A202C;margin:0 0 22px;">
      Dear <strong>${data.patientName}</strong>, your test results have been processed and verified by our laboratory team. Your report is attached to this email as a PDF.
    </p>
    <div style="background:#F0FBF7;border:1.5px solid #C3EDDE;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row("Report ID",  data.reportId)}
        ${row("Sample ID",  data.sampleId)}
        ${row("Booking ID", data.bookingId)}
        ${row("Tests",      data.tests)}
        ${row("Issued On",  new Date().toDateString())}
      </table>
    </div>
    ${data.labComments ? `
    <div style="background:#FFFDF0;border:1.5px solid #FBEFC4;border-radius:9px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#7A5C12;margin-bottom:4px;">🔬 Lab Comments</div>
      <div style="font-size:13px;color:#7A5C12;line-height:1.6;">${data.labComments}</div>
    </div>` : ""}
    <div style="background:#FFF5F5;border:1.5px solid #FED7D7;border-radius:9px;padding:14px 18px;">
      <div style="font-size:12px;color:#9B2C2C;line-height:1.6;">
        ⚠️ This report is confidential. Please consult your physician to interpret these results.
      </div>
    </div>
  </td></tr>
  <tr><td style="padding:16px 0;text-align:center;">
    <p style="font-size:11px;color:#A0AEC0;margin:0;">🩸 HemoVisit · Jaffna, Sri Lanka · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

/**
 * Send the report to the patient.
 * Attaches the local PDF file from data.filePath.
 */
exports.sendReportToPatient = async (data) => {
  if (!data.to) throw new Error("No patient email address.");

  const mail = {
    from:    `"HemoVisit Lab 🧬" <${process.env.EMAIL_USER}>`,
    to:      data.to,
    subject: `🧬 Your Lab Report — ${data.reportId} | HemoVisit`,
    html:    reportTemplate(data),
    attachments: [],
  };

  // Attach the actual stored PDF from disk
  if (data.filePath && fs.existsSync(data.filePath)) {
    mail.attachments.push({
      filename:    `Report_${data.reportId}.pdf`,
      path:        data.filePath,
      contentType: "application/pdf",
    });
  } else {
    console.warn("⚠️ Report file not found on disk:", data.filePath);
  }

  const info = await getTransporter().sendMail(mail);
  console.log(`📧 Report ${data.reportId} sent to ${data.to}`);
  return info;
};