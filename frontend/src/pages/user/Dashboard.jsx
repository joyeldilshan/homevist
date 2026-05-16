import { useState, useEffect } from "react";
import LabBackground from "../../components/LabBackground";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBookingSocket } from "../../hooks/useSocket";
import api from "../../utils/api";
import toast from "react-hot-toast";

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
  { key:"pending",          icon:"📋", label:"Booking Received",      desc:"Your booking is received. Waiting for phlebotomist assignment." },
  { key:"confirmed",        icon:"✅", label:"Phlebotomist Assigned",  desc:"A phlebotomist has been assigned and will visit you on schedule." },
  { key:"sample_collected", icon:"🩸", label:"Sample Collected",       desc:"Your blood sample has been collected and sent to the lab." },
  { key:"processing",       icon:"🔬", label:"Lab Processing",         desc:"Your sample is being analysed in our certified laboratory." },
  { key:"completed",        icon:"📄", label:"Report Ready",           desc:"Your results are ready! Download your verified PDF report." },
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
      <LabBackground opacity={0.1} />
      {STATUS_STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        const c      = STATUS_CONFIG[s.key];
        return (
          <div key={s.key}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"6px 0" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, transition:"all 0.3s", background: done||active ? c.color : "var(--surface2)", color: done||active ? "#fff" : "var(--text4)", border: active ? `2px solid ${c.color}` : "2px solid transparent", boxShadow: active ? `0 0 0 4px ${c.bg}` : "none" }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ paddingTop:6, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: done||active ? "var(--text)" : "var(--text4)" }}>
                  {s.label}
                  {active && <span style={{ marginLeft:8, fontSize:10, color:c.color, fontWeight:700, background:c.bg, padding:"2px 8px", borderRadius:20 }}>Current</span>}
                </div>
                {active && <div style={{ fontSize:12, color:"var(--text2)", marginTop:3, lineHeight:1.6 }}>{s.desc}</div>}
              </div>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ width:2, height:16, marginLeft:15, background: done ? c.color : "var(--border)", borderRadius:2 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("home");
  const [bookings,   setBookings]   = useState([]);
  const [tests,      setTests]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [flashIds,   setFlashIds]   = useState(new Set());
  const [sideOpen,   setSideOpen]   = useState(false);

  // Book form
  const [step,       setStep]       = useState(0);
  const [picked,     setPicked]     = useState(null);
  const [form,       setForm]       = useState({ date:"", time:"09:00", address:user?.address||"", notes:"" });
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  const load = async () => {
    try {
      const r = await api.get("/bookings");
      setBookings(r.data.bookings || []);
    } catch(e) { console.error(e?.response?.data || e.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    load();
    if (tab==="book") api.get("/test-types").then(r=>setTests(r.data.testTypes||[])).catch(()=>{});
  }, [tab]);

  const bookingIds = bookings.map(b=>b.bookingId).filter(Boolean);
  useBookingSocket(bookingIds, ({ bookingId, status }) => {
    const info = STATUS_STEPS.find(s=>s.key===status);
    toast.success(`Booking ${bookingId}: ${info?.label || status}`);
    setFlashIds(p=>new Set([...p, bookingId]));
    setTimeout(()=>setFlashIds(p=>{ const n=new Set(p); n.delete(bookingId); return n; }), 4000);
    load();
  });

  const handleBook = async () => {
    if (!picked||!form.date||!form.address) { toast.error("Fill in all required fields."); return; }
    setLoading(true);
    try {
      await api.post("/bookings", { testTypeId:picked._id, appointmentDate:form.date, appointmentTime:form.time, address:form.address, notes:form.notes });
      toast.success("Booking confirmed! 🩸");
      setStep(0); setPicked(null); setTab("bookings"); load();
    } catch(e) { toast.error(e.response?.data?.message || "Booking failed."); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status:"cancelled" });
      toast.success("Booking cancelled."); load();
    } catch { toast.error("Could not cancel."); }
  };

  const upcoming  = bookings.filter(b=>["pending","confirmed","sample_collected","processing"].includes(b.status));
  const completed = bookings.filter(b=>b.status==="completed");

  const TABS = [
    { id:"home",     icon:"🏠", label:"Home"        },
    { id:"book",     icon:"📅", label:"Book a Test" },
    { id:"bookings", icon:"📋", label:"My Bookings", badge:upcoming.length },
    { id:"profile",  icon:"👤", label:"Profile"     },
  ];

  const Sidebar = () => (
    <aside style={{ width:240, background:"#fff", borderRight:"1px solid var(--border)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:2, flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:20 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🩸</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>HemoVisit</span>
      </div>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>{ setTab(t.id); setStep(0); setSideOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", transition:"all 0.15s", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", background:tab===t.id?"var(--red-light)":"transparent", color:tab===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{ flex:1 }}>{t.label}</span>
          {t.badge>0 && <span style={{ background:"var(--red)", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
        </button>
      ))}
      <div style={{ margin:"12px 0", height:1, background:"var(--border)" }} />
      {/* Live indicator */}
      <div style={{ padding:"10px 14px", borderRadius:10, background:"#F0FFF4", border:"1px solid #C6F6D5", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ position:"relative", width:8, height:8 }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#38A169" }} />
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#38A169", animation:"ping 1.5s ease-out infinite" }} />
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:"#276749" }}>Live Updates On</span>
      </div>
      <div style={{ marginTop:"auto", padding:"12px 14px", borderRadius:12, background:"var(--bg)", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{user?.name||"Patient"}</div>
            <div style={{ fontSize:11, color:"var(--text3)" }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={()=>{ logout(); navigate("/login"); }} style={{ width:"100%", padding:"8px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", color:"var(--text3)", fontFamily:"var(--font)", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}
          onMouseOver={e=>{ e.target.style.borderColor="var(--red)"; e.target.style.color="var(--red)"; }}
          onMouseOut={e=>{  e.target.style.borderColor="var(--border)"; e.target.style.color="var(--text3)"; }}>
          Sign Out
        </button>
      </div>
    </aside>
  );

  const FieldLabel = ({ children }) => <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>{children}</label>;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", fontFamily:"var(--font)" }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ping    { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes flash   { 0%,100%{border-color:var(--border)} 50%{border-color:var(--red); box-shadow:0 0 0 3px var(--red-light)} }
        .fade-up  { animation:fadeUp  0.4s ease forwards; }
        .slide-in { animation:slideIn 0.3s ease forwards; }
        .flash-card { animation:flash 0.7s ease 3; }

        .test-opt { border:2px solid var(--border); border-radius:14px; padding:18px; cursor:pointer; transition:all 0.2s; background:#fff; }
        .test-opt:hover { border-color:var(--red); box-shadow:0 0 0 3px var(--red-light); }
        .test-opt.sel   { border-color:var(--red); background:var(--red-light); }

        .booking-row { background:#fff; border:1.5px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:10px; transition:all 0.2s; cursor:pointer; }
        .booking-row:hover { border-color:var(--red-mid); box-shadow:var(--shadow-sm); }

        /* Mobile */
        .mobile-topbar { display:none; }
        @media(max-width:768px) {
          .desktop-sidebar { display:none !important; }
          .mobile-topbar   { display:flex !important; }
          .main-pad        { padding:20px 16px !important; }
          .stat-row        { grid-template-columns:repeat(2,1fr) !important; }
          .steps-ind       { gap:4px !important; }
          .steps-ind span  { display:none; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar hide-mobile"><Sidebar /></div>

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ position:"fixed", top:0, left:0, right:0, height:56, background:"#fff", borderBottom:"1px solid var(--border)", zIndex:100, alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🩸</div>
          <span style={{ fontWeight:800, fontSize:15 }}>HemoVisit</span>
        </div>
        <button onClick={()=>setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {/* Mobile sidebar drawer */}
      {sideOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)" }} onClick={()=>setSideOpen(false)} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#fff", zIndex:1 }}>
            <div style={{ padding:"16px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:800 }}>🩸 HemoVisit</span>
              <button onClick={()=>setSideOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:12 }}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>{ setTab(t.id); setStep(0); setSideOpen(false); }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", marginBottom:2, background:tab===t.id?"var(--red-light)":"transparent", color:tab===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)" }}>
                  <span>{t.icon}</span><span style={{ flex:1 }}>{t.label}</span>
                  {t.badge>0 && <span style={{ background:"var(--red)", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
                </button>
              ))}
              <button onClick={()=>{ logout(); navigate("/login"); }} style={{ width:"100%", marginTop:16, padding:"10px", border:"1.5px solid var(--border)", borderRadius:10, background:"#fff", color:"var(--text2)", fontFamily:"var(--font)", fontSize:14, fontWeight:500, cursor:"pointer" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="main-pad" style={{ flex:1, padding:"32px 40px", overflowY:"auto", paddingTop:"calc(32px + env(safe-area-inset-top))" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>

          {/* ══ HOME ══ */}
          {tab==="home" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
                  Hello, {user?.name?.split(" ")[0]||"Patient"} 👋
                </h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>
                  {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                </p>
              </div>

              {/* Stats */}
              <div className="stat-row" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"📋", label:"Total",    value:bookings.length,  color:"var(--blue)"  },
                  { icon:"⏳", label:"Upcoming", value:upcoming.length,  color:"var(--amber)" },
                  { icon:"✅", label:"Completed",value:completed.length, color:"var(--green)" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"20px", boxShadow:"var(--shadow-sm)" }}>
                    <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:32, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:12, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Book CTA */}
              <div style={{ background:"var(--red)", borderRadius:16, padding:"24px 28px", marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:18, color:"#fff", marginBottom:4 }}>Ready for your next test?</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)" }}>Book a home visit in under 2 minutes.</div>
                </div>
                <button className="btn" onClick={()=>setTab("book")} style={{ background:"#fff", color:"var(--red)", fontWeight:700, padding:"11px 24px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"var(--font)", fontSize:14, whiteSpace:"nowrap" }}>
                  Book Now →
                </button>
              </div>

              {/* Upcoming */}
              {upcoming.length>0 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, color:"var(--text)" }}>Upcoming Appointments</h3>
                    <span style={{ fontSize:11, fontWeight:600, color:"var(--green)", background:"#F0FFF4", border:"1px solid #C6F6D5", borderRadius:20, padding:"2px 8px" }}>● Live</span>
                  </div>
                  {upcoming.map(b=>(
                    <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-card":""}`}
                      style={{ borderLeft:`3px solid ${STATUS_CONFIG[b.status]?.color||"var(--red)"}` }}
                      onClick={()=>setExpandedId(expandedId===b._id?null:b._id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{b.testType?.name||"—"}</div>
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
                      {expandedId===b._id && (
                        <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Status Tracker</div>
                          <StatusTracker status={b.status} />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {bookings.length===0 && (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>🩸</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>No bookings yet</div>
                  <div style={{ fontSize:14, color:"var(--text3)", marginBottom:20 }}>Book your first home blood test today</div>
                  <button className="btn btn-primary" onClick={()=>setTab("book")}>Book Your First Test</button>
                </div>
              )}
            </div>
          )}

          {/* ══ BOOK ══ */}
          {tab==="book" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Book a Test</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>Select a test and schedule a home visit</p>
              </div>

              {/* Step bar */}
              <div className="steps-ind" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32 }}>
                {["Select Test","Date & Time","Address","Confirm"].map((s,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, transition:"all 0.3s", background:i<=step?"var(--red)":"var(--surface2)", color:i<=step?"#fff":"var(--text4)", border:i===step?"2px solid var(--red)":"2px solid transparent" }}>
                        {i<step?"✓":i+1}
                      </div>
                      <span style={{ fontSize:12, color:i===step?"var(--text)":"var(--text4)", fontWeight:i===step?600:400 }}>{s}</span>
                    </div>
                    {i<3 && <div style={{ width:24, height:1.5, background:i<step?"var(--red)":"var(--border)", borderRadius:2, flexShrink:0 }} />}
                  </div>
                ))}
              </div>

              {/* Step 0 */}
              {step===0 && (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginBottom:24 }}>
                    {tests.map(t=>(
                      <div key={t._id} className={`test-opt ${picked?._id===t._id?"sel":""}`} onClick={()=>setPicked(t)}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"var(--red)", background:"var(--red-light)", padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>{t.category}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"var(--text4)" }}>{t.code}</span>
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4, color:"var(--text)" }}>{t.name}</div>
                        <div style={{ fontSize:12, color:"var(--text3)", marginBottom:10 }}>Results in {t.duration}</div>
                        {t.preparation && <div style={{ fontSize:11, color:"var(--amber)", marginBottom:10 }}>⚠ {t.preparation}</div>}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:17, fontWeight:800, color:"var(--red)" }}>Rs. {t.price?.toLocaleString()}</span>
                          {picked?._id===t._id && <span style={{ fontSize:11, fontWeight:700, color:"var(--green)" }}>✓ Selected</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" onClick={()=>picked?setStep(1):toast.error("Select a test first.")}>Next →</button>
                </div>
              )}

              {/* Step 1 */}
              {step===1 && (
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
                    <button className="btn btn-ghost" onClick={()=>setStep(0)}>← Back</button>
                    <button className="btn btn-primary" onClick={()=>form.date?setStep(2):toast.error("Select a date.")}>Next →</button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {step===2 && (
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
                    <button className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
                    <button className="btn btn-primary" onClick={()=>form.address?setStep(3):toast.error("Enter your address.")}>Next →</button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step===3 && picked && (
                <div style={{ maxWidth:440 }}>
                  <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:24, marginBottom:20 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text3)", marginBottom:16, textTransform:"uppercase", letterSpacing:0.5 }}>Booking Summary</div>
                    {[
                      ["Test",    picked.name],
                      ["Date",    form.date?new Date(form.date).toDateString():"—"],
                      ["Time",    form.time],
                      ["Address", form.address],
                      ["Amount",  `Rs. ${picked.price?.toLocaleString()}`],
                      ["Service", "🏠 Home Visit"],
                    ].map(([k,v])=>(
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:14 }}>
                        <span style={{ color:"var(--text3)", fontWeight:500 }}>{k}</span>
                        <span style={{ fontWeight:600, color:"var(--text)", textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-ghost" onClick={()=>setStep(2)}>← Back</button>
                    <button className="btn btn-primary" onClick={handleBook} disabled={loading} style={{ flex:1 }}>
                      {loading?"Booking...":"✅ Confirm Booking"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ BOOKINGS ══ */}
          {tab==="bookings" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Bookings</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{bookings.length} total bookings</p>
              </div>
              {bookings.length===0 ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                  <div style={{ fontSize:16, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>No bookings yet</div>
                  <button className="btn btn-primary" onClick={()=>setTab("book")}>Book Your First Test</button>
                </div>
              ) : bookings.map(b=>(
                <div key={b._id} className={`booking-row ${flashIds.has(b.bookingId)?"flash-card":""}`}
                  style={{ borderLeft:`3px solid ${STATUS_CONFIG[b.status]?.color||"var(--border2)"}` }}
                  onClick={()=>setExpandedId(expandedId===b._id?null:b._id)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{b.testType?.name||"—"}</div>
                      <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9 }}>
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
                        {b.status==="completed" && (
                          <button className="btn btn-primary btn-sm" onClick={e=>e.stopPropagation()}>⬇ Report</button>
                        )}
                        {["pending","confirmed"].includes(b.status) && (
                          <button className="btn btn-sm" onClick={e=>{ e.stopPropagation(); handleCancel(b._id); }} style={{ background:"var(--red-light)", color:"var(--red)", border:"1.5px solid var(--red-mid)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:600, fontSize:12 }}>Cancel</button>
                        )}
                      </div>
                      <span style={{ fontSize:11, color:"var(--text4)" }}>{expandedId===b._id?"▲ hide":"▼ track"}</span>
                    </div>
                  </div>
                  {expandedId===b._id && !["cancelled","rejected"].includes(b.status) && (
                    <div className="slide-in" style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Status Tracker</div>
                      <StatusTracker status={b.status} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ PROFILE ══ */}
          {tab==="profile" && (
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
                  ].map(f=>(
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