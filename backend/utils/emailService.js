const nodemailer = require("nodemailer");

// ── Single shared transporter instance ────────────────────────
// Created once, reused for all emails
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

// ── HTML helper functions ──────────────────────────────────────
const infoRow = (icon, label, value) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #F0F2F5;width:30px;vertical-align:top;">
      <span style="font-size:15px;">${icon}</span>
    </td>
    <td style="padding:8px 10px 8px 0;border-bottom:1px solid #F0F2F5;width:120px;vertical-align:top;">
      <span style="font-size:11px;font-weight:600;color:#718096;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
    </td>
    <td style="padding:8px 0;border-bottom:1px solid #F0F2F5;vertical-align:top;">
      <span style="font-size:13px;font-weight:600;color:#1A202C;">${value || "—"}</span>
    </td>
  </tr>`;

const stepRow = (num, title, desc) => `
  <tr>
    <td style="padding:6px 0;vertical-align:top;width:32px;">
      <div style="width:24px;height:24px;border-radius:50%;background:#E53E3E;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:24px;">${num}</div>
    </td>
    <td style="padding:6px 0 6px 10px;vertical-align:top;">
      <div style="font-size:13px;font-weight:700;color:#1A202C;margin-bottom:2px;">${title}</div>
      <div style="font-size:12px;color:#718096;line-height:1.6;">${desc}</div>
    </td>
  </tr>`;

// ── Email Templates ────────────────────────────────────────────

const adminTemplate = (booking, patient) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;background:#F7F8FA;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td style="background:#E53E3E;border-radius:14px 14px 0 0;padding:24px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🩸</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">New Booking Request</h1>
    <p style="color:rgba(255,255,255,0.8);margin:5px 0 0;font-size:13px;">HemoVisit · Home Blood Collection Service</p>
  </td></tr>

  <!-- Alert -->
  <tr><td style="background:#C53030;padding:10px 32px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:12px;font-weight:600;">⚡ Action Required — Please Assign a Phlebotomist</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:28px 32px;border-radius:0 0 14px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.07);">

    <!-- Booking ID -->
    <div style="background:#FFF5F5;border:1.5px solid #FED7D7;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:700;color:#E53E3E;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">🔖 Booking ID</div>
      <div style="font-size:18px;font-weight:800;color:#1A202C;letter-spacing:1px;">${booking.bookingId}</div>
    </div>

    <h3 style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Patient Info</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${infoRow("👤", "Name",  patient.name)}
      ${infoRow("📞", "Phone", patient.phone || "Not provided")}
      ${infoRow("📧", "Email", patient.email)}
    </table>

    <h3 style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Booking Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("🧪", "Test",    booking.testType?.name || "—")}
      ${infoRow("💰", "Amount",  "Rs. " + (booking.amount?.toLocaleString() || "—"))}
      ${infoRow("📅", "Date",    new Date(booking.appointmentDate).toDateString())}
      ${infoRow("⏰", "Time",    booking.appointmentTime || "—")}
      ${infoRow("📍", "Address", booking.address || "—")}
      ${booking.notes ? infoRow("📝", "Notes", booking.notes) : ""}
    </table>

    <div style="text-align:center;margin:24px 0 16px;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/admin"
        style="display:inline-block;background:#E53E3E;color:#fff;text-decoration:none;padding:13px 32px;border-radius:9px;font-weight:700;font-size:14px;">
        Open Admin Dashboard →
      </a>
    </div>
    <p style="font-size:11px;color:#A0AEC0;text-align:center;margin:0;">Automated notification — do not reply</p>
  </td></tr>

  <tr><td style="padding:16px 0;text-align:center;">
    <p style="font-size:11px;color:#A0AEC0;margin:0;">🩸 HemoVisit · Jaffna, Sri Lanka · 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

const patientTemplate = (booking, patient) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;background:#F7F8FA;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <tr><td style="background:#E53E3E;border-radius:14px 14px 0 0;padding:24px 32px;text-align:center;">
    <div style="font-size:36px;margin-bottom:6px;">✅</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Booking Confirmed!</h1>
    <p style="color:rgba(255,255,255,0.85);margin:5px 0 0;font-size:13px;">Your home visit has been scheduled</p>
  </td></tr>

  <tr><td style="background:#fff;padding:28px 32px;border-radius:0 0 14px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.07);">
    <p style="font-size:15px;color:#1A202C;margin:0 0 22px;">
      Hi <strong>${patient.name.split(" ")[0]}</strong>, your booking has been received! 🎉
    </p>

    <div style="background:#FFF5F5;border:1.5px solid #FED7D7;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:700;color:#E53E3E;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📋 Booking Summary</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("🔖", "Booking ID", booking.bookingId)}
        ${infoRow("🧪", "Test",       booking.testType?.name || "—")}
        ${infoRow("📅", "Date",       new Date(booking.appointmentDate).toDateString())}
        ${infoRow("⏰", "Time",       booking.appointmentTime || "—")}
        ${infoRow("📍", "Address",    booking.address || "—")}
        ${infoRow("💰", "Amount",     "Rs. " + (booking.amount?.toLocaleString() || "—"))}
      </table>
    </div>

    <h3 style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;">What Happens Next?</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stepRow("1", "Phlebotomist Assignment", "Our admin will assign a certified phlebotomist shortly.")}
      ${stepRow("2", "Confirmation",            "You will receive phlebotomist details via email.")}
      ${stepRow("3", "Home Visit",              "Phlebotomist arrives at your scheduled date and time.")}
      ${stepRow("4", "Report Ready",            "Download your verified PDF report within 24 hours.")}
    </table>

    ${booking.testType?.preparation ? `
    <div style="background:#FFFFF0;border:1.5px solid #FEFCBF;border-radius:9px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:#744210;margin-bottom:3px;">⚠️ Preparation Required</div>
      <div style="font-size:12px;color:#744210;">${booking.testType.preparation}</div>
    </div>` : ""}

    <p style="font-size:12px;color:#718096;margin:0;">
      Questions? Contact us at <strong>${process.env.EMAIL_USER}</strong>
    </p>
  </td></tr>

  <tr><td style="padding:16px 0;text-align:center;">
    <p style="font-size:11px;color:#A0AEC0;margin:0;">🩸 HemoVisit · Jaffna, Sri Lanka · 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

const phlebotomistTemplate = (booking, patient, phlebotomist) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;background:#F7F8FA;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <tr><td style="background:#E53E3E;border-radius:14px 14px 0 0;padding:24px 32px;text-align:center;">
    <div style="font-size:36px;margin-bottom:6px;">🧪</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">New Job Assigned!</h1>
    <p style="color:rgba(255,255,255,0.85);margin:5px 0 0;font-size:13px;">You have a new home visit booking</p>
  </td></tr>

  <tr><td style="background:#fff;padding:28px 32px;border-radius:0 0 14px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.07);">
    <p style="font-size:15px;color:#1A202C;margin:0 0 22px;">
      Hi <strong>${phlebotomist.name.split(" ")[0]}</strong>, you have been assigned a new booking!
    </p>

    <h3 style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Patient Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${infoRow("👤", "Name",  patient.name  || "—")}
      ${infoRow("📞", "Phone", patient.phone || "—")}
      ${infoRow("📧", "Email", patient.email || "—")}
    </table>

    <h3 style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Visit Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("🔖", "Booking ID", booking.bookingId)}
      ${infoRow("🧪", "Test",       booking.testType?.name || "—")}
      ${infoRow("📅", "Date",       new Date(booking.appointmentDate).toDateString())}
      ${infoRow("⏰", "Time",       booking.appointmentTime || "—")}
      ${infoRow("📍", "Address",    booking.address || "—")}
      ${booking.notes ? infoRow("📝", "Notes", booking.notes) : ""}
    </table>

    <div style="background:#F0FFF4;border:1.5px solid #C6F6D5;border-radius:9px;padding:13px 18px;margin-bottom:22px;">
      <div style="font-size:12px;font-weight:700;color:#276749;">✅ Please arrive on time with full sterile equipment.</div>
    </div>

    <div style="text-align:center;margin:20px 0 16px;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/phlebotomist"
        style="display:inline-block;background:#E53E3E;color:#fff;text-decoration:none;padding:13px 32px;border-radius:9px;font-weight:700;font-size:14px;">
        Open My Dashboard →
      </a>
    </div>
  </td></tr>

  <tr><td style="padding:16px 0;text-align:center;">
    <p style="font-size:11px;color:#A0AEC0;margin:0;">🩸 HemoVisit · Jaffna, Sri Lanka · 2026</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

// ── Public email functions ─────────────────────────────────────

const sendAdminBookingAlert = async (booking, patient) => {
  await getTransporter().sendMail({
    from:    `"HemoVisit 🩸" <${process.env.EMAIL_USER}>`,
    to:      process.env.ADMIN_EMAIL,
    subject: `🩸 New Booking: ${booking.bookingId} — ${patient.name}`,
    html:    adminTemplate(booking, patient),
  });
  console.log(`📧 Admin alert sent for ${booking.bookingId}`);
};

const sendPatientConfirmation = async (booking, patient) => {
  await getTransporter().sendMail({
    from:    `"HemoVisit 🩸" <${process.env.EMAIL_USER}>`,
    to:      patient.email,
    subject: `✅ Booking Confirmed — ${booking.bookingId} | HemoVisit`,
    html:    patientTemplate(booking, patient),
  });
  console.log(`📧 Patient confirmation sent to ${patient.email}`);
};

const sendPhlebotomistAssignment = async (booking, patient, phlebotomist) => {
  if (!phlebotomist?.email) return;
  await getTransporter().sendMail({
    from:    `"HemoVisit 🩸" <${process.env.EMAIL_USER}>`,
    to:      phlebotomist.email,
    subject: `🧪 New Job Assigned — ${booking.bookingId} | HemoVisit`,
    html:    phlebotomistTemplate(booking, patient, phlebotomist),
  });
  console.log(`📧 Assignment email sent to ${phlebotomist.email}`);
};

// Send both admin + patient emails together
// Uses Promise.allSettled so one failure never blocks the other
const sendBookingEmails = async (booking, patient) => {
  const results = await Promise.allSettled([
    sendAdminBookingAlert(booking, patient),
    sendPatientConfirmation(booking, patient),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`📧 ${i === 0 ? "Admin" : "Patient"} email failed:`, r.reason?.message);
    }
  });
};

module.exports = {
  sendBookingEmails,
  sendAdminBookingAlert,
  sendPatientConfirmation,
  sendPhlebotomistAssignment,
};