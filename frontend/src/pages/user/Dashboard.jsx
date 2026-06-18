import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBookingSocket } from "../../hooks/useSocket";
import api from "../../utils/api";
import toast from "react-hot-toast";
import LabBackground from "../../components/LabBackground";

const STATUS_CONFIG = {
  pending:          { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Pending"           },
  confirmed:        { color:"#3182CE", bg:"#EBF8FF", border:"#BEE3F8", label:"Confirmed"         },
  sample_collected: { color:"#805AD5", bg:"#FAF5FF", border:"#E9D8FD", label:"Sample Collected"  },
  processing:       { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Lab Processing"    },
  completed:        { color:"#38A169", bg:"#F0FFF4", border:"#C6F6D5", label:"Report Ready"      },
  cancelled:        { color:"#718096", bg:"#F7FAFC", border:"#E2E8F0", label:"Cancelled"         },
  rejected:         { color:"#E53E3E", bg:"#FFF5F5", border:"#FED7D7", label:"Rejected"          },
};

const STATUS_STEPS = [
  { key:"pending",          icon:"📋", label:"Booking Received",     desc:"Your booking is received. Waiting for phlebotomist assignment." },
  { key:"confirmed",        icon:"✅", label:"Phlebotomist Assigned", desc:"A phlebotomist has been assigned and will visit you on schedule." },
  { key:"sample_collected", icon:"🩸", label:"Sample Collected",      desc:"Your blood sample has been collected and sent to the lab." },
  { key:"processing",       icon:"🔬", label:"Lab Processing",        desc:"Your sample is being analysed in our certified laboratory." },
  { key:"completed",        icon:"📄", label:"Report Ready",          desc:"Your results are ready! Download your verified PDF report." },
];

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
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
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, transition:"all 0.3s", background:done||active?c.color:"var(--surface2)", color:done||active?"#fff":"var(--text4)", border:active?`2px solid ${c.color}`:"2px solid transparent", boxShadow:active?`0 0 0 4px ${c.bg}`:"none" }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ paddingTop:6, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:done||active?"var(--text)":"var(--text4)" }}>
                  {s.label}
                  {active && <span style={{ marginLeft:8, fontSize:10, color:c.color, fontWeight:700, background:c.bg, padding:"2px 8px", borderRadius:20 }}>Current</span>}
                </div>
                {active && <div style={{ fontSize:12, color:"var(--text2)", marginTop:3, lineHeight:1.6 }}>{s.desc}</div>}
              </div>
            </div>
            {i < STATUS_STEPS.length-1 && <div style={{ width:2, height:16, marginLeft:15, background:done?c.color:"var(--border)", borderRadius:2 }} />}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>{children}</label>;
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
  const [reports,    setReports]    = useState([]);   // ← patient's lab reports
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
    // Reports are loaded separately so a reports failure can't block bookings
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

  // Find the report that belongs to a booking
  const reportForBooking = (b) =>
    reports.find(r => r.booking?._id === b._id || r.booking?.bookingId === b.bookingId);

  // Open (view/download) a completed booking's report
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
    { id:"home",     icon:"🏠", label:"Home"         },
    { id:"book",     icon:"📅", label:"Book a Test"  },
    { id:"bookings", icon:"📋", label:"My Bookings", badge:upcoming.length },
    { id:"reports",  icon:"📄", label:"My Reports",  badge:reports.length  },
    { id:"profile",  icon:"👤", label:"Profile"      },
  ];

  const Sidebar = () => (
    <aside style={{ width:240, background:"#fff", borderRight:"1px solid var(--border)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:2, flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto", zIndex:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:20 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🩸</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>HemoVisit</span>
      </div>
      {TABS.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setStep(0); setSideOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", transition:"all 0.15s", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", background:tab===t.id?"var(--red-light)":"transparent", color:tab===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{ flex:1 }}>{t.label}</span>
          {t.badge > 0 && <span style={{ background:"var(--red)", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
        </button>
      ))}
      <div style={{ margin:"12px 0", height:1, background:"var(--border)" }} />
      <div style={{ padding:"10px 14px", borderRadius:10, background:"#F0FFF4", border:"1px solid #C6F6D5", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ position:"relative", width:8, height:8 }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#38A169" }} />
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#38A169", animation:"ping 1.5s ease-out infinite" }} />
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:"#276749" }}>Live Updates On</span>
      </div>
      <div style={{ marginTop:"auto", padding:"14px", borderRadius:12, background:"var(--bg)", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>{user?.name||"Patient"}</div>
            <div style={{ fontSize:11, color:"var(--text3)" }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }}
          style={{ width:"100%", padding:"8px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", color:"var(--text3)", fontFamily:"var(--font)", fontSize:13, fontWeight:500, cursor:"pointer" }}>
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", fontFamily:"var(--font)", position:"relative" }}>
      <LabBackground opacity={0.1} />
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ping    { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes flash   { 0%,100%{border-color:var(--border)} 50%{border-color:var(--red);box-shadow:0 0 0 3px var(--red-light)} }
        .fade-up   { animation:fadeUp  0.4s ease forwards; }
        .slide-in  { animation:slideIn 0.3s ease forwards; }
        .flash-brd { animation:flash 0.7s ease 3; }

        .test-opt {
          border:2px solid var(--border); border-radius:14px; padding:18px;
          cursor:pointer; transition:all 0.2s; background:#fff; position:relative;
        }
        .test-opt:hover { border-color:var(--red); box-shadow:0 0 0 3px var(--red-light); }
        .test-opt.sel   { border-color:var(--red); background:var(--red-light); box-shadow:0 0 0 3px rgba(229,62,62,0.15); }
        .test-opt .check {
          position:absolute; top:12px; right:12px; width:22px; height:22px;
          border-radius:50%; background:var(--red); color:#fff; font-size:12px;
          display:flex; align-items:center; justify-content:center; font-weight:700;
          opacity:0; transform:scale(0.7); transition:all 0.2s;
        }
        .test-opt.sel .check { opacity:1; transform:scale(1); }

        .booking-row { background:#fff; border:1.5px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:10px; transition:all 0.2s; cursor:pointer; }
        .booking-row:hover { border-color:var(--red-mid); box-shadow:var(--shadow-sm); }

        .selected-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:var(--red-light); border:1.5px solid var(--red-mid);
          border-radius:20px; padding:4px 12px; font-size:12px;
          font-weight:600; color:var(--red); cursor:pointer; transition:all 0.2s;
        }
        .selected-badge:hover { background:var(--red-mid); }

        @media(max-width:768px) {
          .desktop-sidebar { display:none !important; }
          .mobile-topbar   { display:flex !important; }
          .main-pad        { padding:20px 16px !important; padding-top:76px !important; }
          .stat-row        { grid-template-columns:repeat(2,1fr) !important; }
          .tests-grid      { grid-template-columns:1fr 1fr !important; }
          .steps-ind span  { display:none; }
        }
      `}</style>

      <div className="desktop-sidebar hide-mobile" style={{ zIndex:10, position:"relative" }}><Sidebar /></div>

      <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:"#fff", borderBottom:"1px solid var(--border)", zIndex:100, alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🩸</div>
          <span style={{ fontWeight:800, fontSize:15 }}>HemoVisit</span>
        </div>
        <button onClick={() => setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {sideOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)" }} onClick={() => setSideOpen(false)} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#fff", zIndex:1 }}>
            <div style={{ padding:"16px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontWeight:800 }}>🩸 HemoVisit</span>
              <button onClick={() => setSideOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:12 }}><Sidebar /></div>
          </div>
        </div>
      )}

      <main className="main-pad" style={{ flex:1, padding:"32px 40px", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>

          {/* ══ HOME ══ */}
          {tab === "home" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
                  Hello, {user?.name?.split(" ")[0]||"Patient"} 👋
                </h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>
                  {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                </p>
              </div>
              <div className="stat-row" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"📋", label:"Total",    value:bookings.length,  color:"var(--blue)"  },
                  { icon:"⏳", label:"Upcoming", value:upcoming.length,  color:"var(--amber)" },
                  { icon:"✅", label:"Completed",value:completed.length, color:"var(--green)" },
                ].map(s => (
                  <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:20, boxShadow:"var(--shadow-sm)" }}>
                    <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:32, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:12, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"var(--red)", borderRadius:16, padding:"24px 28px", marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:18, color:"#fff", marginBottom:4 }}>Ready for your next test?</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)" }}>Select multiple tests — we handle them all in one visit.</div>
                </div>
                <button className="btn" onClick={() => setTab("book")} style={{ background:"#fff", color:"var(--red)", fontWeight:700, padding:"11px 24px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"var(--font)", fontSize:14, whiteSpace:"nowrap" }}>
                  Book Now →
                </button>
              </div>
              {upcoming.length > 0 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <h3 style={{ fontSize:16, fontWeight:700 }}>Upcoming Appointments</h3>
                    <span style={{ fontSize:11, fontWeight:600, color:"var(--green)", background:"#F0FFF4", border:"1px solid #C6F6D5", borderRadius:20, padding:"2px 8px" }}>● Live</span>
                  </div>
                  {upcoming.map(b => (
                    <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-brd":""}`}
                      style={{ borderLeft:`3px solid ${STATUS_CONFIG[b.status]?.color||"var(--red)"}` }}
                      onClick={() => setExpandedId(expandedId===b._id?null:b._id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{getTestNames(b)}</div>
                          <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.8 }}>
                            📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}
                            {b.phlebotomist && <><br />🧪 {b.phlebotomist.name}</>}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                          <StatusBadge status={b.status} />
                          <span style={{ fontSize:11, color:"var(--text4)" }}>{expandedId===b._id?"▲ hide":"▼ track"}</span>
                        </div>
                      </div>
                      {expandedId === b._id && (
                        <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
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
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>No bookings yet</div>
                  <button className="btn btn-primary" onClick={() => setTab("book")}>Book Your First Test</button>
                </div>
              )}
            </div>
          )}

          {/* ══ BOOK ══ */}
          {tab === "book" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Book Tests</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>Select one or more tests for a single home visit</p>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, flexWrap:"wrap" }}>
                {["Select Tests","Date & Time","Address","Confirm"].map((s,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, transition:"all 0.3s", background:i<=step?"var(--red)":"var(--surface2)", color:i<=step?"#fff":"var(--text4)", border:i===step?"2px solid var(--red)":"2px solid transparent" }}>
                        {i < step ? "✓" : i+1}
                      </div>
                      <span style={{ fontSize:12, color:i===step?"var(--text)":"var(--text4)", fontWeight:i===step?600:400 }}>{s}</span>
                    </div>
                    {i < 3 && <div style={{ width:20, height:1.5, background:i<step?"var(--red)":"var(--border)", borderRadius:2, flexShrink:0 }} />}
                  </div>
                ))}
              </div>

              {step === 0 && (
                <div>
                  {picked.length > 0 && (
                    <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"var(--text)", marginRight:4 }}>
                        Selected ({picked.length}):
                      </span>
                      {picked.map(t => (
                        <span key={t._id} className="selected-badge" onClick={() => toggleTest(t)}>
                          {t.name} ✕
                        </span>
                      ))}
                      <span style={{ marginLeft:"auto", fontSize:15, fontWeight:800, color:"var(--red)" }}>
                        Total: Rs. {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="tests-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginBottom:24 }}>
                    {tests.map(t => (
                      <div key={t._id} className={`test-opt ${picked.find(x=>x._id===t._id)?"sel":""}`} onClick={() => toggleTest(t)}>
                        <div className="check">✓</div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"var(--red)", background:"var(--red-light)", padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>{t.category}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"var(--text4)" }}>{t.code}</span>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4, color:"var(--text)" }}>{t.name}</div>
                        <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8 }}>Results in {t.duration}</div>
                        {t.preparation && <div style={{ fontSize:11, color:"var(--amber)", marginBottom:8 }}>⚠ {t.preparation}</div>}
                        <div style={{ fontSize:17, fontWeight:800, color:"var(--red)" }}>Rs. {t.price?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary" onClick={() => picked.length ? setStep(1) : toast.error("Select at least one test.")}>
                    Next → {picked.length > 0 && `(${picked.length} test${picked.length>1?"s":""} · Rs. ${totalAmount.toLocaleString()})`}
                  </button>
                </div>
              )}

              {step === 1 && (
                <div style={{ maxWidth:440 }}>
                  <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:24, marginBottom:20 }}>
                    <div style={{ marginBottom:16 }}>
                      <FieldLabel>Appointment Date</FieldLabel>
                      <input className="inp" type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={e=>setF("date",e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Preferred Time</FieldLabel>
                      <input className="inp" type="time" value={form.time} onChange={e=>setF("time",e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => form.date ? setStep(2) : toast.error("Select a date.")}>Next →</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ maxWidth:440 }}>
                  <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:24, marginBottom:20 }}>
                    <div style={{ marginBottom:16 }}>
                      <FieldLabel>Home Address</FieldLabel>
                      <textarea className="inp" rows={3} placeholder="Full address for the phlebotomist visit..." value={form.address} onChange={e=>setF("address",e.target.value)} style={{ resize:"vertical" }} />
                    </div>
                    <div>
                      <FieldLabel>Notes (Optional)</FieldLabel>
                      <input className="inp" placeholder="e.g. Gate code, floor number..." value={form.notes} onChange={e=>setF("notes",e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => form.address ? setStep(3) : toast.error("Enter your address.")}>Next →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ maxWidth:500 }}>
                  <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:24, marginBottom:20 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text3)", marginBottom:16, textTransform:"uppercase", letterSpacing:0.5 }}>Booking Summary</div>

                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Selected Tests ({picked.length})</div>
                      {picked.map((t) => (
                        <div key={t._id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                          <span style={{ color:"var(--text2)", fontWeight:500 }}>🧪 {t.name}</span>
                          <span style={{ fontWeight:700, color:"var(--text)" }}>Rs. {t.price?.toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:14 }}>
                        <span style={{ fontWeight:700, color:"var(--text)" }}>Total Amount</span>
                        <span style={{ fontWeight:800, color:"var(--red)", fontSize:16 }}>Rs. {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {[
                      ["📅 Date",     form.date ? new Date(form.date).toDateString() : "—"],
                      ["⏰ Time",     form.time],
                      ["📍 Address",  form.address],
                      ["🏠 Service",  "Home Visit"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                        <span style={{ color:"var(--text3)", fontWeight:500 }}>{k}</span>
                        <span style={{ fontWeight:600, color:"var(--text)", textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                    <button className="btn btn-primary" onClick={handleBook} disabled={loading} style={{ flex:1 }}>
                      {loading ? "Booking..." : `✅ Confirm ${picked.length} Test${picked.length>1?"s":""}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ MY BOOKINGS ══ */}
          {tab === "bookings" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Bookings</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{bookings.length} total bookings</p>
              </div>
              {bookings.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>No bookings yet</div>
                  <button className="btn btn-primary" onClick={() => setTab("book")}>Book Your First Test</button>
                </div>
              ) : bookings.map(b => (
                <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-brd":""}`}
                  style={{ borderLeft:`3px solid ${STATUS_CONFIG[b.status]?.color||"var(--border2)"}` }}
                  onClick={() => setExpandedId(expandedId===b._id?null:b._id)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{getTestNames(b)}</div>
                      {b.testTypes?.length > 1 && (
                        <span style={{ fontSize:10, background:"var(--red-light)", color:"var(--red)", border:"1px solid var(--red-mid)", borderRadius:20, padding:"2px 8px", fontWeight:700, marginBottom:6, display:"inline-block" }}>
                          {b.testTypes.length} tests
                        </span>
                      )}
                      <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9, marginTop:4 }}>
                        📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}<br />
                        📍 {b.address||"—"}<br />
                        {b.phlebotomist && <>🧪 {b.phlebotomist.name}<br /></>}
                        💰 Rs. {b.amount?.toLocaleString()||"—"} &nbsp;
                        <span style={{ color:"var(--text4)", fontSize:11 }}>#{b.bookingId||"—"}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                      <StatusBadge status={b.status} />
                      {flashIds.has(b.bookingId) && <span style={{ fontSize:10, fontWeight:700, color:"var(--green)" }}>🟢 Updated</span>}
                      <div style={{ display:"flex", gap:6 }}>
                        {b.status === "completed" && (
                          <button className="btn btn-primary btn-sm"
                            onClick={e=>{ e.stopPropagation(); openReport(b); }}
                            style={{ whiteSpace:"nowrap" }}>
                            ⬇ Report
                          </button>
                        )}
                        {["pending","confirmed"].includes(b.status) && (
                          <button className="btn btn-sm" onClick={e=>{ e.stopPropagation(); handleCancel(b._id); }} style={{ background:"var(--red-light)", color:"var(--red)", border:"1.5px solid var(--red-mid)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:600, fontSize:12 }}>Cancel</button>
                        )}
                      </div>
                      <span style={{ fontSize:11, color:"var(--text4)" }}>{expandedId===b._id?"▲ hide":"▼ track"}</span>
                    </div>
                  </div>
                  {expandedId === b._id && !["cancelled","rejected"].includes(b.status) && (
                    <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Status Tracker</div>
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
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Reports</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>
                  {reports.length} verified report{reports.length!==1?"s":""} available
                </p>
              </div>

              {reports.length === 0 ? (
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>No reports yet</div>
                  <div style={{ fontSize:14, color:"var(--text3)" }}>
                    Your lab reports will appear here once the laboratory completes your tests.
                  </div>
                </div>
              ) : (
                reports.map(rep => {
                  const testNames = rep.sample?.testTypes?.map(t => t.name).join(", ") || "—";
                  return (
                    <div key={rep._id} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"20px 22px", marginBottom:12, borderLeft:"3px solid #1E6F5C" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
                        <div style={{ flex:1, minWidth:200 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:"#F0FBF7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🧬</div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15 }}>{testNames}</div>
                              <div style={{ fontSize:12, color:"var(--text3)" }}>Verified Lab Report</div>
                            </div>
                          </div>
                          <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9, marginTop:6 }}>
                            📄 Report: {rep.reportId} &nbsp;·&nbsp; 🔖 Booking: {rep.booking?.bookingId || "—"}<br />
                            📅 Issued: {rep.sentAt ? new Date(rep.sentAt).toDateString() : "—"}
                            {rep.labComments && (
                              <>
                                <br />
                                <span style={{ display:"inline-block", marginTop:6, background:"#FFFDF0", border:"1px solid #FBEFC4", borderRadius:8, padding:"6px 10px", color:"#7A5C12" }}>
                                  💬 {rep.labComments}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#F0FFF4", color:"#276749", border:"1px solid #C6F6D5" }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:"#38A169" }} />
                            Ready
                          </span>
                          <button
                            onClick={() => rep.fileUrl ? window.open(rep.fileUrl, "_blank", "noopener,noreferrer") : toast.error("No file available.")}
                            className="btn btn-primary btn-sm"
                            style={{ background:"#1E6F5C", whiteSpace:"nowrap" }}>
                            ⬇ Download Report
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--border)", fontSize:11, color:"var(--text4)" }}>
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
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Profile</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>Manage your account details</p>
              </div>
              <div style={{ maxWidth:500 }}>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:16, padding:24, marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>👤</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:18, marginBottom:4 }}>{user?.name||"Patient"}</div>
                    <div style={{ fontSize:13, color:"var(--text3)", marginBottom:8 }}>{user?.email}</div>
                    <span className="tag tag-red">Patient</span>
                  </div>
                </div>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:16, padding:24 }}>
                  {[
                    { label:"Full Name",    type:"text",   val:user?.name    },
                    { label:"Email",        type:"email",  val:user?.email   },
                    { label:"Phone Number", type:"tel",    val:user?.phone   },
                    { label:"Age",          type:"number", val:user?.age     },
                    { label:"Address",      type:"text",   val:user?.address },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom:16 }}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <input className="inp" type={f.type} defaultValue={f.val||""} placeholder={f.label} />
                    </div>
                  ))}
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}