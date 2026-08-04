import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import EmailAuditLog from "./EmailAuditLog";

/* ── Lab-label palette ─────────────────────────────────────── */
const INK      = "#171310";
const CRIMSON  = "#A4133C";
const LAVENDER = "#7C6BAE";
const GOLD     = "#B8892E";
const TEAL     = "#1C7A6B";
const BLUE     = "#3E6C9E";
const GREEN    = "#2E7D57";

const sUser   = b => b?.user?.name || "Unknown Patient";
const sTest   = b => b?.testTypes?.length
  ? b.testTypes.map(t => t?.name).filter(Boolean).join(", ")
  : (b?.testType?.name || "Unknown Test");
const sAmount = b => b?.amount ? `Rs. ${Number(b.amount).toLocaleString()}` : "—";
const sDate   = d => d ? new Date(d).toDateString() : "—";
const sId     = b => b?.bookingId || "—";

const STATUS_CONFIG = {
  pending:          { color:GOLD,      bg:"rgba(184,137,46,0.10)",  border:"rgba(184,137,46,0.35)",  label:"Pending"          },
  confirmed:        { color:BLUE,      bg:"rgba(62,108,158,0.10)",  border:"rgba(62,108,158,0.35)",  label:"Confirmed"        },
  sample_collected: { color:LAVENDER,  bg:"rgba(124,107,174,0.10)", border:"rgba(124,107,174,0.35)", label:"Sample Collected" },
  processing:       { color:CRIMSON,   bg:"rgba(164,19,60,0.08)",   border:"rgba(164,19,60,0.30)",   label:"Lab Processing"   },
  completed:        { color:GREEN,     bg:"rgba(46,125,87,0.10)",   border:"rgba(46,125,87,0.35)",   label:"Completed"        },
  cancelled:        { color:"#8A8378", bg:"rgba(138,131,120,0.10)", border:"rgba(138,131,120,0.3)",  label:"Cancelled"        },
  rejected:         { color:CRIMSON,   bg:"rgba(164,19,60,0.08)",   border:"rgba(164,19,60,0.30)",   label:"Rejected"         },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap", width:"fit-content" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
  );
};

