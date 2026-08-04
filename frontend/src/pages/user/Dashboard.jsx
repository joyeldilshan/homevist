import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBookingSocket } from "../../hooks/useSocket";
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

const STATUS_CONFIG = {
  pending:          { color:GOLD,     bg:"rgba(184,137,46,0.10)",  border:"rgba(184,137,46,0.35)",  label:"Pending"          },
  confirmed:        { color:BLUE,     bg:"rgba(62,108,158,0.10)",  border:"rgba(62,108,158,0.35)",  label:"Confirmed"        },
  sample_collected: { color:LAVENDER, bg:"rgba(124,107,174,0.10)", border:"rgba(124,107,174,0.35)", label:"Sample Collected" },
  processing:       { color:CRIMSON,  bg:"rgba(164,19,60,0.08)",   border:"rgba(164,19,60,0.30)",   label:"Lab Processing"   },
  completed:        { color:GREEN,    bg:"rgba(46,125,87,0.10)",   border:"rgba(46,125,87,0.35)",   label:"Report Ready"     },
  cancelled:        { color:"#8A8378", bg:"rgba(138,131,120,0.10)", border:"rgba(138,131,120,0.3)", label:"Cancelled"        },
  rejected:         { color:CRIMSON,  bg:"rgba(164,19,60,0.08)",   border:"rgba(164,19,60,0.30)",   label:"Rejected"         },
};

const STATUS_STEPS = [
  { key:"pending",          icon:"📋", label:"Booking Received",      desc:"Your booking is received. Waiting for phlebotomist assignment." },
  { key:"confirmed",        icon:"✅", label:"Phlebotomist Assigned", desc:"A phlebotomist has been assigned and will visit you on schedule." },
  { key:"sample_collected", icon:"🩸", label:"Sample Collected",      desc:"Your blood sample has been collected and sent to the lab." },
  { key:"processing",       icon:"🔬", label:"Lab Processing",        desc:"Your sample is being analysed in our certified laboratory." },
  { key:"completed",        icon:"📄", label:"Report Ready",          desc:"Your results are ready! Download your verified PDF report." },
];

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:20, fontSize:10.5, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"var(--monof)", background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
  );
}

