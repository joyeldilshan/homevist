const PDFDocument = require("pdfkit");
const bwipjs      = require("bwip-js");
const QRCode      = require("qrcode");
const path        = require("path");
const fs          = require("fs");
const { formatDate, formatAppointment } = require("./format");
const locale = require("../config/locale");
const logger = require("../utils/logger");

const { newFileName, pathFor, ensureDir } = require("./reportFiles");

// ── Colour palette ────────────────────────────────────────────────
const RED   = "#C62828";
const DARK  = "#1A1A2E";
const GREY  = "#F5F5F5";
const MUTED = "#757575";

/**
 * generateReport(booking, { results, remarks })
 *
 * booking must be populated: user, testType (or testTypes), phlebotomist.
 * results: the measured values, one row per parameter:
 *   [{ name, result, unit?, refRange?, flag? }]   flag: "H" | "L" | ""
 * remarks: optional free text from the laboratory, printed as given.
 *
 * Honesty rules (this generator used to break all of them):
 *   - No results, no report. It refuses rather than print defaults: it
 *     once fell back to a hard-coded "mock" full blood count.
 *   - Nothing clinical is invented: no named signatory, no registration
 *     number, no fixed "results are within acceptable ranges" remark.
 *     The authorising signature line is left blank for the laboratory.
 *   - Units and reference ranges are printed only as supplied with the
 *     results (CLINICAL_REVIEW.md: the catalogue's ranges are unreviewed).
 *
 * Not currently called anywhere: reports are PDFs uploaded by the lab.
 */
class ReportDataError extends Error {}

function validateResults(results, testLabel) {
  if (!Array.isArray(results) || results.length === 0) {
    throw new ReportDataError(`Cannot generate a report for ${testLabel}: no results were provided. Reports are only produced from real results.`);
  }
  results.forEach((r, i) => {
    const value = r?.result;
    if (!r?.name || value === undefined || value === null || String(value).trim() === "") {
      throw new ReportDataError(`Cannot generate a report for ${testLabel}: result ${i + 1}${r?.name ? ` (${r.name})` : ""} has no value.`);
    }
  });
}