const Lbl = ({ c }) => <label className="lbl">{c}</label>;

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(23,19,16,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
    <div style={{ background:"#FBF9F5", border:"1px solid rgba(23,19,16,0.13)", borderRadius:14, padding:28, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 30px 70px rgba(23,19,16,0.3)" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontFamily:"var(--display)", fontSize:22, fontWeight:900, letterSpacing:"-0.01em", margin:0 }}>{title}</h2>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(23,19,16,0.06)", border:"none", cursor:"pointer", fontSize:14, color:"rgba(23,19,16,0.6)" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const CATS = ["haematology","biochemistry","microbiology","immunology","urine","other"];

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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,           setTab]           = useState("overview");
  const [bookings,      setBookings]      = useState([]);
  const [phlebotomists, setPhlebotomists] = useState([]);
  const [testTypes,     setTestTypes]     = useState([]);
  const [sideOpen,      setSideOpen]      = useState(false);

  const [assignModal,   setAssignModal]   = useState(null);
  const [testModal,     setTestModal]     = useState(false);
  const [editTestModal, setEditTestModal] = useState(null);
  const [phleModal,     setPhleModal]     = useState(false);
  const [editPhleModal, setEditPhleModal] = useState(null);

  const [newTest,  setNewTest]  = useState({ name:"", code:"", price:"", duration:"24h", category:"haematology", preparation:"", description:"" });
  const [editTest, setEditTest] = useState({});
  const [newPhle,  setNewPhle]  = useState({ name:"", email:"", phone:"", password:"", serviceArea:"", licenseNumber:"" });
  const [editPhle, setEditPhle] = useState({});

  useEffect(() => { fetchAll(); }, [tab]);

  const fetchAll = async () => {
    try {
      const [bRes, tRes, pRes] = await Promise.all([
        api.get("/bookings"), api.get("/test-types"), api.get("/phlebotomists"),
      ]);
      setBookings(bRes.data.bookings||[]);
      setTestTypes(tRes.data.testTypes||[]);
      setPhlebotomists(pRes.data.phlebotomists||[]);
    } catch(err) { console.error(err?.response?.data||err.message); }
  };

  const createTest = async () => {
    if (!newTest.name||!newTest.code||!newTest.price) { toast.error("Name, code and price required."); return; }
    try {
      await api.post("/test-types", { ...newTest, code:newTest.code.toUpperCase(), price:Number(newTest.price) });
      toast.success("Test added! ✅"); setTestModal(false);
      setNewTest({ name:"", code:"", price:"", duration:"24h", category:"haematology", preparation:"", description:"" });
      fetchAll();
    } catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const saveEditTest = async () => {
    try {
      await api.put(`/test-types/${editTestModal._id}`, { ...editTest, price:Number(editTest.price) });
      toast.success("Test updated! ✅"); setEditTestModal(null); fetchAll();
    } catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const deactivateTest = async (id) => {
    if (!window.confirm("Deactivate this test type?")) return;
    try { await api.delete(`/test-types/${id}`); toast.success("Deactivated."); fetchAll(); }
    catch { toast.error("Failed."); }
  };

  const createPhle = async () => {
    if (!newPhle.name||!newPhle.email||!newPhle.phone||!newPhle.password) { toast.error("Name, email, phone and password required."); return; }
    try {
      await api.post("/phlebotomists", newPhle);
      toast.success("Phlebotomist created! ✅"); setPhleModal(false);
      setNewPhle({ name:"", email:"", phone:"", password:"", serviceArea:"", licenseNumber:"" });
      fetchAll();
    } catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const saveEditPhle = async () => {
    try {
      await api.patch(`/phlebotomists/${editPhleModal._id}`, editPhle);
      toast.success("Updated! ✅"); setEditPhleModal(null); fetchAll();
    } catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const assignPhlebotomist = async (bookingId, phlebotomistId) => {
    try {
      await api.patch(`/bookings/${bookingId}/assign`, { phlebotomistId });
      toast.success("Assigned! ✅"); setAssignModal(null); fetchAll();
    } catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const updateStatus = async (id, status) => {
    try { await api.patch(`/bookings/${id}/status`, { status }); toast.success("Updated!"); fetchAll(); }
    catch(err) { toast.error(err?.response?.data?.message||"Failed."); }
  };

  const safeB      = bookings.filter(Boolean);
  const revenue    = safeB.filter(b=>b.status==="completed").reduce((s,b)=>s+(b.amount||0),0);
  const pending    = safeB.filter(b=>b.status==="pending");
  const completed  = safeB.filter(b=>b.status==="completed");
  const unassigned = safeB.filter(b=>!b.phlebotomist&&b.status==="pending");
  const testCounts = testTypes.map(t=>({ name:t?.name||"—", count:safeB.filter(b=>sTest(b).includes(t?.name)).length })).sort((a,b)=>b.count-a.count);

  const TABS = [
    { id:"overview",      icon:"📊", label:"Overview",      cap:CRIMSON  },
    { id:"bookings",      icon:"📋", label:"All Bookings",  cap:TEAL     },
    { id:"assign",        icon:"🎯", label:"Assign Jobs",   cap:GOLD,    badge:unassigned.length },
    { id:"tests",         icon:"🔬", label:"Test Catalog",  cap:LAVENDER },
    { id:"phlebotomists", icon:"🧪", label:"Phlebotomists", cap:BLUE     },
    { id:"analytics",     icon:"📈", label:"Analytics",     cap:GREEN    },
    { id:"audit",         icon:"🗂", label:"Email & Audit", cap:GOLD     },
  ];

  const FI = ({ label, fkey, type="text", placeholder, val, setter }) => (
    <div style={{ marginBottom:12 }}>
      <Lbl c={label} />
      <input className="inp" type={type} placeholder={placeholder} value={val} onChange={e=>setter(p=>({...p,[fkey]:e.target.value}))} />
    </div>
  );

  const Sidebar = () => (
    <aside className="side">
      <div className="brand"><span className="brand-dot" />HemoVisit</div>
      <div className="console-chip">
        <div className="console-chip-t">Admin console</div>
        <div className="console-chip-s">Full access</div>
      </div>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>{ setTab(t.id); setSideOpen(false); }}
          className={`side-tab ${tab===t.id?"on":""}`}>
          <span className="side-cap" style={{ background:t.cap }} />
          <span style={{ fontSize:15 }}>{t.icon}</span>
          <span style={{ flex:1, textAlign:"left" }}>{t.label}</span>
          {t.badge>0 && <span className="side-badge">{t.badge}</span>}
        </button>
      ))}
      <div className="side-user">
        <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>{user?.name||"Admin"}</div>
        <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(23,19,16,0.45)" }}>Administrator</div>
      </div>
      <button className="signout" onClick={()=>{ logout(); navigate("/login"); }}>Sign out</button>
    </aside>
  );

  const TH = ({ cols, heads }) => (
    <div style={{ display:"grid", gridTemplateColumns:cols, padding:"11px 18px", background:"rgba(23,19,16,0.03)", borderBottom:"1px solid var(--rule)" }}>
      {heads.map(h=>(
        <div key={h} className="th">{h}</div>
      ))}
    </div>
  );

  return (
    <div className="ad">
      <style>{`
        .ad {
          --paper:   #F3F0EA;
          --card:    #FBF9F5;
          --ink:     #171310;
          --ink-60:  rgba(23,19,16,0.62);
          --ink-40:  rgba(23,19,16,0.42);
          --rule:    rgba(23,19,16,0.13);
          --crimson: #A4133C;
          --display: "Playfair Display", Georgia, serif;
          --sansf:   "DM Sans", system-ui, -apple-system, sans-serif;
          --monof:   "DM Mono", ui-monospace, "SF Mono", monospace;

          min-height: 100vh; min-height: 100dvh;
          background: var(--paper); color: var(--ink);
          font-family: var(--sansf); display: flex; position: relative;
        }
        .ad *, .ad *::before, .ad *::after { box-sizing: border-box; }
        .ad :focus-visible { outline: 2px solid var(--crimson); outline-offset: 2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .ad .fade-up { animation: fadeUp .4s ease forwards; }

        .ad h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3.2vw, 36px); letter-spacing: -0.015em; margin: 0 0 4px;
        }
        .ad .sub { color: var(--ink-60); font-size: 14px; margin: 0; }
        .ad .head { margin-bottom: 26px; }

        .ad .sl {
          display: inline-flex; align-items: stretch;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--card); overflow: hidden; margin-bottom: 14px;
        }
        .ad .sl-cap  { width: 7px; }
        .ad .sl-body { padding: 5px 10px; display: flex; align-items: center; gap: 10px; }
        .ad .sl-code { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
        .ad .sl-name { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); }
        .ad .sl-bar {
          width: 36px; align-self: stretch; min-height: 12px; opacity: .7;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        /* sidebar */
        .ad .side {
          width: 246px; flex-shrink: 0;
          background: var(--card); border-right: 1px solid var(--rule);
          padding: 22px 14px; display: flex; flex-direction: column; gap: 3px;
          position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; z-index: 10;
        }
        .ad .brand {
          display: flex; align-items: center; gap: 9px; padding: 4px 10px 2px; margin-bottom: 12px;
          font-family: var(--monof); font-size: 12.5px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
        }
        .ad .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #d24a6e, var(--crimson));
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(164,19,60,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(164,19,60,0); }
        }
        .ad .console-chip {
          margin: 0 4px 14px; padding: 10px 12px; border-radius: 8px;
          background: linear-gradient(120deg, var(--ink), #3d1020 80%);
        }
        .ad .console-chip-t { font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; margin-bottom: 2px; }
        .ad .console-chip-s { font-size: 11.5px; color: rgba(255,255,255,0.55); }

        .ad .side-tab {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; width: 100%;
          font-family: var(--sansf); font-size: 13.5px; font-weight: 500;
          color: var(--ink-60); transition: background .15s, color .15s;
        }
        .ad .side-tab:hover { background: rgba(23,19,16,0.05); color: var(--ink); }
        .ad .side-tab.on { background: var(--ink); color: var(--paper); font-weight: 600; }
        .ad .side-cap { width: 4px; height: 17px; border-radius: 2px; flex-shrink: 0; opacity: .4; transition: opacity .15s; }
        .ad .side-tab.on .side-cap, .ad .side-tab:hover .side-cap { opacity: 1; }
        .ad .side-badge {
          background: var(--crimson); color: #fff; border-radius: 20px;
          min-width: 19px; height: 19px; padding: 0 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; font-family: var(--monof);
        }
        .ad .side-tab.on .side-badge { background: var(--paper); color: var(--ink); }
        .ad .side-user {
          margin-top: auto; padding: 12px; border-radius: 10px;
          background: var(--paper); border: 1px solid var(--rule);
        }
        .ad .signout {
          margin-top: 8px; padding: 9px; border: 1px solid var(--rule); border-radius: 8px;
          background: transparent; color: var(--ink-60); cursor: pointer;
          font-family: var(--monof); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
          transition: all .15s;
        }
        .ad .signout:hover { border-color: var(--crimson); color: var(--crimson); }

        /* cards, tables */
        .ad .card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; }
        .ad .table { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; }
        .ad .th {
          font-family: var(--monof); font-size: 9px; font-weight: 500;
          color: var(--ink-40); text-transform: uppercase; letter-spacing: 0.12em;
        }
        .ad .trow { padding: 13px 18px; border-bottom: 1px solid var(--rule); transition: background .15s; align-items: center; }
        .ad .trow:last-child { border-bottom: none; }
        .ad .trow:hover { background: rgba(164,19,60,0.035); }

        .ad .stat {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px;
          border-top: 3px solid var(--tint, var(--crimson));
        }
        .ad .stat-v { font-family: var(--display); font-weight: 900; font-size: clamp(20px,2.4vw,28px); line-height: 1; color: var(--tint, var(--ink)); }
        .ad .stat-l {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-40); margin-top: 8px;
        }

        .ad .alert {
          background: rgba(164,19,60,0.06); border: 1px solid rgba(164,19,60,0.3);
          border-left: 4px solid var(--crimson);
          border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
        }

        /* buttons & inputs */
        .ad .btn {
          font-family: var(--sansf); font-size: 13.5px; font-weight: 700;
          padding: 11px 20px; border-radius: 9px; cursor: pointer;
          border: 1px solid transparent; transition: transform .15s, background .15s, box-shadow .15s;
        }
        .ad .btn:hover { transform: translateY(-1px); }
        .ad .btn-primary { background: var(--crimson); color: #fff; box-shadow: 0 6px 18px rgba(164,19,60,0.28); }
        .ad .btn-primary:hover { background: #8B0F33; }
        .ad .btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule); }
        .ad .btn-ghost:hover { border-color: var(--ink); }
        .ad .btn-sm { padding: 7px 14px; font-size: 12.5px; border-radius: 7px; }
        .ad .btn-full { width: 100%; }

        .ad .act {
          padding: 5px 12px; border-radius: 7px; font-family: var(--sansf);
          font-weight: 700; font-size: 12px; cursor: pointer; transition: all .15s; white-space: nowrap;
          background: transparent;
        }
        .ad .act:hover { transform: translateY(-1px); }
        .ad .act-blue  { color: #3E6C9E; border: 1px solid rgba(62,108,158,0.35); }
        .ad .act-green { color: #2E7D57; border: 1px solid rgba(46,125,87,0.35); }
        .ad .act-red   { color: var(--crimson); border: 1px solid rgba(164,19,60,0.35); }

        .ad .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-60);
        }
        .ad .inp {
          width: 100%; padding: 11px 13px;
          background: #fff; color: var(--ink);
          border: 1px solid var(--rule); border-radius: 8px;
          font-family: var(--sansf); font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .ad .inp::placeholder { color: var(--ink-40); }
        .ad .inp:focus { outline: none; border-color: var(--crimson); box-shadow: 0 0 0 3px rgba(164,19,60,0.10); }

        .ad .cat-tag {
          font-family: var(--monof); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
          color: #3E6C9E; background: rgba(62,108,158,0.08); border: 1px solid rgba(62,108,158,0.3);
          padding: 3px 8px; border-radius: 20px; width: fit-content;
        }

        .ad .prow {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 16px 18px; margin-bottom: 10px; transition: all .2s;
        }
        .ad .prow:hover { box-shadow: 0 10px 24px rgba(23,19,16,0.08); transform: translateY(-1px); }

        /* mobile */
        .ad .topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(251,249,245,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--rule); z-index: 100;
          align-items: center; justify-content: space-between; padding: 0 16px;
        }
        .ad .overlay { position: fixed; inset: 0; background: rgba(23,19,16,0.45); z-index: 200; }
        .ad .drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 268px; z-index: 210;
          background: var(--card); border-right: 1px solid var(--rule); overflow-y: auto;
        }
        .ad .main { flex: 1; padding: 32px 40px; overflow-y: auto; position: relative; z-index: 1; }
        .ad .inner { max-width: 1100px; margin: 0 auto; }

        @media (max-width: 768px) {
          .ad .desktop-side { display: none; }
          .ad .topbar { display: flex; }
          .ad .main { padding: 76px 14px 24px; }
          .ad .stats5 { grid-template-columns: repeat(2,1fr) !important; }
          .ad .stats4 { grid-template-columns: repeat(2,1fr) !important; }
          .ad .cols2 { grid-template-columns: 1fr !important; }
          .ad .scrollx { overflow-x: auto; }
          .ad .scrollx > div { min-width: 640px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="desktop-side"><Sidebar /></div>

      <div className="topbar">
        <div className="brand" style={{ padding:0, marginBottom:0 }}><span className="brand-dot" />HemoVisit · Admin</div>
        <button onClick={()=>setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:INK }}>☰</button>
      </div>

      {sideOpen && (
        <>
          <div className="overlay" onClick={()=>setSideOpen(false)} />
          <div className="drawer"><Sidebar /></div>
        </>
      )}

      <main className="main">
        <div className="inner">

          {/* OVERVIEW */}
          {tab==="overview" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-30" name="Admin" cap={CRIMSON} />
                <h1>Overview.</h1>
                <p className="sub">{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
              </div>

              <div className="stats5" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:22 }}>
                {[
                  { label:"Total",      value:safeB.length,                          tint:BLUE    },
                  { label:"Pending",    value:pending.length,                        tint:GOLD    },
                  { label:"Completed",  value:completed.length,                      tint:GREEN   },
                  { label:"Unassigned", value:unassigned.length,                     tint:CRIMSON },
                  { label:"Revenue",    value:"Rs."+(revenue/1000).toFixed(1)+"K",   tint:TEAL    },
                ].map(s=>(
                  <div key={s.label} className="stat" style={{ "--tint":s.tint }}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>

              {unassigned.length>0 && (
                <div className="alert">
                  <div>
                    <div style={{ fontWeight:700, fontSize:14.5, color:CRIMSON, marginBottom:2 }}>⚠️ {unassigned.length} booking{unassigned.length>1?"s":""} need phlebotomist assignment</div>
                    <div style={{ fontSize:13, color:"var(--ink-60)" }}>Patients are waiting for confirmation.</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>setTab("assign")}>Assign now →</button>
                </div>
              )}

              <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 12px" }}>Recent bookings</h3>
              <div className="table scrollx">
                <div>
                  <TH cols="2fr 2fr 1.5fr 1fr 1.2fr" heads={["Patient","Test","Date","Amount","Status"]} />
                  {safeB.slice(0,8).map(b=>(
                    <div key={b._id} className="trow" style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1.5fr 1fr 1.2fr" }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{sUser(b)}</div>
                      <div style={{ fontSize:12, color:"var(--ink-60)" }}>{sTest(b)}</div>
                      <div style={{ fontSize:12, color:"var(--ink-60)" }}>{sDate(b.appointmentDate)}</div>
                      <div style={{ fontFamily:"var(--monof)", fontSize:12.5, fontWeight:500, color:TEAL }}>{sAmount(b)}</div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                  {safeB.length===0 && <div style={{ padding:"40px", textAlign:"center", color:"var(--ink-40)", fontSize:14 }}>No bookings yet.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ALL BOOKINGS */}
          {tab==="bookings" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-31" name="Bookings" cap={TEAL} />
                <h1>All bookings.</h1>
                <p className="sub">{safeB.length} total bookings</p>
              </div>
              <div className="table scrollx">
                <div>
                  <TH cols="1.2fr 1.5fr 1.5fr 1fr 1.2fr 1.5fr" heads={["Booking","Patient","Test","Amount","Status","Action"]} />
                  {safeB.length===0
                    ? <div style={{ padding:"40px", textAlign:"center", color:"var(--ink-40)", fontSize:14 }}>No bookings yet.</div>
                    : safeB.map(b=>(
                      <div key={b._id} className="trow" style={{ display:"grid", gridTemplateColumns:"1.2fr 1.5fr 1.5fr 1fr 1.2fr 1.5fr" }}>
                        <div style={{ fontFamily:"var(--monof)", fontSize:10.5, color:"var(--ink-40)" }}>{sId(b)}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{sUser(b)}</div>
                          <div style={{ fontSize:11, color:"var(--ink-40)" }}>{b.user?.phone||"—"}</div>
                        </div>
                        <div style={{ fontSize:12, color:"var(--ink-60)" }}>{sTest(b)}</div>
                        <div style={{ fontFamily:"var(--monof)", fontSize:12.5, color:TEAL }}>{sAmount(b)}</div>
                        <StatusBadge status={b.status} />
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {b.status==="pending"&&!b.phlebotomist && <button className="act act-blue" onClick={()=>setAssignModal(b._id)}>Assign</button>}
                          {b.status==="pending" && <button className="act act-green" onClick={()=>updateStatus(b._id,"confirmed")}>Confirm</button>}
                          {b.status==="processing" && <button className="act act-green" onClick={()=>updateStatus(b._id,"completed")}>Complete</button>}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ASSIGN */}
          {tab==="assign" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-32" name="Assign" cap={GOLD} />
                <h1>Assign jobs.</h1>
                <p className="sub">{unassigned.length} unassigned bookings</p>
              </div>
              {unassigned.length===0
                ? <div className="card" style={{ padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)" }}>All bookings are assigned!</div>
                  </div>
                : unassigned.map(b=>(
                  <div key={b._id} className="prow" style={{ borderLeft:`4px solid ${GOLD}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <div style={{ fontWeight:700, fontSize:15 }}>{sUser(b)}</div>
                          <span style={{ fontFamily:"var(--monof)", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:CRIMSON, background:"rgba(164,19,60,0.07)", border:"1px solid rgba(164,19,60,0.3)", borderRadius:20, padding:"2px 8px" }}>Unassigned</span>
                        </div>
                        <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.9 }}>
                          🧪 {sTest(b)}<br />📅 {sDate(b.appointmentDate)} ⏰ {b.appointmentTime||"—"}<br />
                          📍 {b.address||"—"}<br />📞 {b.user?.phone||"—"}<br />
                          💰 {sAmount(b)} &nbsp; <span style={{ fontFamily:"var(--monof)", fontSize:10.5 }}>🔖 {sId(b)}</span>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={()=>setAssignModal(b._id)}>Assign phlebotomist →</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* TESTS */}
          {tab==="tests" && (
            <div className="fade-up">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:26, flexWrap:"wrap", gap:12 }}>
                <div>
                  <SpecimenLabel code="HV-33" name="Catalog" cap={LAVENDER} />
                  <h1>Test catalog.</h1>
                  <p className="sub">{testTypes.length} test types</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setTestModal(true)}>+ Add test</button>
              </div>
              <div className="table scrollx">
                <div>
                  <TH cols="2fr 0.7fr 1.1fr 1fr 0.8fr 0.6fr 1.2fr" heads={["Test name","Code","Category","Price","Time","Active","Actions"]} />
                  {testTypes.map(t=>(
                    <div key={t._id} className="trow" style={{ display:"grid", gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 0.8fr 0.6fr 1.2fr" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{t?.name||"—"}</div>
                        {t?.preparation && <div style={{ fontSize:11, color:GOLD }}>⚠ {t.preparation?.slice(0,35)}</div>}
                      </div>
                      <div style={{ fontFamily:"var(--monof)", fontSize:11.5, color:"var(--ink-60)" }}>{t?.code||"—"}</div>
                      <span className="cat-tag">{t?.category||"—"}</span>
                      <div style={{ fontFamily:"var(--monof)", fontSize:12.5, color:TEAL }}>Rs.{t?.price?.toLocaleString()||"—"}</div>
                      <div style={{ fontSize:12, color:"var(--ink-60)" }}>{t?.duration||"—"}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:t?.isActive?GREEN:"var(--ink-40)" }}>{t?.isActive?"✓":"✕"}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button className="act act-blue"
                          onClick={()=>{ setEditTest({ name:t.name, code:t.code, price:t.price, duration:t.duration, category:t.category, preparation:t.preparation||"", description:t.description||"" }); setEditTestModal(t); }}>
                          Edit
                        </button>
                        <button className="act act-red" onClick={()=>deactivateTest(t._id)}>Off</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PHLEBOTOMISTS */}
          {tab==="phlebotomists" && (
            <div className="fade-up">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:26, flexWrap:"wrap", gap:12 }}>
                <div>
                  <SpecimenLabel code="HV-34" name="Team" cap={BLUE} />
                  <h1>Phlebotomists.</h1>
                  <p className="sub">{phlebotomists.length} team members</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setPhleModal(true)}>+ Add phlebotomist</button>
              </div>
              {phlebotomists.length===0
                ? <div className="card" style={{ padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧪</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)", marginBottom:12 }}>No phlebotomists yet</div>
                    <button className="btn btn-primary btn-sm" onClick={()=>setPhleModal(true)}>Add first phlebotomist</button>
                  </div>
                : phlebotomists.map(p=>(
                  <div key={p._id} className="prow" style={{ borderLeft:`4px solid ${BLUE}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(62,108,158,0.10)", border:"1px solid rgba(62,108,158,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🧪</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{p?.name||"—"}</div>
                          <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.8 }}>
                            📧 {p?.email||"—"} &nbsp; 📞 {p?.phone||"—"}<br />
                            📍 {p?.serviceArea||"—"} &nbsp; <span style={{ fontFamily:"var(--monof)", fontSize:10.5 }}>🪪 {p?.licenseNumber||"—"}</span><br />
                            ⭐ {p?.rating?.toFixed(1)||"5.0"} · {p?.totalRatings||0} reviews
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:p?.isAvailable?GREEN:"var(--ink-40)", display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ width:7, height:7, borderRadius:"50%", background:p?.isAvailable?GREEN:"var(--ink-40)", display:"inline-block" }} />
                          {p?.isAvailable?"Online":"Offline"}
                        </span>
                        <button className="act act-blue"
                          onClick={()=>{ setEditPhle({ name:p.name, phone:p.phone, serviceArea:p.serviceArea||"", licenseNumber:p.licenseNumber||"" }); setEditPhleModal(p); }}>
                          Edit
                        </button>
                        <button className="act act-red"
                          onClick={async()=>{ if(window.confirm("Deactivate?")) { try { await api.delete(`/phlebotomists/${p._id}`); toast.success("Deactivated."); fetchAll(); } catch { toast.error("Failed."); } } }}>
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ANALYTICS */}
          {tab==="analytics" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-35" name="Numbers" cap={GREEN} />
                <h1>Analytics.</h1>
                <p className="sub">Platform performance overview</p>
              </div>
              <div className="stats4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
                {[
                  { label:"Total revenue",   value:`Rs. ${revenue.toLocaleString()}`, tint:TEAL },
                  { label:"Total bookings",  value:safeB.length,                      tint:BLUE },
                  { label:"Completion rate", value:safeB.length?Math.round((completed.length/safeB.length)*100)+"%":"0%", tint:GREEN },
                  { label:"Avg test value",  value:completed.length?"Rs."+Math.round(revenue/completed.length).toLocaleString():"—", tint:LAVENDER },
                ].map(s=>(
                  <div key={s.label} className="stat" style={{ "--tint":s.tint }}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="cols2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                {[
                  { title:"Status breakdown", items: Object.entries(STATUS_CONFIG).map(([s,c])=>({ name:c.label, count:safeB.filter(b=>b.status===s).length, color:c.color })).filter(i=>i.count>0) },
                  { title:"Popular tests",    items: testCounts.filter(t=>t.count>0).map(t=>({ name:t.name, count:t.count, color:CRIMSON })) },
                ].map(section=>(
                  <div key={section.title} className="card" style={{ padding:20 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:18 }}>{section.title}</div>
                    {section.items.length===0
                      ? <div style={{ fontSize:13, color:"var(--ink-40)" }}>No data yet.</div>
                      : section.items.map((item,i)=>{
                          const total = section.items.reduce((s,x)=>s+x.count,0)||1;
                          const pct   = Math.round((item.count/total)*100);
                          return (
                            <div key={i} style={{ marginBottom:14 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
                                <span style={{ color:"var(--ink-60)", fontWeight:500 }}>{item.name}</span>
                                <span style={{ fontFamily:"var(--monof)", fontWeight:500, color:item.color }}>{item.count} ({pct}%)</span>
                              </div>
                              <div style={{ height:6, background:"rgba(23,19,16,0.06)", borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${pct}%`, height:"100%", background:item.color, borderRadius:3, opacity:0.85, transition:"width 0.6s ease" }} />
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMAIL & AUDIT */}
          {tab==="audit" && <EmailAuditLog />}
        </div>
      </main>

      {/* ASSIGN MODAL */}
      {assignModal && (
        <Modal title="Assign phlebotomist" onClose={()=>setAssignModal(null)}>
          <p style={{ fontSize:13, color:"rgba(23,19,16,0.6)", marginBottom:16 }}>Click a phlebotomist to assign them to this booking.</p>
          {phlebotomists.length===0
            ? <div style={{ textAlign:"center", padding:"30px 0", color:"rgba(23,19,16,0.5)", fontSize:14 }}>No phlebotomists found. Add one first.</div>
            : phlebotomists.map(p=>(
              <div key={p._id} onClick={()=>assignPhlebotomist(assignModal,p._id)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:10, border:"1px solid rgba(23,19,16,0.13)", marginBottom:10, cursor:"pointer", transition:"all 0.2s", background:"#fff" }}
                onMouseOver={e=>{ e.currentTarget.style.borderColor=CRIMSON; e.currentTarget.style.background="rgba(164,19,60,0.04)"; }}
                onMouseOut={e=>{ e.currentTarget.style.borderColor="rgba(23,19,16,0.13)"; e.currentTarget.style.background="#fff"; }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(164,19,60,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧪</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p?.name||"—"}</div>
                    <div style={{ fontSize:12, color:"rgba(23,19,16,0.55)" }}>⭐ {p?.rating?.toFixed(1)||"5.0"} · {p?.serviceArea||"Jaffna"}</div>
                  </div>
                </div>
                <span style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:p?.isAvailable?GREEN:"rgba(23,19,16,0.4)" }}>
                  {p?.isAvailable?"● Online":"○ Offline"}
                </span>
              </div>
            ))
          }
          <button className="btn btn-ghost btn-full" onClick={()=>setAssignModal(null)} style={{ marginTop:8 }}>Cancel</button>
        </Modal>
      )}

      {/* ADD TEST MODAL */}
      {testModal && (
        <Modal title="Add new test" onClose={()=>setTestModal(false)}>
          <FI label="Test name"   fkey="name"        type="text"   placeholder="e.g. Complete Blood Count" val={newTest.name}        setter={setNewTest} />
          <FI label="Code"        fkey="code"        type="text"   placeholder="e.g. CBC"                  val={newTest.code}        setter={setNewTest} />
          <FI label="Price (Rs.)" fkey="price"       type="number" placeholder="e.g. 2500"                val={newTest.price}       setter={setNewTest} />
          <FI label="Turnaround"  fkey="duration"    type="text"   placeholder="e.g. 24h"                  val={newTest.duration}    setter={setNewTest} />
          <FI label="Preparation" fkey="preparation" type="text"   placeholder="e.g. Fast for 8 hours"     val={newTest.preparation} setter={setNewTest} />
          <div style={{ marginBottom:16 }}>
            <Lbl c="Category" />
            <select className="inp" value={newTest.category} onChange={e=>setNewTest(p=>({...p,category:e.target.value}))}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={createTest}>Add test type</button>
        </Modal>
      )}

      {/* EDIT TEST MODAL */}
      {editTestModal && (
        <Modal title="Edit test" onClose={()=>setEditTestModal(null)}>
          <FI label="Test name"   fkey="name"        type="text"   placeholder="Test name"                val={editTest.name||""}        setter={setEditTest} />
          <FI label="Price (Rs.)" fkey="price"       type="number" placeholder="Price"                    val={editTest.price||""}       setter={setEditTest} />
          <FI label="Turnaround"  fkey="duration"    type="text"   placeholder="e.g. 24h"                 val={editTest.duration||""}    setter={setEditTest} />
          <FI label="Preparation" fkey="preparation" type="text"   placeholder="Preparation instructions" val={editTest.preparation||""} setter={setEditTest} />
          <div style={{ marginBottom:16 }}>
            <Lbl c="Category" />
            <select className="inp" value={editTest.category||"haematology"} onChange={e=>setEditTest(p=>({...p,category:e.target.value}))}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setEditTestModal(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveEditTest}>Save changes</button>
          </div>
        </Modal>
      )}

      {/* ADD PHLEBOTOMIST MODAL */}
      {phleModal && (
        <Modal title="Add phlebotomist" onClose={()=>setPhleModal(false)}>
          <FI label="Full name"    fkey="name"          type="text"     placeholder="e.g. Rajan Kumar"    val={newPhle.name}          setter={setNewPhle} />
          <FI label="Email"        fkey="email"         type="email"    placeholder="email@example.com"   val={newPhle.email}         setter={setNewPhle} />
          <FI label="Phone"        fkey="phone"         type="tel"      placeholder="+94 77 123 4567"     val={newPhle.phone}         setter={setNewPhle} />
          <FI label="Password"     fkey="password"      type="password" placeholder="Min 6 characters"   val={newPhle.password}      setter={setNewPhle} />
          <FI label="Service area" fkey="serviceArea"   type="text"     placeholder="e.g. Jaffna North"  val={newPhle.serviceArea}   setter={setNewPhle} />
          <FI label="License no."  fkey="licenseNumber" type="text"     placeholder="e.g. HV-PHL-05"     val={newPhle.licenseNumber} setter={setNewPhle} />
          <button className="btn btn-primary btn-full" onClick={createPhle}>Create account</button>
        </Modal>
      )}

      {/* EDIT PHLEBOTOMIST MODAL */}
      {editPhleModal && (
        <Modal title="Edit phlebotomist" onClose={()=>setEditPhleModal(null)}>
          <FI label="Full name"    fkey="name"          type="text" placeholder="Full name"       val={editPhle.name||""}          setter={setEditPhle} />
          <FI label="Phone"        fkey="phone"         type="tel"  placeholder="Phone number"    val={editPhle.phone||""}         setter={setEditPhle} />
          <FI label="Service area" fkey="serviceArea"   type="text" placeholder="Service area"    val={editPhle.serviceArea||""}   setter={setEditPhle} />
          <FI label="License no."  fkey="licenseNumber" type="text" placeholder="License number"  val={editPhle.licenseNumber||""} setter={setEditPhle} />
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setEditPhleModal(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveEditPhle}>Save changes</button>
          </div>
        </Modal>
      )}
    </div>
  );
}