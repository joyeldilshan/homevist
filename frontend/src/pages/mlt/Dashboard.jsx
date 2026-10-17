import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/format";
import {
  Shell, PageHeader, Stats, StatusPill, LoadingCards, EmptyState, ErrorState, Button, Field, Modal, Meta, Card, I,
} from "../../dashboard/kit";
import { testNames } from "../../dashboard/status";

/**
 * Lab technician (MLT) dashboard. Same API calls and 10-second polling as
 * before; the shared shell replaces the page's own sidebar and styles.
 */

const NAV = [
  { id: "samples", label: "Incoming samples", short: "Samples", icon: "inbox" },
  { id: "reports", label: "Reports",          icon: "file"  },
  { id: "history", label: "Completed",        icon: "check" },
];

const norm = (s) => (s ? String(s).toLowerCase().trim() : "");
const TONE = { collected: "blue", sent_to_lab: "blue", received: "violet", processing: "amber", completed: "green" };
const MAX_MB = 10;

export default function MLTDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,         setTab]         = useState("samples");
  const [samples,     setSamples]     = useState([]);
  const [reports,     setReports]     = useState([]);
  const [status,      setStatus]      = useState("loading");
  const [loadError,   setLoadError]   = useState("");
  const [reportModal, setReportModal] = useState(null);
  const [sendTarget,  setSendTarget]  = useState(null);
  const [sendingId,   setSendingId]   = useState(null);
  const [movingId,    setMovingId]    = useState(null);

  const [file,        setFile]        = useState(null);
  const [labComments, setLabComments] = useState("");
  const [dragActive,  setDragActive]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef(null);
  const loadingRef   = useRef(false);   // stops overlapping polls

  // Pull the array out whatever the response shape.
  const extractArray = (data, key) => (!data ? [] : Array.isArray(data) ? data : data[key] || data.data || data.results || []);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      // Both at once, settled independently: a reports failure must not hide
      // the sample queue. Rendering only after both means the stat tiles
      // never flash "0 reports" while the second request is in flight.
      const [s, r] = await Promise.allSettled([api.get("/samples"), api.get("/reports")]);
      if (r.status === "fulfilled") setReports(extractArray(r.value.data, "reports"));
      if (s.status === "fulfilled") {
        setSamples(extractArray(s.value.data, "samples"));
        setLoadError(""); setStatus("ready");
      } else {
        setLoadError(s.reason?.response?.data?.message || "We could not load the sample queue.");
        setStatus((st) => (st === "ready" ? st : "error"));   // keep showing data we already have
      }
    } finally { loadingRef.current = false; }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const moveStatus = async (id, next) => {
    setMovingId(id);
    try {
      await api.patch(`/samples/${id}/status`, { status: next });
      toast.success(next === "received" ? "Sample marked received." : "Processing started.");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Update failed."); }
    finally { setMovingId(null); }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const validateAndSet = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Only PDF files are allowed."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`File must be under ${MAX_MB} MB.`); return; }
    setFile(f);
  };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); validateAndSet(e.dataTransfer.files?.[0]); };
  const openReportModal = (sample) => { setReportModal(sample); setFile(null); setLabComments(""); setDragActive(false); };

  const saveReport = async () => {
    if (!file) { toast.error("Choose a PDF file first."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("report", file);
      fd.append("sampleId", reportModal._id);
      fd.append("labComments", labComments);
      // fetch without a Content-Type header: the browser adds the multipart
      // boundary itself. Setting it by hand drops the boundary and multer hangs.
      const token = sessionStorage.getItem("token");
      const base  = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const resp  = await fetch(`${base}/reports`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      if (!resp.ok) {
        let msg = "Upload failed.";
        try { msg = (await resp.json()).message || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }
      toast.success("Report uploaded. You can now send it to the patient.");
      setReportModal(null); setFile(null); setLabComments(""); load();
    } catch (e) { toast.error(e.message || "Upload failed."); }
    finally { setUploading(false); }
  };

  const sendReport = async () => {
    const id = sendTarget?._id;
    setSendTarget(null);
    if (!id) return;
    setSendingId(id);
    try {
      await api.patch(`/reports/${id}/send`);
      toast.success("Report sent to the patient.");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Send failed."); }
    finally { setSendingId(null); }
  };

  const reportForSample = (sampleId) =>
    reports.find((r) => r.sample && String(typeof r.sample === "object" ? r.sample._id : r.sample) === String(sampleId));

  // Incoming = anything not completed, so no unexpected status can hide a sample.
  const incoming   = samples.filter((s) => norm(s.status) !== "completed");
  const done       = samples.filter((s) => norm(s.status) === "completed");
  const processing = samples.filter((s) => norm(s.status) === "processing");
  const nav = NAV.map((n) => ({ ...n, badge: n.id === "samples" ? incoming.length : 0 }));
  const signOut = () => { logout(); navigate("/login"); };

  const SampleCard = (s, i) => {
    const rep = reportForSample(s._id);
    const st  = norm(s.status);
    return (
      <Card key={s._id} i={i} tone={TONE[st] || "blue"}>
        <div className="db-row" data-sample={s.sampleId}>
          <div className="db-row-main">
            <h3 className="db-card-title">{s.patient?.name || "Patient"}</h3>
            <div className="db-metas">
              <Meta icon="tube">{testNames(s)}</Meta>
              <span className="db-code">Sample {s.sampleId}</span>
              <span className="db-code">Booking {s.booking?.bookingId || "—"}</span>
              <Meta icon="user">Collected by {s.phlebotomist?.name || "—"}</Meta>
            </div>
          </div>
          <div className="db-row-side"><StatusPill status={st} kind="sample" /></div>
        </div>
        <div className="db-actions">
          {(st === "sent_to_lab" || st === "collected") && (
            <Button size="sm" icon="inbox" busy={movingId === s._id} onClick={() => moveStatus(s._id, "received")}>Mark received</Button>
          )}
          {st === "received" && (
            <Button size="sm" icon="flask" busy={movingId === s._id} onClick={() => moveStatus(s._id, "processing")}>Start processing</Button>
          )}
          {st === "processing" && (
            <>
              <Button size="sm" variant={rep ? "ghost" : "primary"} icon="upload" onClick={() => openReportModal(s)}>{rep ? "Replace report" : "Upload report"}</Button>
              {rep && <Button size="sm" icon="mail" busy={sendingId === rep._id} onClick={() => setSendTarget(rep)}>Send report to patient</Button>}
            </>
          )}
          {st === "completed" && <span className="db-meta"><I.check size={16} />Report sent to the patient</span>}
        </div>
      </Card>
    );
  };

  const loadingOrError = status === "loading" ? <LoadingCards count={3} label="Loading samples" />
    : status === "error" ? <ErrorState message={loadError} onRetry={load} /> : null;

  return (
    <Shell role="Lab technician" items={nav} active={tab} onNavigate={setTab} user={user} onSignOut={signOut}>
      {tab === "samples" && (
        <>
          <PageHeader eyebrow="Laboratory" title="Incoming samples." sub="Receive, process and report. The queue refreshes every 10 seconds." />
          {loadingOrError || (
            <>
              <Stats items={[
                { label: "Incoming",   value: incoming.length,   icon: "inbox", tone: "blue"   },
                { label: "Processing", value: processing.length, icon: "flask", tone: "amber"  },
                { label: "Reports",    value: reports.length,    icon: "file",  tone: "violet" },
                { label: "Completed",  value: done.length,       icon: "check", tone: "green"  },
              ]} />
              <div style={{ height: 22 }} />
              {incoming.length
                ? <div className="db-stack">{incoming.map(SampleCard)}</div>
                : <EmptyState icon="inbox" title="No incoming samples">Samples appear here when a phlebotomist sends them to the lab.</EmptyState>}
            </>
          )}
        </>
      )}

      {tab === "reports" && (
        <>
          <PageHeader eyebrow="Laboratory" title="Reports." sub={`${reports.length} report${reports.length === 1 ? "" : "s"} uploaded`} />
          {reports.length === 0
            ? <EmptyState icon="file" title="No reports yet">Upload a report from a sample that is being processed.</EmptyState>
            : <div className="db-stack">
                {reports.map((r, i) => (
                  <Card key={r._id} i={i} tone={r.sentToPatient ? "green" : "amber"}>
                    <div className="db-row">
                      <div className="db-row-main">
                        <h3 className="db-card-title">{r.patient?.name || "Patient"}</h3>
                        <div className="db-metas">
                          <span className="db-code">Report {r.reportId}</span>
                          <span className="db-code">Booking {r.booking?.bookingId || "—"}</span>
                          {r.fileUrl && <a className="db-meta" href={r.fileUrl} target="_blank" rel="noreferrer"><I.file size={15} />View PDF</a>}
                        </div>
                        {r.labComments && <p className="db-note-box">{r.labComments}</p>}
                      </div>
                      <div className="db-row-side">
                        {r.sentToPatient
                          ? <span className="db-pill tone-green"><span className="db-pill-dot" />Sent {r.sentAt ? formatDate(r.sentAt) : ""}</span>
                          : <Button size="sm" icon="mail" busy={sendingId === r._id} onClick={() => setSendTarget(r)}>Send to patient</Button>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>}
        </>
      )}

      {tab === "history" && (
        <>
          <PageHeader eyebrow="Laboratory" title="Completed." sub={`${done.length} completed sample${done.length === 1 ? "" : "s"}`} />
          {done.length ? <div className="db-stack">{done.map(SampleCard)}</div>
            : <EmptyState icon="check" title="No completed samples yet">Samples move here once their report has been sent.</EmptyState>}
        </>
      )}

      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Upload report">
        {reportModal && (
          <>
            <dl className="db-summary" style={{ marginBottom: 18 }}>
              <div><dt>Patient</dt><dd>{reportModal.patient?.name || "—"}</dd></div>
              <div><dt>Tests</dt><dd>{testNames(reportModal)}</dd></div>
              <div><dt>Sample</dt><dd className="db-code">{reportModal.sampleId}</dd></div>
            </dl>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true"
                   onChange={(e) => validateAndSet(e.target.files?.[0])} />
            <button type="button" className={`db-drop${dragActive ? " is-drag" : ""}${file ? " has-file" : ""}`}
                    onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()} aria-describedby="drop-hint">
              {file ? (
                <>
                  <I.file size={28} />
                  <strong>{file.name}</strong>
                  <span className="db-fineprint">{(file.size / 1024 / 1024).toFixed(2)} MB · choose a different file</span>
                </>
              ) : (
                <>
                  <I.upload size={28} />
                  <strong>{dragActive ? "Drop the PDF here" : "Drop the report PDF here, or choose a file"}</strong>
                  <span id="drop-hint" className="db-fineprint">PDF only · up to {MAX_MB} MB</span>
                </>
              )}
            </button>
            <div style={{ height: 16 }} />
            <Field label="Comments for the patient (optional)">
              <textarea rows={3} placeholder="Anything the patient should know about this report" value={labComments} onChange={(e) => setLabComments(e.target.value)} />
            </Field>
            <Button className="db-btn-block" icon="upload" busy={uploading} disabled={!file} onClick={saveReport}>
              {uploading ? "Uploading…" : "Upload report"}
            </Button>
          </>
        )}
      </Modal>

      <Modal open={!!sendTarget} onClose={() => setSendTarget(null)} title="Send report to patient?">
        <p className="db-sub" style={{ marginTop: 0 }}>
          {sendTarget?.patient?.name || "The patient"} will be emailed the report, and the booking will be marked complete.
        </p>
        <div className="db-actions">
          <Button variant="ghost" onClick={() => setSendTarget(null)}>Not yet</Button>
          <Button icon="mail" onClick={sendReport}>Send report</Button>
        </div>
      </Modal>
    </Shell>
  );
}
