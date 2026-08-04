import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

/* ── Lab-label palette ─────────────────────────────────────── */
const INK      = "#171310";
const CRIMSON  = "#A4133C";
const LAVENDER = "#7C6BAE";
const GOLD     = "#B8892E";
const TEAL     = "#1C7A6B";
const BLUE     = "#3E6C9E";
const GREEN    = "#2E7D57";

const STATUS = {
  collected:   { color:BLUE,     label:"Collected"   },
  sent_to_lab: { color:BLUE,     label:"Sent to Lab" },
  received:    { color:LAVENDER, label:"Received"    },
  processing:  { color:GOLD,     label:"Processing"  },
  completed:   { color:GREEN,    label:"Completed"   },
};

const normalizeStatus = (status) => (status ? String(status).toLowerCase().trim() : "");

function Badge({ status }) {
  const c = STATUS[normalizeStatus(status)] || STATUS.sent_to_lab;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", background:`${c.color}14`, color:c.color, border:`1px solid ${c.color}55`, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(23,19,16,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
      <div style={{ background:"#FBF9F5", border:"1px solid rgba(23,19,16,0.13)", borderRadius:14, padding:28, width:"100%", maxWidth:460, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 30px 70px rgba(23,19,16,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--display)", fontSize:22, fontWeight:900, letterSpacing:"-0.01em", margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(23,19,16,0.06)", border:"none", cursor:"pointer", fontSize:14, color:"rgba(23,19,16,0.6)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SpecimenLabel({ code, name, cap }) {
  return (
    <div className="sl">
      <div className="sl-cap" style={{ background:cap }} />
      <div className="sl-body">
        <span className="sl-code">{code}</span>
        <span className="sl-name">{name}</span>
        <span className="sl-bar" />
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

  // Robust: pull the array out no matter the response shape
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
    const interval = setInterval(load, 10000);  // poll every 10s
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
      // NOTE: token lives in sessionStorage (auto-logout on tab close).
      const token = sessionStorage.getItem("token");
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
    { id:"samples", icon:"🧫", label:"Incoming Samples", cap:BLUE,  badge:incoming.length },
    { id:"reports", icon:"📄", label:"Reports",          cap:GOLD  },
    { id:"history", icon:"✅", label:"Completed",        cap:GREEN },
  ];

  const Sidebar = () => (
    <aside className="side">
      <div className="brand"><span className="brand-dot" style={{ background:`radial-gradient(circle at 35% 35%, #35a893, ${TEAL})` }} />HemoVisit Lab</div>
      <div className="console-chip">
        <div className="console-chip-t">MLT console</div>
        <div className="console-chip-s">Lab technician</div>
      </div>
      {TABS.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setSideOpen(false); }}
          className={`side-tab ${tab===t.id?"on":""}`}>
          <span className="side-cap" style={{ background:t.cap }} />
          <span style={{ fontSize:15 }}>{t.icon}</span>
          <span style={{ flex:1, textAlign:"left" }}>{t.label}</span>
          {t.badge > 0 && <span className="side-badge">{t.badge}</span>}
        </button>
      ))}
      <div className="side-user">
        <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>{user?.name||"MLT"}</div>
        <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(23,19,16,0.45)" }}>Lab technician</div>
      </div>
      <button className="signout" onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
    </aside>
  );

  const SampleCard = ({ s }) => {
    const rep = reportForSample(s._id);
    const st  = normalizeStatus(s.status);
    return (
      <div className="scard" style={{ borderLeft:`4px solid ${STATUS[st]?.color || BLUE}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{s.patient?.name||"Patient"}</div>
            <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.9 }}>
              🧫 {testNames(s)}<br />
              <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>🔖 {s.sampleId}</span> &nbsp;·&nbsp; Booking: <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>{s.booking?.bookingId||"—"}</span><br />
              🧪 Collected by: {s.phlebotomist?.name||"—"}
            </div>
          </div>
          <Badge status={s.status} />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(st === "sent_to_lab" || st === "collected") && (
            <button className="act" style={{ color:LAVENDER, borderColor:`${LAVENDER}55` }} onClick={() => moveStatus(s._id,"received")}>📥 Mark received</button>
          )}
          {st === "received" && (
            <button className="act" style={{ color:GOLD, borderColor:`${GOLD}55` }} onClick={() => moveStatus(s._id,"processing")}>🔬 Start processing</button>
          )}
          {st === "processing" && (
            <>
              <button className="act" style={{ color:BLUE, borderColor:`${BLUE}55` }} onClick={() => openReportModal(s)}>
                {rep ? "✏ Replace report" : "📤 Upload report"}
              </button>
              {rep && (
                <button className="act act-solid" onClick={() => sendReport(rep._id)}>
                  📧 Send report to patient
                </button>
              )}
            </>
          )}
          {st === "completed" && (
            <span style={{ fontFamily:"var(--monof)", fontSize:10.5, letterSpacing:"0.08em", textTransform:"uppercase", color:GREEN, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:GREEN, display:"inline-block" }} />
              Report sent to patient
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ml">
      <style>{`
        .ml {
          --paper:   #F3F0EA;
          --card:    #FBF9F5;
          --ink:     #171310;
          --ink-60:  rgba(23,19,16,0.62);
          --ink-40:  rgba(23,19,16,0.42);
          --rule:    rgba(23,19,16,0.13);
          --teal:    #1C7A6B;
          --display: "Playfair Display", Georgia, serif;
          --sansf:   "DM Sans", system-ui, -apple-system, sans-serif;
          --monof:   "DM Mono", ui-monospace, "SF Mono", monospace;

          min-height: 100vh; min-height: 100dvh;
          background: var(--paper); color: var(--ink);
          font-family: var(--sansf); display: flex; position: relative;
        }
        .ml *, .ml *::before, .ml *::after { box-sizing: border-box; }
        .ml :focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .ml .fade-up { animation: fadeUp .4s ease forwards; }

        .ml h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3.2vw, 34px); letter-spacing: -0.015em; margin: 0 0 4px;
        }
        .ml .sub { color: var(--ink-60); font-size: 14px; margin: 0 0 24px; }

        .ml .sl {
          display: inline-flex; align-items: stretch;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--card); overflow: hidden; margin-bottom: 14px;
        }
        .ml .sl-cap  { width: 7px; }
        .ml .sl-body { padding: 5px 10px; display: flex; align-items: center; gap: 10px; }
        .ml .sl-code { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
        .ml .sl-name { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); }
        .ml .sl-bar {
          width: 36px; align-self: stretch; min-height: 12px; opacity: .7;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        /* sidebar */
        .ml .side {
          width: 246px; flex-shrink: 0;
          background: var(--card); border-right: 1px solid var(--rule);
          padding: 22px 14px; display: flex; flex-direction: column; gap: 3px;
          position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; z-index: 10;
        }
        .ml .brand {
          display: flex; align-items: center; gap: 9px; padding: 4px 10px 2px; margin-bottom: 12px;
          font-family: var(--monof); font-size: 12.5px; font-weight: 500;
          letter-spacing: 0.18em; text-transform: uppercase;
        }
        .ml .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(28,122,107,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(28,122,107,0); }
        }
        .ml .console-chip {
          margin: 0 4px 14px; padding: 10px 12px; border-radius: 8px;
          background: linear-gradient(120deg, var(--ink), #0e3730 80%);
        }
        .ml .console-chip-t { font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; margin-bottom: 2px; }
        .ml .console-chip-s { font-size: 11.5px; color: rgba(255,255,255,0.55); }

        .ml .side-tab {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; width: 100%;
          font-family: var(--sansf); font-size: 13.5px; font-weight: 500;
          color: var(--ink-60); transition: background .15s, color .15s;
        }
        .ml .side-tab:hover { background: rgba(23,19,16,0.05); color: var(--ink); }
        .ml .side-tab.on { background: var(--ink); color: var(--paper); font-weight: 600; }
        .ml .side-cap { width: 4px; height: 17px; border-radius: 2px; flex-shrink: 0; opacity: .4; transition: opacity .15s; }
        .ml .side-tab.on .side-cap, .ml .side-tab:hover .side-cap { opacity: 1; }
        .ml .side-badge {
          background: var(--teal); color: #fff; border-radius: 20px;
          min-width: 19px; height: 19px; padding: 0 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; font-family: var(--monof);
        }
        .ml .side-tab.on .side-badge { background: var(--paper); color: var(--ink); }
        .ml .side-user {
          margin-top: auto; padding: 12px; border-radius: 10px;
          background: var(--paper); border: 1px solid var(--rule);
        }
        .ml .signout {
          margin-top: 8px; padding: 9px; border: 1px solid var(--rule); border-radius: 8px;
          background: transparent; color: var(--ink-60); cursor: pointer;
          font-family: var(--monof); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
          transition: all .15s;
        }
        .ml .signout:hover { border-color: var(--teal); color: var(--teal); }

        /* cards */
        .ml .card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; }
        .ml .scard {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px 20px; margin-bottom: 12px;
          transition: transform .2s, box-shadow .2s;
        }
        .ml .scard:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(23,19,16,0.08); }

        .ml .stat {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px;
          border-top: 3px solid var(--tint, var(--teal));
        }
        .ml .stat-v { font-family: var(--display); font-weight: 900; font-size: clamp(22px,2.6vw,30px); line-height: 1; color: var(--tint, var(--ink)); }
        .ml .stat-l {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-40); margin-top: 8px;
        }

        /* buttons & inputs */
        .ml .act {
          padding: 7px 14px; border-radius: 7px; font-family: var(--sansf);
          font-weight: 700; font-size: 12px; cursor: pointer; transition: all .15s;
          background: transparent; border: 1px solid;
        }
        .ml .act:hover { transform: translateY(-1px); }
        .ml .act-solid {
          background: var(--teal); color: #fff; border-color: transparent;
          box-shadow: 0 6px 16px rgba(28,122,107,0.3);
        }
        .ml .act-solid:hover { background: #145d51; }

        .ml .btn-upload {
          width: 100%; padding: 13px 20px; margin-top: 4px;
          background: var(--teal); color: #fff;
          border: none; border-radius: 9px; cursor: pointer;
          font-family: var(--sansf); font-size: 14px; font-weight: 700;
          box-shadow: 0 8px 22px rgba(28,122,107,0.3);
          transition: background .2s, transform .15s;
        }
        .ml .btn-upload:hover { background: #145d51; transform: translateY(-1px); }
        .ml .btn-upload:disabled { opacity: .6; cursor: default; transform: none; }

        .ml .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-60);
        }
        .ml .inp {
          width: 100%; padding: 11px 13px;
          background: #fff; color: var(--ink);
          border: 1px solid var(--rule); border-radius: 8px;
          font-family: var(--sansf); font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .ml .inp:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 0 3px rgba(28,122,107,0.12); }

        /* mobile */
        .ml .topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(251,249,245,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--rule); z-index: 100;
          align-items: center; justify-content: space-between; padding: 0 16px;
        }
        .ml .overlay { position: fixed; inset: 0; background: rgba(23,19,16,0.45); z-index: 200; }
        .ml .drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 268px; z-index: 210;
          background: var(--card); border-right: 1px solid var(--rule); overflow-y: auto;
        }
        .ml .main { flex: 1; padding: 32px 40px; overflow-y: auto; position: relative; z-index: 1; }
        .ml .inner { max-width: 860px; margin: 0 auto; }

        @media (max-width: 768px) {
          .ml .desktop-side { display: none; }
          .ml .topbar { display: flex; }
          .ml .main { padding: 76px 14px 24px; }
          .ml .stats4 { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ml * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="desktop-side"><Sidebar /></div>

      <div className="topbar">
        <div className="brand" style={{ padding:0, marginBottom:0 }}>
          <span className="brand-dot" style={{ background:`radial-gradient(circle at 35% 35%, #35a893, ${TEAL})` }} />
          HemoVisit Lab
        </div>
        <button onClick={() => setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:INK }}>☰</button>
      </div>

      {sideOpen && (
        <>
          <div className="overlay" onClick={() => setSideOpen(false)} />
          <div className="drawer"><Sidebar /></div>
        </>
      )}

      <main className="main">
        <div className="inner">

          <div className="stats4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:26 }}>
            {[
              { label:"Incoming",   value:incoming.length,                                                    tint:BLUE     },
              { label:"Processing", value:samples.filter(s=>normalizeStatus(s.status)==="processing").length, tint:GOLD     },
              { label:"Reports",    value:reports.length,                                                     tint:LAVENDER },
              { label:"Completed",  value:done.length,                                                        tint:GREEN    },
            ].map(s => (
              <div key={s.label} className="stat" style={{ "--tint":s.tint }}>
                <div className="stat-v">{s.value}</div>
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>

          {tab === "samples" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-40" name="Lab intake" cap={BLUE} />
              <h1>Incoming samples.</h1>
              <p className="sub">Process samples through the lab pipeline</p>
              {incoming.length === 0
                ? <div className="card" style={{ padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧫</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No incoming samples</div>
                  </div>
                : incoming.map(s => <SampleCard key={s._id} s={s} />)
              }
            </div>
          )}

          {tab === "reports" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-41" name="Reports" cap={GOLD} />
              <h1>Reports.</h1>
              <p className="sub">{reports.length} reports created</p>
              {reports.length === 0
                ? <div className="card" style={{ padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No reports yet</div>
                  </div>
                : reports.map(r => (
                  <div key={r._id} className="scard" style={{ borderLeft:`4px solid ${r.sentToPatient?GREEN:GOLD}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{r.patient?.name||"Patient"}</div>
                        <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.8 }}>
                          📄 <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>{r.reportId}</span> &nbsp;·&nbsp; 🔖 <span style={{ fontFamily:"var(--monof)", fontSize:11 }}>{r.booking?.bookingId||"—"}</span><br />
                          🔗 <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ color:TEAL, fontWeight:600 }}>View PDF</a>
                          {r.labComments && <><br />💬 {r.labComments}</>}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                        {r.sentToPatient
                          ? <span style={{ fontFamily:"var(--monof)", fontSize:10.5, letterSpacing:"0.08em", textTransform:"uppercase", color:GREEN }}>✅ Sent {r.sentAt?new Date(r.sentAt).toLocaleDateString():""}</span>
                          : <button className="act act-solid" onClick={() => sendReport(r._id)}>📧 Send to patient</button>
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
              <SpecimenLabel code="HV-42" name="Archive" cap={GREEN} />
              <h1>Completed.</h1>
              <p className="sub">{done.length} completed samples</p>
              {done.length === 0
                ? <div className="card" style={{ padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No completed samples yet</div>
                  </div>
                : done.map(s => <SampleCard key={s._id} s={s} />)
              }
            </div>
          )}
        </div>
      </main>

      {reportModal && (
        <Modal title="Upload report" onClose={() => setReportModal(null)}>
          <div style={{ background:"rgba(28,122,107,0.07)", border:"1px solid rgba(28,122,107,0.3)", borderRadius:10, padding:"12px 16px", marginBottom:18, fontSize:13, color:TEAL }}>
            Patient: <strong>{reportModal.patient?.name}</strong><br />
            Tests: {testNames(reportModal)}<br />
            Sample: <span style={{ fontFamily:"var(--monof)", fontSize:12 }}>{reportModal.sampleId}</span>
          </div>
          <div
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ border:`2px dashed ${dragActive ? TEAL : file ? GREEN : "rgba(23,19,16,0.25)"}`, borderRadius:12, padding:"32px 20px", textAlign:"center", cursor:"pointer", background:dragActive ? "rgba(28,122,107,0.06)" : file ? "rgba(46,125,87,0.06)" : "rgba(23,19,16,0.02)", transition:"all 0.2s", marginBottom:16 }}>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleBrowse} style={{ display:"none" }} />
            {file ? (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:700, color:GREEN, marginBottom:4 }}>{file.name}</div>
                <div style={{ fontSize:12, color:"var(--ink-60)" }}>{(file.size/1024/1024).toFixed(2)} MB · click to change</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>{dragActive ? "📥" : "⬆️"}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--ink-60)", marginBottom:4 }}>{dragActive ? "Drop the PDF here" : "Drag & drop your report PDF"}</div>
                <div style={{ fontSize:12, color:"var(--ink-40)" }}>or click to browse · PDF only · max 10 MB</div>
              </>
            )}
          </div>
          <div style={{ marginBottom:18 }}>
            <label className="lbl">Lab comments (optional)</label>
            <textarea className="inp" rows={3} placeholder="Any notes for the patient..." value={labComments} onChange={e=>setLabComments(e.target.value)} style={{ resize:"vertical" }} />
          </div>
          <button className="btn-upload" onClick={saveReport} disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload report"}
          </button>
        </Modal>
      )}
    </div>
  );
}