async function generateReport(booking, { results, remarks } = {}) {
  const testLabel = booking?.testTypes?.length
    ? booking.testTypes.map((t) => t.name).join(", ")
    : (booking?.testType?.name || "this booking");
  validateResults(results, testLabel);

  // Same private folder and random naming as uploaded reports.
  ensureDir();
  const fileName = newFileName();
  const filePath = pathFor(fileName);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const W = doc.page.width;
  const usable = W - 100; // 50mm margin each side

  // ── 1. HEADER BAR ──────────────────────────────────────────────
  doc.rect(50, 50, usable, 70).fill(RED);
  doc
    .fillColor("white")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("HemoVisit", 65, 64);
  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Home blood collection service", 65, 92)
    .text(`${locale.organisation.cityCountry} · ${locale.organisation.phone} · ${locale.organisation.website}`, 65, 106);

  doc
    .fontSize(8)
    .text("LABORATORY TEST REPORT", 0, 72, { align: "right", width: W - 65 })
    .text(`Report ID: HV-RPT-${booking._id.toString().slice(-6).toUpperCase()}`, 0, 86, { align: "right", width: W - 65 })
    .text(`Booking ID: ${booking.bookingId}`, 0, 100, { align: "right", width: W - 65 });

  // ── 2. BARCODE + QR SCAN STRIP ─────────────────────────────────
  const scanY = 132;
  doc.rect(50, scanY, usable, 90).fill(GREY).stroke("#E0E0E0");

  // Label
  doc
    .fillColor(RED)
    .fontSize(7)
    .font("Helvetica-Bold")
    .text("SCAN TO IDENTIFY PATIENT — LAB USE ONLY", 60, scanY + 8, { align: "center", width: usable - 20 });

  // Generate CODE-128 barcode PNG buffer
  const barcodeValue = booking.barcodeValue || `HV-${booking.bookingId}`;
  let barcodeBuf;
  try {
    barcodeBuf = await bwipjs.toBuffer({
      bcid:        "code128",
      text:        barcodeValue,
      scale:       2,
      height:      12,
      includetext: false,
      backgroundcolor: "F5F5F5",
    });
  } catch (e) {
    logger.error("Barcode generation error:", e.message);
  }

  // Generate QR PNG buffer
  const qrPayload = [
    "HEMOVISIT PATIENT RECORD",
    `Booking ID  : ${booking.bookingId}`,
    `Patient     : ${booking.user.name}`,
    `Age/Gender  : ${booking.user.age || "—"} / ${booking.user.gender || "—"}`,
    `Phone       : ${booking.user.phone}`,
    `Test        : ${testLabel}`,
    `Date        : ${formatAppointment(booking.appointmentDate, booking.appointmentTime)}`,
    `Phlebotomist: ${booking.phlebotomist?.name || "—"}`,
    `Status      : ${booking.status.toUpperCase()}`,
    // Only when a real verification page is configured.
    ...(process.env.VERIFY_BASE_URL ? [`Verify      : ${process.env.VERIFY_BASE_URL}/${booking.bookingId}`] : []),
  ].join("\n");

  let qrBuf;
  try {
    qrBuf = await QRCode.toBuffer(qrPayload, {
      type:  "png",
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch (e) {
    logger.error("QR generation error:", e.message);
  }

  // Place barcode image (left-centre of strip)
  if (barcodeBuf) {
    doc.image(barcodeBuf, 70, scanY + 22, { width: 320, height: 44 });
  }
  // Barcode text
  doc
    .fillColor(DARK)
    .font("Courier-Bold")
    .fontSize(8)
    .text(barcodeValue, 70, scanY + 70, { width: 320, align: "center" });

  // Place QR image (right of strip)
  if (qrBuf) {
    doc.image(qrBuf, W - 130, scanY + 8, { width: 72, height: 72 });
  }
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(6.5)
    .text("Scan QR for full details", W - 135, scanY + 82, { width: 80, align: "center" });

  // ── 3. TEST NAME TITLE ─────────────────────────────────────────
  const titleY = scanY + 100;
  doc.rect(50, titleY, usable, 24).fill("#FFEBEE");
  doc
    .fillColor(RED)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`TEST REPORT — ${testLabel.toUpperCase()}`, 60, titleY + 7, { width: usable - 20, align: "center" });

  // ── 4. PATIENT + BOOKING INFO ──────────────────────────────────
  const infoY = titleY + 34;
  const colW  = usable / 2 - 6;

  const drawInfoBlock = (heading, data, x, y, w) => {
    doc.rect(x, y, w, 14).fill(GREY);
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(9).text(heading, x + 4, y + 3);
    let rowY = y + 16;
    data.forEach(([k, v]) => {
      doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(k, x + 4, rowY, { width: w * 0.38 });
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text(v || "—", x + w * 0.40, rowY, { width: w * 0.58 });
      doc.moveTo(x, rowY + 11).lineTo(x + w, rowY + 11).strokeColor("#E0E0E0").lineWidth(0.5).stroke();
      rowY += 13;
    });
    return rowY;
  };

  const patientRows = [
    ["Name",        booking.user.name],
    ["Age / Gender",`${booking.user.age || "—"} / ${booking.user.gender || "—"}`],
    ["Patient ID",  `PT-${booking.user._id.toString().slice(-5).toUpperCase()}`],
    ["Phone",       booking.user.phone],
    ["Address",     booking.address],
  ];
  const bookingRows = [
    ["Booking ID",   booking.bookingId],
    ["Collected",    `${formatAppointment(booking.appointmentDate, booking.appointmentTime)}`],
    ["Report Date",  formatDate(new Date())],
    ["Phlebotomist", booking.phlebotomist?.name || "—"],
    ["Service",      booking.isHomeVisit ? "Home Visit" : "Lab Visit"],
  ];

  const endPatient = drawInfoBlock("PATIENT INFORMATION", patientRows, 50, infoY, colW);
  const endBooking = drawInfoBlock("BOOKING DETAILS",     bookingRows, 50 + colW + 12, infoY, colW);
  const afterInfo  = Math.max(endPatient, endBooking) + 10;

  // ── 5. RESULTS TABLE ──────────────────────────────────────────
  doc.moveTo(50, afterInfo).lineTo(50 + usable, afterInfo).strokeColor(RED).lineWidth(1.5).stroke();
  doc.fillColor(RED).font("Helvetica-Bold").fontSize(10).text("TEST RESULTS", 50, afterInfo + 6);
  doc.moveTo(50, afterInfo + 20).lineTo(50 + usable, afterInfo + 20).strokeColor("#E0E0E0").lineWidth(0.5).stroke();

  // Table header
  const tblY   = afterInfo + 24;
  const cols   = [0.36, 0.14, 0.13, 0.29, 0.08];
  const colXs  = cols.reduce((acc, w, i) => {
    acc.push(i === 0 ? 50 : acc[i - 1] + cols[i - 1] * usable);
    return acc;
  }, []);
  const headers = ["Test Parameter", "Result", "Unit", "Reference Range", "Flag"];

  doc.rect(50, tblY, usable, 16).fill(DARK);
  headers.forEach((h, i) => {
    doc.fillColor("white").font("Helvetica-Bold").fontSize(8)
       .text(h, colXs[i] + 3, tblY + 4, { width: cols[i] * usable - 6, align: "center" });
  });

  // Only the measured values passed in. (This used to read the catalogue's
  // parameter list, which holds no results, and fell back to a made-up CBC.)
  const parameters = results;

  let rowY = tblY + 18;
  parameters.forEach((p, i) => {
    const bg = i % 2 === 0 ? GREY : "white";
    doc.rect(50, rowY, usable, 14).fill(bg);

    const flagColor = p.flag === "H" ? "#C62828" : p.flag === "L" ? "#F57F17" : DARK;
    const vals = [p.name, String(p.result), p.unit, p.refRange, p.flag || ""];
    vals.forEach((v, ci) => {
      const isResult = ci === 1;
      doc
        .fillColor(isResult && p.flag ? flagColor : DARK)
        .font(isResult ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(v || "—", colXs[ci] + 3, rowY + 3, { width: cols[ci] * usable - 6, align: ci === 0 ? "left" : "center" });
    });
    doc.moveTo(50, rowY + 14).lineTo(50 + usable, rowY + 14).strokeColor("#E0E0E0").lineWidth(0.3).stroke();
    rowY += 14;
  });

  // Legend: only what the flags mean, and only if any row is flagged.
  if (parameters.some((p) => p.flag)) {
    rowY += 6;
    doc.rect(50, rowY, usable, 16).fill(GREY);
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
       .text("Flags:  H = above the reference range given  |  L = below the reference range given",
         56, rowY + 4, { width: usable - 12 });
    rowY += 18;
  }
  rowY += 6;

  // ── 6. REMARKS: only the laboratory's own, if it gave any ─────
  if (remarks && String(remarks).trim()) {
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(9).text("LABORATORY REMARKS", 50, rowY);
    doc.moveTo(50, rowY + 13).lineTo(50 + usable, rowY + 13).strokeColor("#E0E0E0").lineWidth(0.5).stroke();
    doc.fillColor(DARK).font("Helvetica").fontSize(8.5).text(String(remarks).trim(), 50, rowY + 18, { width: usable, lineGap: 2 });
    rowY = doc.y + 12;
  }

  // ── 7. SIGNATURES ─────────────────────────────────────────────
  // Who collected the sample comes from the booking. The authorising
  // signature is left blank for the laboratory: this application does not
  // know who reported the result, so it must not name anyone.
  const sigColW = usable / 2 - 10;
  [[50, "", "Authorised by the processing laboratory"],
   [50 + sigColW + 20, booking.phlebotomist?.name || "—", "Sample collected by (phlebotomist)"],
  ].forEach(([x, name, title]) => {
    doc.moveTo(x, rowY + 24).lineTo(x + sigColW, rowY + 24).strokeColor(DARK).lineWidth(0.5).stroke();
    if (name) doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text(name, x, rowY + 28);
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(title, x, rowY + (name ? 40 : 28));
  });
  rowY += 56;

  // ── 8. FOOTER ─────────────────────────────────────────────────
  doc.moveTo(50, rowY).lineTo(50 + usable, rowY).strokeColor(RED).lineWidth(1.5).stroke();
  rowY += 6;
  doc.rect(50, rowY, usable, 36).fill(GREY);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("Laboratory report · Analysed by the processing laboratory", 58, rowY + 6);
  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
     .text(`${locale.organisation.addressLine}  |  Tel: ${locale.organisation.phone}  |  ${locale.organisation.website}`, 58, rowY + 18);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(7)
     .text(`Report ID: HV-RPT-${booking._id.toString().slice(-6).toUpperCase()}  |  Booking: ${booking.bookingId}  |  Generated electronically.`,
       0, rowY + 18, { align: "right", width: W - 65 });
  rowY += 44;

  // Disclaimer
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(6.5)
     .text(
       "DISCLAIMER: This report is based on samples collected via HemoVisit's mobile phlebotomy service. " +
       "Results must be interpreted by a qualified medical professional. Valid only with authorised signature.",
       50, rowY, { width: usable, align: "center" }
     );

  doc.end();

  return new Promise((resolve, reject) => {
    // The stored name: set it as LabReport.fileName to serve it.
    stream.on("finish", () => resolve(fileName));
    stream.on("error",  reject);
  });
}

module.exports = { generateReport, ReportDataError };
