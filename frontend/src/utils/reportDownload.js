import api from "./api";

/**
 * Download a lab report PDF.
 *
 * Reports are no longer public files: GET /api/reports/:id/file needs the
 * signed-in user's token, which lives in sessionStorage and cannot be put
 * on a plain link. So fetch it with the token (api.js adds it), then hand
 * the browser a temporary blob URL to save.
 */
export async function downloadReport(report) {
  const res = await api.get(`/reports/${report._id}/file`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Report_${report.reportId || "report"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
