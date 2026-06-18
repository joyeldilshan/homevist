import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

const STATUS = {
  collected:   { color:"#3182CE", bg:"#EBF8FF", border:"#BEE3F8", label:"Collected"   },
  sent_to_lab: { color:"#3182CE", bg:"#EBF8FF", border:"#BEE3F8", label:"Sent to Lab" },
  received:    { color:"#805AD5", bg:"#FAF5FF", border:"#E9D8FD", label:"Received"    },
  processing:  { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Processing"  },
  completed:   { color:"#38A169", bg:"#F0FFF4", border:"#C6F6D5", label:"Completed"   },
};

const normalizeStatus = (status) => (status ? String(status).toLowerCase().trim() : "");

function Badge({ status }) {
  const c = STATUS[normalizeStatus(status)] || STATUS.sent_to_lab;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
      <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:20, padding:28, width:"100%", maxWidth:460, maxHeight:"85vh", overflowY:"auto", boxShadow:"var(--shadow-lg)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:19, fontWeight:800, letterSpacing:-0.3 }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"var(--surface2)", border:"none", cursor:"pointer", fontSize:14 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MLTDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,         setTab]         = useState("samples");
  const [samples,     setSamples]     = useState([]);
  const [reports,     setReports]     = useState([]);
  const [sideOpen,    setSideOpen]    = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [debug,       setDebug]       = useState("");

  const [file,        setFile]        = useState(null);
  const [labComments, setLabComments] = useState("");
  const [dragActive,  setDragActive]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef(null);
  const loadingRef   = useRef(false);   // prevents overlapping polls

  // Robust: pull the samples array out no matter the response shape
  const extractArray = (data, key) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data[key] || data.data || data.results || [];
  };

  const load = async () => {
    // Skip if a previous poll is still running (stops requests piling up)
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      // 1) Samples FIRST and independently — reports must never block this
      try {
        const s = await api.get("/samples");
        const sampleArr = extractArray(s.data, "samples");
        setSamples(sampleArr);
        const statuses = sampleArr.map(x => x.status).join(", ") || "none";
        setDebug(`Loaded ${sampleArr.length} sample(s) · statuses: [${statuses}]`);
      } catch(e) {
        setDebug("SAMPLES ERROR: " + (e?.response?.status || "") + " " + (e?.response?.data?.message || e.message));
      }
      // 2) Reports SECOND and independently — a failure here won't hide samples
      try {
        const r = await api.get("/reports");
        setReports(extractArray(r.data, "reports"));
      } catch(e) {
        console.error("REPORTS ERROR:", e?.response?.data || e.message);
      }
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);  // poll every 10s (was 5s)
    return () => clearInterval(interval);
  }, []);

  const moveStatus = async (id, status) => {
    try {
      await api.patch(`/samples/${id}/status`, { status });
      toast.success(`Sample → ${STATUS[status]?.label || status}`);
      load();
    } catch(e) { toast.error(e.response?.data?.message || "Update failed."); }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const validateAndSet = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Only PDF files are allowed."); return; }
    if (f.size > 10 * 1024 * 1024)    { toast.error("File must be under 10 MB."); return; }
    setFile(f);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSet(e.dataTransfer.files[0]);
  };
  const handleBrowse = (e) => { if (e.target.files && e.target.files[0]) validateAndSet(e.target.files[0]); };
  const openReportModal = (sample) => { setReportModal(sample); setFile(null); setLabComments(""); setDragActive(false); };

  const saveReport = async () => {
    if (!file) { toast.error("Please drop or select a PDF file."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("report", file);
      fd.append("sampleId", reportModal._id);
      fd.append("labComments", labComments);

      // Use fetch and DO NOT set Content-Type — the browser adds
      // "multipart/form-data; boundary=..." automatically. Setting it by
      // hand drops the boundary and makes multer hang forever.
      const token = localStorage.getItem("token");
      const base  = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const resp = await fetch(`${base}/reports`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (!resp.ok) {
        let msg = "Upload failed.";
        try { const j = await resp.json(); msg = j.message || msg; } catch {}
        throw new Error(msg);
      }

      toast.success("Report uploaded! You can now send it.");
      setReportModal(null); setFile(null); setLabComments(""); load();
    } catch(e) {
      toast.error(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const sendReport = async (reportId) => {
    if (!window.confirm("Send this report to the patient by email?")) return;
    const tId = toast.loading("Sending report...");
    try {
      await api.patch(`/reports/${reportId}/send`);
      toast.success("📧 Report emailed to patient!", { id:tId });
      load();
    } catch(e) { toast.error(e.response?.data?.message || "Send failed.", { id:tId }); }
  };

  const reportForSample = (sampleId) =>
    reports.find(r => {
      if (!r.sample) return false;
      const id = typeof r.sample === "object" ? r.sample._id : r.sample;
      return String(id) === String(sampleId);
    });

  // INCOMING = anything that is NOT completed. This way no status can hide a sample.
  const incoming  = samples.filter(s => normalizeStatus(s.status) !== "completed");
  const done      = samples.filter(s => normalizeStatus(s.status) === "completed");
  const testNames = (s) => s.testTypes?.map(t => t.name).join(", ") || "—";

  const TABS = [
    { id:"samples", icon:"🧫", label:"Incoming Samples", badge:incoming.length },
    { id:"reports", icon:"📄", label:"Reports" },
    { id:"history", icon:"✅", label:"Completed" },
  ];

  const Sidebar = () => (
    <aside style={{ width:240, background:"#fff", borderRight:"1px solid var(--border)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:2, flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"#1E6F5C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🧬</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>HemoVisit Lab</span>
      </div>
      <div style={{ margin:"0 4px 14px", padding:"10px 14px", borderRadius:10, background:"#F0FBF7", border:"1.5px solid #C3EDDE" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#1E6F5C", textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>MLT Console</div>
        <div style={{ fontSize:12, color:"var(--text3)" }}>Lab Technician</div>
      </div>
      {TABS.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setSideOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", background:tab===t.id?"#F0FBF7":"transparent", color:tab===t.id?"#1E6F5C":"var(--text2)", fontFamily:"var(--font)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{ flex:1 }}>{t.label}</span>
          {t.badge > 0 && <span style={{ background:"#1E6F5C", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
        </button>
      ))}
      <div style={{ marginTop:"auto", padding:"12px 14px", borderRadius:12, background:"var(--bg)", border:"1px solid var(--border)" }}>
        <div style={{ fontWeight:700, fontSize:13 }}>{user?.name||"MLT"}</div>
        <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10 }}>Lab Technician</div>
        <button onClick={() => { logout(); navigate("/login"); }} style={{ width:"100%", padding:"8px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", color:"var(--text3)", fontFamily:"var(--font)", fontSize:12, fontWeight:500, cursor:"pointer" }}>Sign Out</button>
      </div>
    </aside>
  );

  const SampleCard = ({ s }) => {
    const rep = reportForSample(s._id);
    const st  = normalizeStatus(s.status);
    return (
      <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"18px 20px", marginBottom:12, borderLeft:`3px solid ${STATUS[st]?.color || "#3182CE"}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{s.patient?.name||"Patient"}</div>
            <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9 }}>
              🧫 {testNames(s)}<br />
              🔖 Sample: {s.sampleId} &nbsp; · &nbsp; Booking: {s.booking?.bookingId||"—"}<br />
              🧪 Collected by: {s.phlebotomist?.name||"—"}
            </div>
          </div>
          <Badge status={s.status} />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(st === "sent_to_lab" || st === "collected") && (
            <button onClick={() => moveStatus(s._id,"received")} style={{ background:"#FAF5FF", color:"#553C9A", border:"1.5px solid #E9D8FD", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:700, fontSize:12 }}>📥 Mark Received</button>
          )}
          {st === "received" && (
            <button onClick={() => moveStatus(s._id,"processing")} style={{ background:"#FFFFF0", color:"#744210", border:"1.5px solid #FEFCBF", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:700, fontSize:12 }}>🔬 Start Processing</button>
          )}
          {st === "processing" && (
            <>
              <button onClick={() => openReportModal(s)} style={{ background:"#EBF8FF", color:"#2C5282", border:"1.5px solid #BEE3F8", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:700, fontSize:12 }}>
                {rep ? "✏ Replace Report" : "📤 Upload Report"}
              </button>
              {rep && (
                <button onClick={() => sendReport(rep._id)} style={{ background:"#1E6F5C", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:700, fontSize:12 }}>
                  📧 Send Report to Patient
                </button>
              )}
            </>
          )}
          {st === "completed" && (
            <span style={{ fontSize:12, color:"#38A169", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#38A169", display:"inline-block" }} />
              Report sent to patient
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", fontFamily:"var(--font)" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.4s ease forwards; }
        @media(max-width:768px){
          .mlt-sidebar{ display:none !important; }
          .mlt-topbar{ display:flex !important; }
          .mlt-pad{ padding:20px 16px !important; padding-top:76px !important; }
          .mlt-stats{ grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>

      <div className="mlt-sidebar hide-mobile"><Sidebar /></div>

      <div className="mlt-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:"#fff", borderBottom:"1px solid var(--border)", zIndex:100, alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <span style={{ fontWeight:800, fontSize:15 }}>🧬 HemoVisit Lab</span>
        <button onClick={() => setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {sideOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)" }} onClick={() => setSideOpen(false)} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#fff" }}>
            <div style={{ padding:"16px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontWeight:800 }}>🧬 Lab</span>
              <button onClick={() => setSideOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:12 }}><Sidebar /></div>
          </div>
        </div>
      )}

      <main className="mlt-pad" style={{ flex:1, padding:"32px 40px", overflowY:"auto" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>

          <div className="mlt-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
            {[
              { icon:"🧫", label:"Incoming",   value:incoming.length,                                                          color:"#3182CE" },
              { icon:"🔬", label:"Processing", value:samples.filter(s=>normalizeStatus(s.status)==="processing").length,        color:"#D69E2E" },
              { icon:"📄", label:"Reports",    value:reports.length,                                                           color:"#805AD5" },
              { icon:"✅", label:"Completed",  value:done.length,                                                              color:"#38A169" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:18, boxShadow:"var(--shadow-sm)" }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:11, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {tab === "samples" && (
            <div className="fade-up">
              <h1 style={{ fontSize:"clamp(22px,4vw,30px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Incoming Samples</h1>
              <p style={{ color:"var(--text3)", fontSize:14, marginBottom:24 }}>Process samples through the lab pipeline</p>
              {incoming.length === 0
                ? <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧫</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>No incoming samples</div>
                  </div>
                : incoming.map(s => <SampleCard key={s._id} s={s} />)
              }
            </div>
          )}

          {tab === "reports" && (
            <div className="fade-up">
              <h1 style={{ fontSize:"clamp(22px,4vw,30px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Reports</h1>
              <p style={{ color:"var(--text3)", fontSize:14, marginBottom:24 }}>{reports.length} reports created</p>
              {reports.length === 0
                ? <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>No reports yet</div>
                  </div>
                : reports.map(r => (
                  <div key={r._id} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"18px 20px", marginBottom:12, borderLeft:`3px solid ${r.sentToPatient?"#38A169":"#D69E2E"}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{r.patient?.name||"Patient"}</div>
                        <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.8 }}>
                          📄 {r.reportId} &nbsp;·&nbsp; 🔖 {r.booking?.bookingId||"—"}<br />
                          🔗 <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ color:"#3182CE" }}>View PDF</a>
                          {r.labComments && <><br />💬 {r.labComments}</>}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                        {r.sentToPatient
                          ? <span style={{ fontSize:11, fontWeight:700, color:"#38A169" }}>✅ Sent {r.sentAt?new Date(r.sentAt).toLocaleDateString():""}</span>
                          : <button onClick={() => sendReport(r._id)} style={{ background:"#1E6F5C", color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:700, fontSize:12 }}>📧 Send to Patient</button>
                        }
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {tab === "history" && (
            <div className="fade-up">
              <h1 style={{ fontSize:"clamp(22px,4vw,30px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Completed</h1>
              <p style={{ color:"var(--text3)", fontSize:14, marginBottom:24 }}>{done.length} completed samples</p>
              {done.length === 0
                ? <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>No completed samples yet</div>
                  </div>
                : done.map(s => <SampleCard key={s._id} s={s} />)
              }
            </div>
          )}
        </div>
      </main>

      {reportModal && (
        <Modal title="Upload Report" onClose={() => setReportModal(null)}>
          <div style={{ background:"#F0FBF7", border:"1.5px solid #C3EDDE", borderRadius:10, padding:"12px 16px", marginBottom:18, fontSize:13, color:"#1E6F5C" }}>
            Patient: <strong>{reportModal.patient?.name}</strong><br />
            Tests: {testNames(reportModal)}<br />
            Sample: {reportModal.sampleId}
          </div>
          <div
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ border:`2px dashed ${dragActive ? "#1E6F5C" : file ? "#38A169" : "var(--border2)"}`, borderRadius:14, padding:"32px 20px", textAlign:"center", cursor:"pointer", background:dragActive ? "#F0FBF7" : file ? "#F0FFF4" : "var(--bg)", transition:"all 0.2s", marginBottom:16 }}>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleBrowse} style={{ display:"none" }} />
            {file ? (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#276749", marginBottom:4 }}>{file.name}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{(file.size/1024/1024).toFixed(2)} MB · click to change</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>{dragActive ? "📥" : "⬆️"}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--text2)", marginBottom:4 }}>{dragActive ? "Drop the PDF here" : "Drag & drop your report PDF"}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>or click to browse · PDF only · max 10 MB</div>
              </>
            )}
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>Lab Comments (optional)</label>
            <textarea className="inp" rows={3} placeholder="Any notes for the patient..." value={labComments} onChange={e=>setLabComments(e.target.value)} style={{ resize:"vertical" }} />
          </div>
          <button className="btn btn-primary btn-full" onClick={saveReport} disabled={uploading || !file} style={{ background:"#1E6F5C", opacity:(uploading||!file)?0.6:1 }}>
            {uploading ? "Uploading..." : "Upload Report"}
          </button>
        </Modal>
      )}
    </div>
  );
}