function StatusTracker({ status }) {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ padding:"4px 0" }}>
      {STATUS_STEPS.map((s, i) => {
        const done = i < idx, active = i === idx;
        const c = STATUS_CONFIG[s.key];
        return (
          <div key={s.key}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"6px 0" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, transition:"all 0.3s", background:done||active?c.color:"rgba(23,19,16,0.06)", color:done||active?"#fff":"rgba(23,19,16,0.35)", border:active?`2px solid ${c.color}`:"2px solid transparent", boxShadow:active?`0 0 0 4px ${c.bg}`:"none" }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ paddingTop:6, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:done||active?INK:"rgba(23,19,16,0.4)" }}>
                  {s.label}
                  {active && <span style={{ marginLeft:8, fontSize:9.5, color:c.color, fontWeight:600, background:c.bg, padding:"2px 8px", borderRadius:20, fontFamily:"var(--monof)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Current</span>}
                </div>
                {active && <div style={{ fontSize:12, color:"rgba(23,19,16,0.62)", marginTop:3, lineHeight:1.6 }}>{s.desc}</div>}
              </div>
            </div>
            {i < STATUS_STEPS.length-1 && <div style={{ width:2, height:16, marginLeft:15, background:done?c.color:"rgba(23,19,16,0.12)", borderRadius:2 }} />}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="lbl">{children}</label>;
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

function getTestNames(b) {
  if (b.testTypes?.length) return b.testTypes.map(t => t.name).join(", ");
  return b.testType?.name || "—";
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("home");
  const [bookings,   setBookings]   = useState([]);
  const [reports,    setReports]    = useState([]);
  const [tests,      setTests]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [flashIds,   setFlashIds]   = useState(new Set());
  const [sideOpen,   setSideOpen]   = useState(false);

  const [step,    setStep]    = useState(0);
  const [picked,  setPicked]  = useState([]);
  const [form,    setForm]    = useState({ date:"", time:"09:00", address:user?.address||"", notes:"" });
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const load = async () => {
    try {
      const r = await api.get("/bookings");
      setBookings(r.data.bookings || []);
    } catch(e) { console.error(e?.response?.data || e.message); }
    try {
      const rep = await api.get("/reports");
      setReports(rep.data.reports || []);
    } catch(e) { console.error("reports:", e?.response?.data || e.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    load();
    if (tab === "book") {
      api.get("/test-types").then(r => setTests(r.data.testTypes || [])).catch(()=>{});
    }
  }, [tab]);

  const bookingIds = bookings.map(b => b.bookingId).filter(Boolean);
  useBookingSocket(bookingIds, ({ bookingId, status }) => {
    const info = STATUS_STEPS.find(s => s.key === status);
    toast.success(`Booking ${bookingId}: ${info?.label || status}`);
    setFlashIds(p => new Set([...p, bookingId]));
    setTimeout(() => setFlashIds(p => { const n = new Set(p); n.delete(bookingId); return n; }), 4000);
    load();
  });

  const reportForBooking = (b) =>
    reports.find(r => r.booking?._id === b._id || r.booking?.bookingId === b.bookingId);

  const openReport = (b) => {
    const rep = reportForBooking(b);
    if (rep?.fileUrl) {
      window.open(rep.fileUrl, "_blank", "noopener,noreferrer");
    } else {
      toast("Report isn't ready yet — check the My Reports tab.", { icon:"📄" });
      setTab("reports");
    }
  };

  const toggleTest = (t) => {
    setPicked(p =>
      p.find(x => x._id === t._id) ? p.filter(x => x._id !== t._id) : [...p, t]
    );
  };

  const totalAmount = picked.reduce((s, t) => s + (t.price || 0), 0);

  const handleBook = async () => {
    if (!picked.length || !form.date || !form.address) {
      toast.error("Select at least one test and fill all fields."); return;
    }
    setLoading(true);
    try {
      await api.post("/bookings", {
        testTypeIds:     picked.map(t => t._id),
        appointmentDate: form.date,
        appointmentTime: form.time,
        address:         form.address,
        notes:           form.notes,
      });
      toast.success(`🩸 Booking confirmed! ${picked.length} test${picked.length>1?"s":""} scheduled.`);
      setStep(0); setPicked([]); setTab("bookings"); load();
    } catch(e) { toast.error(e.response?.data?.message || "Booking failed."); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status:"cancelled" });
      toast.success("Booking cancelled."); load();
    } catch { toast.error("Could not cancel."); }
  };

  const upcoming  = bookings.filter(b => ["pending","confirmed","sample_collected","processing"].includes(b.status));
  const completed = bookings.filter(b => b.status === "completed");

  const TABS = [
    { id:"home",     icon:"🏠", label:"Home",        cap:CRIMSON  },
    { id:"book",     icon:"📅", label:"Book a Test", cap:GOLD     },
    { id:"bookings", icon:"📋", label:"My Bookings", cap:TEAL,     badge:upcoming.length },
    { id:"reports",  icon:"📄", label:"My Reports",  cap:LAVENDER, badge:reports.length  },
    { id:"profile",  icon:"👤", label:"Profile",     cap:BLUE     },
  ];

  const Sidebar = () => (
    <aside className="side">
      <div className="brand"><span className="brand-dot" />HemoVisit</div>
      <div className="side-sep" />
      {TABS.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setStep(0); setSideOpen(false); }}
          className={`side-tab ${tab===t.id?"on":""}`}>
          <span className="side-cap" style={{ background:t.cap }} />
          <span style={{ fontSize:15 }}>{t.icon}</span>
          <span style={{ flex:1, textAlign:"left" }}>{t.label}</span>
          {t.badge > 0 && <span className="side-badge">{t.badge}</span>}
        </button>
      ))}
      <div className="side-sep" />
      <div className="live-chip">
        <span className="live-dot" />
        Live updates on
      </div>
      <div className="side-user">
        <div className="side-avatar">👤</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.name||"Patient"}</div>
          <div style={{ fontSize:10.5, color:"rgba(23,19,16,0.45)", fontFamily:"var(--monof)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.email}</div>
        </div>
      </div>
      <button className="signout" onClick={() => { logout(); navigate("/login"); }}>
        Sign out
      </button>
    </aside>
  );

  return (
    <div className="ud">
      <style>{`
        .ud {
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
          font-family: var(--sansf);
          display: flex; position: relative;
        }
        .ud *, .ud *::before, .ud *::after { box-sizing: border-box; }
        .ud :focus-visible { outline: 2px solid var(--crimson); outline-offset: 2px; }

        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ping    { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes flash   { 0%,100%{border-color:var(--rule)} 50%{border-color:var(--crimson);box-shadow:0 0 0 3px rgba(164,19,60,0.15)} }
        .ud .fade-up   { animation: fadeUp 0.4s ease forwards; }
        .ud .slide-in  { animation: slideIn 0.3s ease forwards; }
        .ud .flash-brd { animation: flash 0.7s ease 3; }

        /* ---------- headings ---------- */
        .ud h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3.4vw, 38px); letter-spacing: -0.015em;
          margin: 0 0 4px;
        }
        .ud .sub { color: var(--ink-60); font-size: 14px; margin: 0; }
        .ud .head { margin-bottom: 26px; }

        /* ---------- specimen label ---------- */
        .ud .sl {
          display: inline-flex; align-items: stretch;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--card); overflow: hidden; margin-bottom: 14px;
        }
        .ud .sl-cap  { width: 7px; }
        .ud .sl-body { padding: 5px 10px; display: flex; align-items: center; gap: 10px; }
        .ud .sl-code { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
        .ud .sl-name { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); }
        .ud .sl-bar {
          width: 36px; align-self: stretch; min-height: 12px; opacity: .7;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        /* ---------- sidebar ---------- */
        .ud .side {
          width: 246px; flex-shrink: 0;
          background: var(--card); border-right: 1px solid var(--rule);
          padding: 22px 14px; display: flex; flex-direction: column; gap: 3px;
          position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; z-index: 10;
        }
        .ud .brand {
          display: flex; align-items: center; gap: 9px; padding: 4px 10px 2px;
          font-family: var(--monof); font-size: 12.5px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
        }
        .ud .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #d24a6e, var(--crimson));
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(164,19,60,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(164,19,60,0); }
        }
        .ud .side-sep { height: 1px; background: var(--rule); margin: 14px 4px; }
        .ud .side-tab {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 12px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; width: 100%;
          font-family: var(--sansf); font-size: 14px; font-weight: 500;
          color: var(--ink-60); transition: background .15s, color .15s;
          position: relative;
        }
        .ud .side-tab:hover { background: rgba(23,19,16,0.05); color: var(--ink); }
        .ud .side-tab.on { background: var(--ink); color: var(--paper); font-weight: 600; }
        .ud .side-cap {
          width: 4px; height: 18px; border-radius: 2px; flex-shrink: 0;
          opacity: .4; transition: opacity .15s;
        }
        .ud .side-tab.on .side-cap, .ud .side-tab:hover .side-cap { opacity: 1; }
        .ud .side-badge {
          background: var(--crimson); color: #fff; border-radius: 20px;
          min-width: 19px; height: 19px; padding: 0 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; font-family: var(--monof);
        }
        .ud .side-tab.on .side-badge { background: var(--paper); color: var(--ink); }

        .ud .live-chip {
          display: flex; align-items: center; gap: 8px;
          margin: 0 4px; padding: 9px 12px; border-radius: 8px;
          background: rgba(46,125,87,0.08); border: 1px solid rgba(46,125,87,0.25);
          font-family: var(--monof); font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2E7D57;
        }
        .ud .live-dot { position: relative; width: 7px; height: 7px; border-radius: 50%; background: #2E7D57; flex-shrink: 0; }
        .ud .live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #2E7D57; animation: ping 1.5s ease-out infinite;
        }
        .ud .side-user {
          margin-top: auto; padding: 12px; border-radius: 10px;
          background: var(--paper); border: 1px solid var(--rule);
          display: flex; align-items: center; gap: 10px;
        }
        .ud .side-avatar {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          background: rgba(164,19,60,0.10); border: 1px solid rgba(164,19,60,0.25);
          display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .ud .signout {
          margin-top: 8px; padding: 9px; border: 1px solid var(--rule); border-radius: 8px;
          background: transparent; color: var(--ink-60); cursor: pointer;
          font-family: var(--monof); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
          transition: all .15s;
        }
        .ud .signout:hover { border-color: var(--crimson); color: var(--crimson); }

        /* ---------- cards & rows ---------- */
        .ud .card {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px;
        }
        .ud .booking-row {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px 20px; margin-bottom: 10px;
          transition: all .2s; cursor: pointer;
        }
        .ud .booking-row:hover { box-shadow: 0 10px 26px rgba(23,19,16,0.09); transform: translateY(-1px); }

        /* ---------- stats ---------- */
        .ud .stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 24px; }
        .ud .stat {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 20px;
          border-top: 3px solid var(--tint, var(--crimson));
        }
        .ud .stat-v { font-family: var(--display); font-weight: 900; font-size: 34px; line-height: 1; color: var(--tint, var(--ink)); }
        .ud .stat-l {
          font-family: var(--monof); font-size: 10px; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--ink-40); margin-top: 8px;
        }

        /* ---------- CTA banner ---------- */
        .ud .banner {
          background: linear-gradient(120deg, var(--ink), #3d1020 65%, var(--crimson));
          border-radius: 14px; padding: 24px 28px; margin-bottom: 28px;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
          box-shadow: 0 18px 40px rgba(23,19,16,0.22);
        }
        .ud .banner-title { font-family: var(--display); font-weight: 900; font-size: 20px; color: #fff; margin-bottom: 4px; }
        .ud .banner-sub { font-size: 13.5px; color: rgba(255,255,255,0.65); }

        /* ---------- buttons & inputs ---------- */
        .ud .btn {
          font-family: var(--sansf); font-size: 14px; font-weight: 700;
          padding: 12px 22px; border-radius: 9px; cursor: pointer;
          border: 1px solid transparent; transition: transform .15s, background .15s, box-shadow .15s;
        }
        .ud .btn:hover { transform: translateY(-1px); }
        .ud .btn:disabled { opacity: .65; cursor: default; transform: none; }
        .ud .btn-primary { background: var(--crimson); color: #fff; box-shadow: 0 6px 18px rgba(164,19,60,0.28); }
        .ud .btn-primary:hover { background: #8B0F33; }
        .ud .btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule); }
        .ud .btn-ghost:hover { border-color: var(--ink); }
        .ud .btn-sm { padding: 7px 14px; font-size: 12.5px; border-radius: 7px; }
        .ud .btn-white { background: #fff; color: var(--crimson); }

        .ud .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-60);
        }
        .ud .inp {
          width: 100%; padding: 12px 14px;
          background: #fff; color: var(--ink);
          border: 1px solid var(--rule); border-radius: 8px;
          font-family: var(--sansf); font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .ud .inp::placeholder { color: var(--ink-40); }
        .ud .inp:focus { outline: none; border-color: var(--crimson); box-shadow: 0 0 0 3px rgba(164,19,60,0.10); }

        /* ---------- test picker ---------- */
        .ud .test-opt {
          border: 1px solid var(--rule); border-radius: 12px; padding: 18px;
          cursor: pointer; transition: all .2s; background: var(--card); position: relative;
        }
        .ud .test-opt:hover { border-color: var(--crimson); box-shadow: 0 8px 22px rgba(23,19,16,0.08); }
        .ud .test-opt.sel { border-color: var(--crimson); background: rgba(164,19,60,0.05); box-shadow: 0 0 0 3px rgba(164,19,60,0.12); }
        .ud .test-opt .check {
          position: absolute; top: 12px; right: 12px; width: 22px; height: 22px;
          border-radius: 50%; background: var(--crimson); color: #fff; font-size: 12px;
          display: flex; align-items: center; justify-content: center; font-weight: 700;
          opacity: 0; transform: scale(0.7); transition: all .2s;
        }
        .ud .test-opt.sel .check { opacity: 1; transform: scale(1); }
        .ud .cat-tag {
          font-family: var(--monof); font-size: 9.5px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--crimson); background: rgba(164,19,60,0.08);
          padding: 3px 8px; border-radius: 20px;
        }
        .ud .selected-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(164,19,60,0.07); border: 1px solid rgba(164,19,60,0.3);
          border-radius: 20px; padding: 4px 12px; font-size: 12px;
          font-weight: 600; color: var(--crimson); cursor: pointer; transition: all .2s;
        }
        .ud .selected-badge:hover { background: rgba(164,19,60,0.14); }

        /* ---------- step bar ---------- */
        .ud .stepbar { display: flex; align-items: center; gap: 8px; margin-bottom: 30px; flex-wrap: wrap; }
        .ud .step-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--monof); font-size: 11px; font-weight: 500;
          transition: all .3s;
        }

        /* ---------- reports ---------- */
        .ud .rep-card {
          background: var(--card); border: 1px solid var(--rule);
          border-left: 4px solid var(--tint, #1C7A6B);
          border-radius: 12px; padding: 20px 22px; margin-bottom: 12px;
          transition: transform .2s, box-shadow .2s;
        }
        .ud .rep-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(23,19,16,0.10); }

        /* ---------- topbar / drawer (mobile) ---------- */
        .ud .topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(251,249,245,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--rule); z-index: 100;
          align-items: center; justify-content: space-between; padding: 0 16px;
        }
        .ud .overlay { position: fixed; inset: 0; background: rgba(23,19,16,0.45); z-index: 200; }
        .ud .drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 268px; z-index: 210;
          background: var(--card); border-right: 1px solid var(--rule); overflow-y: auto;
        }

        .ud .main { flex: 1; padding: 32px 40px; overflow-y: auto; position: relative; z-index: 1; }
        .ud .inner { max-width: 860px; margin: 0 auto; }

        @media (max-width: 768px) {
          .ud .desktop-side { display: none; }
          .ud .topbar { display: flex; }
          .ud .main { padding: 76px 16px 24px; }
          .ud .stat-row { grid-template-columns: repeat(3,1fr); gap: 8px; }
          .ud .stat { padding: 14px 12px; }
          .ud .stat-v { font-size: 24px; }
          .ud .tests-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 460px) {
          .ud .tests-grid { grid-template-columns: 1fr !important; }
          .ud .stepbar span.step-name { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ud * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="desktop-side"><Sidebar /></div>

      {/* Mobile topbar */}
      <div className="topbar">
        <div className="brand" style={{ padding:0 }}><span className="brand-dot" />HemoVisit</div>
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

          {/* ══ HOME ══ */}
          {tab === "home" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-20" name="Patient" cap={CRIMSON} />
                <h1>Hello, {user?.name?.split(" ")[0]||"Patient"}.</h1>
                <p className="sub">{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
              </div>

              <div className="stat-row">
                {[
                  { label:"Total bookings", value:bookings.length,  tint:BLUE  },
                  { label:"Upcoming",       value:upcoming.length,  tint:GOLD  },
                  { label:"Completed",      value:completed.length, tint:GREEN },
                ].map(s => (
                  <div key={s.label} className="stat" style={{ "--tint":s.tint }}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="banner">
                <div>
                  <div className="banner-title">Ready for your next test?</div>
                  <div className="banner-sub">Select multiple tests — we handle them all in one visit.</div>
                </div>
                <button className="btn btn-white" onClick={() => setTab("book")}>Book now →</button>
              </div>

              {upcoming.length > 0 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>Upcoming appointments</h3>
                    <span style={{ fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase", color:GREEN, background:"rgba(46,125,87,0.08)", border:"1px solid rgba(46,125,87,0.25)", borderRadius:20, padding:"3px 9px" }}>● Live</span>
                  </div>
                  {upcoming.map(b => (
                    <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-brd":""}`}
                      style={{ borderLeft:`4px solid ${STATUS_CONFIG[b.status]?.color||CRIMSON}` }}
                      onClick={() => setExpandedId(expandedId===b._id?null:b._id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{getTestNames(b)}</div>
                          <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.8 }}>
                            📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}
                            {b.phlebotomist && <><br />🧪 {b.phlebotomist.name}</>}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                          <StatusBadge status={b.status} />
                          <span style={{ fontSize:11, color:"var(--ink-40)" }}>{expandedId===b._id?"▲ hide":"▼ track"}</span>
                        </div>
                      </div>
                      {expandedId === b._id && (
                        <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--rule)" }}>
                          <StatusTracker status={b.status} />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {bookings.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>🩸</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--ink-60)", marginBottom:12 }}>No bookings yet</div>
                  <button className="btn btn-primary" onClick={() => setTab("book")}>Book your first test</button>
                </div>
              )}
            </div>
          )}

          {/* ══ BOOK ══ */}
          {tab === "book" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-21" name="Booking" cap={GOLD} />
                <h1>Book tests.</h1>
                <p className="sub">Select one or more tests for a single home visit</p>
              </div>

              {/* Step bar */}
              <div className="stepbar">
                {["Select tests","Date & time","Address","Confirm"].map((s,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div className="step-dot" style={{
                        background: i<=step ? CRIMSON : "rgba(23,19,16,0.06)",
                        color: i<=step ? "#fff" : "rgba(23,19,16,0.4)",
                        boxShadow: i===step ? "0 0 0 4px rgba(164,19,60,0.15)" : "none",
                      }}>
                        {i < step ? "✓" : i+1}
                      </div>
                      <span className="step-name" style={{ fontSize:12, fontFamily:"var(--monof)", letterSpacing:"0.06em", textTransform:"uppercase", color:i===step?"var(--ink)":"var(--ink-40)", fontWeight:i===step?500:400 }}>{s}</span>
                    </div>
                    {i < 3 && <div style={{ width:20, height:1.5, background:i<step?CRIMSON:"var(--rule)", borderRadius:2, flexShrink:0 }} />}
                  </div>
                ))}
              </div>

              {/* Step 0 — pick tests */}
              {step === 0 && (
                <div>
                  {picked.length > 0 && (
                    <div className="card" style={{ padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:700, marginRight:4 }}>Selected ({picked.length}):</span>
                      {picked.map(t => (
                        <span key={t._id} className="selected-badge" onClick={() => toggleTest(t)}>{t.name} ✕</span>
                      ))}
                      <span style={{ marginLeft:"auto", fontFamily:"var(--display)", fontSize:17, fontWeight:900, color:CRIMSON }}>
                        Rs. {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="tests-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginBottom:24 }}>
                    {tests.map(t => (
                      <div key={t._id} className={`test-opt ${picked.find(x=>x._id===t._id)?"sel":""}`} onClick={() => toggleTest(t)}>
                        <div className="check">✓</div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span className="cat-tag">{t.category}</span>
                          <span style={{ fontFamily:"var(--monof)", fontSize:11, color:"var(--ink-40)" }}>{t.code}</span>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{t.name}</div>
                        <div style={{ fontSize:12, color:"var(--ink-60)", marginBottom:8 }}>Results in {t.duration}</div>
                        {t.preparation && <div style={{ fontSize:11, color:GOLD, marginBottom:8 }}>⚠ {t.preparation}</div>}
                        <div style={{ fontFamily:"var(--display)", fontSize:18, fontWeight:900, color:CRIMSON }}>Rs. {t.price?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary" onClick={() => picked.length ? setStep(1) : toast.error("Select at least one test.")}>
                    Next → {picked.length > 0 && `(${picked.length} test${picked.length>1?"s":""} · Rs. ${totalAmount.toLocaleString()})`}
                  </button>
                </div>
              )}

              {/* Step 1 — Date & Time */}
              {step === 1 && (
                <div style={{ maxWidth:440 }}>
                  <div className="card" style={{ padding:24, marginBottom:20 }}>
                    <div style={{ marginBottom:16 }}>
                      <FieldLabel>Appointment date</FieldLabel>
                      <input className="inp" type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={e=>setF("date",e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Preferred time</FieldLabel>
                      <input className="inp" type="time" value={form.time} onChange={e=>setF("time",e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => form.date ? setStep(2) : toast.error("Select a date.")}>Next →</button>
                  </div>
                </div>
              )}

              {/* Step 2 — Address */}
              {step === 2 && (
                <div style={{ maxWidth:440 }}>
                  <div className="card" style={{ padding:24, marginBottom:20 }}>
                    <div style={{ marginBottom:16 }}>
                      <FieldLabel>Home address</FieldLabel>
                      <textarea className="inp" rows={3} placeholder="Full address for the phlebotomist visit..." value={form.address} onChange={e=>setF("address",e.target.value)} style={{ resize:"vertical" }} />
                    </div>
                    <div>
                      <FieldLabel>Notes (optional)</FieldLabel>
                      <input className="inp" placeholder="e.g. Gate code, floor number..." value={form.notes} onChange={e=>setF("notes",e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => form.address ? setStep(3) : toast.error("Enter your address.")}>Next →</button>
                  </div>
                </div>
              )}

              {/* Step 3 — Confirm */}
              {step === 3 && (
                <div style={{ maxWidth:500 }}>
                  <div className="card" style={{ padding:24, marginBottom:20 }}>
                    <div style={{ fontFamily:"var(--monof)", fontSize:10.5, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-40)", marginBottom:16 }}>Booking summary</div>

                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-40)", marginBottom:8 }}>Selected tests ({picked.length})</div>
                      {picked.map((t) => (
                        <div key={t._id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--rule)", fontSize:13 }}>
                          <span style={{ color:"var(--ink-60)", fontWeight:500 }}>🧪 {t.name}</span>
                          <span style={{ fontWeight:700 }}>Rs. {t.price?.toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:14 }}>
                        <span style={{ fontWeight:700 }}>Total amount</span>
                        <span style={{ fontFamily:"var(--display)", fontWeight:900, color:CRIMSON, fontSize:18 }}>Rs. {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {[
                      ["📅 Date",    form.date ? new Date(form.date).toDateString() : "—"],
                      ["⏰ Time",    form.time],
                      ["📍 Address", form.address],
                      ["🏠 Service", "Home visit"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--rule)", fontSize:13 }}>
                        <span style={{ color:"var(--ink-40)", fontWeight:500 }}>{k}</span>
                        <span style={{ fontWeight:600, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                    <button className="btn btn-primary" onClick={handleBook} disabled={loading} style={{ flex:1 }}>
                      {loading ? "Booking..." : `✅ Confirm ${picked.length} test${picked.length>1?"s":""}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ MY BOOKINGS ══ */}
          {tab === "bookings" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-22" name="Bookings" cap={TEAL} />
                <h1>My bookings.</h1>
                <p className="sub">{bookings.length} total bookings</p>
              </div>
              {bookings.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--ink-60)", marginBottom:12 }}>No bookings yet</div>
                  <button className="btn btn-primary" onClick={() => setTab("book")}>Book your first test</button>
                </div>
              ) : bookings.map(b => (
                <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-brd":""}`}
                  style={{ borderLeft:`4px solid ${STATUS_CONFIG[b.status]?.color||"var(--rule)"}` }}
                  onClick={() => setExpandedId(expandedId===b._id?null:b._id)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{getTestNames(b)}</div>
                      {b.testTypes?.length > 1 && (
                        <span style={{ fontFamily:"var(--monof)", fontSize:9.5, background:"rgba(164,19,60,0.07)", color:CRIMSON, border:"1px solid rgba(164,19,60,0.3)", borderRadius:20, padding:"2px 8px", letterSpacing:"0.06em", marginBottom:6, display:"inline-block" }}>
                          {b.testTypes.length} tests
                        </span>
                      )}
                      <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.9, marginTop:4 }}>
                        📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}<br />
                        📍 {b.address||"—"}<br />
                        {b.phlebotomist && <>🧪 {b.phlebotomist.name}<br /></>}
                        💰 Rs. {b.amount?.toLocaleString()||"—"} &nbsp;
                        <span style={{ fontFamily:"var(--monof)", color:"var(--ink-40)", fontSize:10.5 }}>#{b.bookingId||"—"}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                      <StatusBadge status={b.status} />
                      {flashIds.has(b.bookingId) && <span style={{ fontSize:10, fontWeight:700, color:GREEN }}>🟢 Updated</span>}
                      <div style={{ display:"flex", gap:6 }}>
                        {b.status === "completed" && (
                          <button className="btn btn-primary btn-sm"
                            onClick={e=>{ e.stopPropagation(); openReport(b); }}
                            style={{ whiteSpace:"nowrap" }}>
                            ⬇ Report
                          </button>
                        )}
                        {["pending","confirmed"].includes(b.status) && (
                          <button className="btn btn-sm" onClick={e=>{ e.stopPropagation(); handleCancel(b._id); }}
                            style={{ background:"rgba(164,19,60,0.06)", color:CRIMSON, border:"1px solid rgba(164,19,60,0.3)" }}>
                            Cancel
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize:11, color:"var(--ink-40)" }}>{expandedId===b._id?"▲ hide":"▼ track"}</span>
                    </div>
                  </div>
                  {expandedId === b._id && !["cancelled","rejected"].includes(b.status) && (
                    <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--rule)" }}>
                      <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-40)", marginBottom:8 }}>Status tracker</div>
                      <StatusTracker status={b.status} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ MY REPORTS ══ */}
          {tab === "reports" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-23" name="Reports" cap={LAVENDER} />
                <h1>My reports.</h1>
                <p className="sub">{reports.length} verified report{reports.length!==1?"s":""} available</p>
              </div>

              {reports.length === 0 ? (
                <div className="card" style={{ padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--ink-60)", marginBottom:6 }}>No reports yet</div>
                  <div style={{ fontSize:14, color:"var(--ink-40)" }}>
                    Your lab reports will appear here once the laboratory completes your tests.
                  </div>
                </div>
              ) : (
                reports.map(rep => {
                  const testNames = rep.sample?.testTypes?.map(t => t.name).join(", ") || "—";
                  return (
                    <div key={rep._id} className="rep-card" style={{ "--tint": TEAL }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
                        <div style={{ flex:1, minWidth:200 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:"rgba(28,122,107,0.10)", border:"1px solid rgba(28,122,107,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🧬</div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15 }}>{testNames}</div>
                              <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ink-40)" }}>Verified lab report</div>
                            </div>
                          </div>
                          <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.9, marginTop:6 }}>
                            📄 Report: <span style={{ fontFamily:"var(--monof)" }}>{rep.reportId}</span> &nbsp;·&nbsp; 🔖 Booking: <span style={{ fontFamily:"var(--monof)" }}>{rep.booking?.bookingId || "—"}</span><br />
                            📅 Issued: {rep.sentAt ? new Date(rep.sentAt).toDateString() : "—"}
                            {rep.labComments && (
                              <>
                                <br />
                                <span style={{ display:"inline-block", marginTop:6, background:"rgba(184,137,46,0.08)", border:"1px solid rgba(184,137,46,0.3)", borderRadius:8, padding:"6px 10px", color:"#7A5C12" }}>
                                  💬 {rep.labComments}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(46,125,87,0.08)", color:GREEN, border:"1px solid rgba(46,125,87,0.3)" }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:GREEN }} />
                            Ready
                          </span>
                          <button
                            onClick={() => rep.fileUrl ? window.open(rep.fileUrl, "_blank", "noopener,noreferrer") : toast.error("No file available.")}
                            className="btn btn-sm"
                            style={{ background:TEAL, color:"#fff", whiteSpace:"nowrap", boxShadow:"0 6px 16px rgba(28,122,107,0.3)" }}>
                            ⬇ Download report
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--rule)", fontSize:11, color:"var(--ink-40)" }}>
                        ⚠️ This report is confidential. Please consult your physician to interpret these results.
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══ PROFILE ══ */}
          {tab === "profile" && (
            <div className="fade-up">
              <div className="head">
                <SpecimenLabel code="HV-24" name="Profile" cap={BLUE} />
                <h1>My profile.</h1>
                <p className="sub">Manage your account details</p>
              </div>
              <div style={{ maxWidth:500 }}>
                <div className="card" style={{ padding:24, marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(164,19,60,0.08)", border:"1px solid rgba(164,19,60,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>👤</div>
                  <div>
                    <div style={{ fontFamily:"var(--display)", fontWeight:900, fontSize:20, marginBottom:2 }}>{user?.name||"Patient"}</div>
                    <div style={{ fontSize:13, color:"var(--ink-60)", marginBottom:8 }}>{user?.email}</div>
                    <span style={{ fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.12em", textTransform:"uppercase", background:"rgba(164,19,60,0.07)", color:CRIMSON, border:"1px solid rgba(164,19,60,0.3)", borderRadius:20, padding:"3px 10px" }}>Patient</span>
                  </div>
                </div>
                <div className="card" style={{ padding:24 }}>
                  {[
                    { label:"Full name",    type:"text",   val:user?.name    },
                    { label:"Email",        type:"email",  val:user?.email   },
                    { label:"Phone number", type:"tel",    val:user?.phone   },
                    { label:"Age",          type:"number", val:user?.age     },
                    { label:"Address",      type:"text",   val:user?.address },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom:16 }}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <input className="inp" type={f.type} defaultValue={f.val||""} placeholder={f.label} />
                    </div>
                  ))}
                  <button className="btn btn-primary">Save changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}