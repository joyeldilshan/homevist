import { useState, useEffect } from "react";
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

const STATUS_CONFIG = {
  pending:          { color:GOLD,      label:"Pending"        },
  confirmed:        { color:BLUE,      label:"Confirmed"      },
  sample_collected: { color:LAVENDER,  label:"Sent to Lab"    },
  processing:       { color:CRIMSON,   label:"Lab Processing" },
  completed:        { color:GREEN,     label:"Completed"      },
  cancelled:        { color:"#8A8378", label:"Cancelled"      },
  rejected:         { color:CRIMSON,   label:"Rejected"       },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:20, fontFamily:"var(--monof)", fontSize:9.5, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", background:`${c.color}14`, color:c.color, border:`1px solid ${c.color}55`, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
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

const getTestNames = (b) =>
  b.testTypes?.length ? b.testTypes.map(t => t.name).join(", ") : (b.testType?.name || "—");

export default function PhleboDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,       setTab]       = useState("dashboard");
  const [bookings,  setBookings]  = useState([]);
  const [available, setAvailable] = useState(user?.isAvailable||false);
  const [sideOpen,  setSideOpen]  = useState(false);
  const [sending,   setSending]   = useState(null); // bookingId currently being sent

  const fetchBookings = async () => {
    try {
      const r = await api.get("/bookings");
      setBookings(r.data.bookings||[]);
    } catch(e) { console.error(e?.response?.data||e.message); }
  };

  useEffect(() => { fetchBookings(); }, []);
  useEffect(() => { fetchBookings(); }, [tab]);

  const updateStatus = async (id, status, note="") => {
    try {
      await api.patch(`/bookings/${id}/status`, { status, note });
      toast.success(`Status updated to ${status.replace("_"," ")}`);
      fetchBookings();
    } catch(err) { toast.error(err.response?.data?.message || "Failed to update."); }
  };

  // Create a Sample record → this is what makes it appear in the MLT dashboard.
  // Backend is idempotent, so clicking on an already-sent booking is safe.
  const sendToLab = async (bookingId) => {
    setSending(bookingId);
    try {
      const res = await api.post("/samples", { bookingId });
      toast.success(res.data?.message || "🧫 Sample sent to lab!");
      fetchBookings();
    } catch(err) {
      toast.error(err.response?.data?.message || "Failed to send to lab.");
    } finally {
      setSending(null);
    }
  };

  const toggleAvailability = async () => {
    try {
      await api.put("/auth/update-profile", { isAvailable:!available });
      setAvailable(v=>!v);
      toast.success(!available?"You are now Online 🟢":"You are now Offline 🔴");
    } catch { toast.error("Could not update availability."); }
  };

  const active    = bookings.filter(b=>!["completed","cancelled","rejected"].includes(b.status));
  const completed = bookings.filter(b=>b.status==="completed");

  const TABS = [
    { id:"dashboard", icon:"📊", label:"Dashboard", cap:BLUE     },
    { id:"jobs",      icon:"🗓",  label:"My Jobs",   cap:GOLD     },
    { id:"history",   icon:"📋", label:"History",   cap:GREEN    },
    { id:"profile",   icon:"👤", label:"Profile",   cap:LAVENDER },
  ];

  const JobCard = ({ b }) => (
    <div className="jcard" style={{ borderLeft:`4px solid ${STATUS_CONFIG[b.status]?.color||"var(--rule)"}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:5 }}>{b.user?.name||"Patient"}</div>
          <div style={{ fontSize:12, color:"var(--ink-60)", lineHeight:1.9 }}>
            🧪 {getTestNames(b)}<br />
            📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}<br />
            📍 {b.address||"—"}<br />
            📞 {b.user?.phone||"—"}<br />
            💰 Rs. {b.amount?.toLocaleString()||"—"} &nbsp;
            <span style={{ fontFamily:"var(--monof)", color:"var(--ink-40)", fontSize:10.5 }}>#{b.bookingId||"—"}</span>
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Flow guide */}
      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:14, flexWrap:"wrap" }}>
        {["pending","confirmed","sample_collected","processing","completed"].map((s,i,arr)=>{
          const cur = arr.indexOf(b.status);
          const me  = arr.indexOf(s);
          const c   = STATUS_CONFIG[s];
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:me<=cur?c.color:"rgba(23,19,16,0.15)", flexShrink:0, transition:"background 0.3s" }} />
              <span style={{ fontFamily:"var(--monof)", fontSize:9, letterSpacing:"0.06em", textTransform:"uppercase", color:me===cur?c.color:me<cur?"var(--ink-60)":"var(--ink-40)", fontWeight:me===cur?500:400 }}>
                {["Pending","Confirmed","At Lab","Processing","Done"][i]}
              </span>
              {i<arr.length-1 && <span style={{ color:"rgba(23,19,16,0.2)", fontSize:10 }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {b.status==="pending" && (
          <>
            <button className="act" style={{ color:GREEN, borderColor:`${GREEN}55` }}
              onClick={()=>updateStatus(b._id,"confirmed","Accepted by phlebotomist")}>
              ✅ Accept job
            </button>
            <button className="act" style={{ color:CRIMSON, borderColor:`${CRIMSON}55` }}
              onClick={()=>updateStatus(b._id,"rejected","Rejected by phlebotomist")}>
              ✕ Reject
            </button>
          </>
        )}

        {/* Show Send-to-Lab on BOTH confirmed AND sample_collected.
            This guarantees a Sample record gets created and rescues any
            booking stranded at "sample_collected" without one. The backend
            is idempotent, so clicking again is always safe. */}
        {(b.status==="confirmed" || b.status==="sample_collected") && (
          <button className="act act-solid" disabled={sending===b._id}
            onClick={()=>sendToLab(b._id)}
            style={{ opacity:sending===b._id?0.6:1 }}>
            {sending===b._id ? "Sending..." : "🧫 Collect & send to lab"}
          </button>
        )}
        {b.status==="sample_collected" && (
          <span className="state-chip" style={{ color:LAVENDER }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:LAVENDER, display:"inline-block" }} />
            At lab
          </span>
        )}

        {b.status==="processing" && (
          <span className="state-chip" style={{ color:GOLD }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:GOLD, display:"inline-block" }} />
            Lab is processing the sample
          </span>
        )}
        {b.status==="completed" && (
          <span className="state-chip" style={{ color:GREEN }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:GREEN, display:"inline-block" }} />
            Report delivered to patient
          </span>
        )}
      </div>
    </div>
  );

  const Sidebar = () => (
    <aside className="side">
      <div className="brand"><span className="brand-dot" />HemoVisit</div>

      {/* Availability toggle */}
      <div className="avail" style={{ borderColor: available ? `${GREEN}55` : "var(--rule)", background: available ? "rgba(46,125,87,0.06)" : "var(--paper)" }}>
        <div className="avail-t">Availability</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:available?GREEN:"rgba(23,19,16,0.3)", transition:"background 0.3s" }} />
            <span style={{ fontFamily:"var(--monof)", fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:500, color:available?GREEN:"var(--ink-60)" }}>{available?"Online":"Offline"}</span>
          </div>
          <div onClick={toggleAvailability} style={{ width:42, height:23, borderRadius:50, background:available?GREEN:"rgba(23,19,16,0.2)", cursor:"pointer", position:"relative", transition:"all 0.3s" }}>
            <div style={{ position:"absolute", top:2.5, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.3s", left:available?"22px":"2.5px", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }} />
          </div>
        </div>
      </div>

      {TABS.map(t=>(
        <button key={t.id} onClick={()=>{ setTab(t.id); setSideOpen(false); }}
          className={`side-tab ${tab===t.id?"on":""}`}>
          <span className="side-cap" style={{ background:t.cap }} />
          <span style={{ fontSize:15 }}>{t.icon}</span>
          <span style={{ flex:1, textAlign:"left" }}>{t.label}</span>
        </button>
      ))}

      <div className="side-user">
        <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>{user?.name||"Phlebotomist"}</div>
        <div style={{ fontFamily:"var(--monof)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(23,19,16,0.45)", marginBottom:4 }}>Phlebotomist</div>
        <div style={{ fontSize:12, color:GOLD }}>⭐ {user?.rating?.toFixed(1)||"5.0"} · {user?.totalRatings||0} reviews</div>
      </div>
      <button className="signout" onClick={()=>{ logout(); navigate("/login"); }}>Sign out</button>
    </aside>
  );

  return (
    <div className="ph">
      <style>{`
        .ph {
          --paper:   #F3F0EA;
          --card:    #FBF9F5;
          --ink:     #171310;
          --ink-60:  rgba(23,19,16,0.62);
          --ink-40:  rgba(23,19,16,0.42);
          --rule:    rgba(23,19,16,0.13);
          --blue:    #3E6C9E;
          --display: "Playfair Display", Georgia, serif;
          --sansf:   "DM Sans", system-ui, -apple-system, sans-serif;
          --monof:   "DM Mono", ui-monospace, "SF Mono", monospace;

          min-height: 100vh; min-height: 100dvh;
          background: var(--paper); color: var(--ink);
          font-family: var(--sansf); display: flex; position: relative;
        }
        .ph *, .ph *::before, .ph *::after { box-sizing: border-box; }
        .ph :focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .ph .fade-up { animation: fadeUp .4s ease forwards; }

        .ph h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3.2vw, 34px); letter-spacing: -0.015em; margin: 0 0 4px;
        }
        .ph .sub { color: var(--ink-60); font-size: 14px; margin: 0 0 24px; }

        .ph .sl {
          display: inline-flex; align-items: stretch;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--card); overflow: hidden; margin-bottom: 14px;
        }
        .ph .sl-cap  { width: 7px; }
        .ph .sl-body { padding: 5px 10px; display: flex; align-items: center; gap: 10px; }
        .ph .sl-code { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
        .ph .sl-name { font-family: var(--monof); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); }
        .ph .sl-bar {
          width: 36px; align-self: stretch; min-height: 12px; opacity: .7;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        /* sidebar */
        .ph .side {
          width: 246px; flex-shrink: 0;
          background: var(--card); border-right: 1px solid var(--rule);
          padding: 22px 14px; display: flex; flex-direction: column; gap: 3px;
          position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; z-index: 10;
        }
        .ph .brand {
          display: flex; align-items: center; gap: 9px; padding: 4px 10px 2px; margin-bottom: 12px;
          font-family: var(--monof); font-size: 12.5px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
        }
        .ph .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #6f97c6, var(--blue));
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(62,108,158,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(62,108,158,0); }
        }
        .ph .avail {
          margin: 0 4px 14px; padding: 12px; border-radius: 10px;
          border: 1px solid; transition: all .3s;
        }
        .ph .avail-t {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink-40); margin-bottom: 8px;
        }
        .ph .side-tab {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; width: 100%;
          font-family: var(--sansf); font-size: 13.5px; font-weight: 500;
          color: var(--ink-60); transition: background .15s, color .15s;
        }
        .ph .side-tab:hover { background: rgba(23,19,16,0.05); color: var(--ink); }
        .ph .side-tab.on { background: var(--ink); color: var(--paper); font-weight: 600; }
        .ph .side-cap { width: 4px; height: 17px; border-radius: 2px; flex-shrink: 0; opacity: .4; transition: opacity .15s; }
        .ph .side-tab.on .side-cap, .ph .side-tab:hover .side-cap { opacity: 1; }
        .ph .side-user {
          margin-top: auto; padding: 12px; border-radius: 10px;
          background: var(--paper); border: 1px solid var(--rule);
        }
        .ph .signout {
          margin-top: 8px; padding: 9px; border: 1px solid var(--rule); border-radius: 8px;
          background: transparent; color: var(--ink-60); cursor: pointer;
          font-family: var(--monof); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
          transition: all .15s;
        }
        .ph .signout:hover { border-color: var(--blue); color: var(--blue); }

        /* cards */
        .ph .card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; }
        .ph .jcard {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px 20px; margin-bottom: 12px;
          transition: transform .2s, box-shadow .2s;
        }
        .ph .jcard:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(23,19,16,0.08); }

        .ph .stat {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 18px;
          border-top: 3px solid var(--tint, var(--blue));
        }
        .ph .stat-v { font-family: var(--display); font-weight: 900; font-size: clamp(22px,2.6vw,30px); line-height: 1; color: var(--tint, var(--ink)); }
        .ph .stat-l {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-40); margin-top: 8px;
        }

        /* buttons & inputs */
        .ph .act {
          padding: 8px 15px; border-radius: 7px; font-family: var(--sansf);
          font-weight: 700; font-size: 12.5px; cursor: pointer; transition: all .15s;
          background: transparent; border: 1px solid;
        }
        .ph .act:hover { transform: translateY(-1px); }
        .ph .act:disabled { cursor: default; transform: none; }
        .ph .act-solid {
          background: var(--blue); color: #fff; border-color: transparent;
          box-shadow: 0 6px 16px rgba(62,108,158,0.3);
        }
        .ph .act-solid:hover { background: #2f547d; }

        .ph .state-chip {
          font-family: var(--monof); font-size: 10.5px; letter-spacing: 0.08em;
          text-transform: uppercase; font-weight: 500;
          display: flex; align-items: center; gap: 6px;
        }

        .ph .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-60);
        }
        .ph .inp {
          width: 100%; padding: 11px 13px;
          background: #fff; color: var(--ink);
          border: 1px solid var(--rule); border-radius: 8px;
          font-family: var(--sansf); font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .ph .inp:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(62,108,158,0.12); }

        .ph .btn-save {
          padding: 12px 22px; border-radius: 9px; border: none; cursor: pointer;
          background: var(--blue); color: #fff;
          font-family: var(--sansf); font-size: 14px; font-weight: 700;
          box-shadow: 0 6px 18px rgba(62,108,158,0.28);
          transition: background .2s, transform .15s;
        }
        .ph .btn-save:hover { background: #2f547d; transform: translateY(-1px); }

        /* mobile */
        .ph .topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(251,249,245,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--rule); z-index: 100;
          align-items: center; justify-content: space-between; padding: 0 16px;
        }
        .ph .overlay { position: fixed; inset: 0; background: rgba(23,19,16,0.45); z-index: 200; }
        .ph .drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 268px; z-index: 210;
          background: var(--card); border-right: 1px solid var(--rule); overflow-y: auto;
        }
        .ph .main { flex: 1; padding: 32px 40px; overflow-y: auto; position: relative; z-index: 1; }
        .ph .inner { max-width: 860px; margin: 0 auto; }

        @media (max-width: 768px) {
          .ph .desktop-side { display: none; }
          .ph .topbar { display: flex; }
          .ph .main { padding: 76px 14px 24px; }
          .ph .stats4 { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ph * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="desktop-side"><Sidebar /></div>

      <div className="topbar">
        <div className="brand" style={{ padding:0, marginBottom:0 }}><span className="brand-dot" />HemoVisit</div>
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

          {tab==="dashboard" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-50" name="Field team" cap={BLUE} />
              <h1>Welcome, {user?.name?.split(" ")[0]||"Phlebotomist"}.</h1>
              <p className="sub">{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>

              <div className="stats4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:26 }}>
                {[
                  { label:"Total jobs", value:bookings.length,                 tint:BLUE  },
                  { label:"Active",     value:active.length,                   tint:GOLD  },
                  { label:"Completed",  value:completed.length,                tint:GREEN },
                  { label:"Rating",     value:user?.rating?.toFixed(1)||"5.0", tint:GOLD  },
                ].map(s=>(
                  <div key={s.label} className="stat" style={{ "--tint":s.tint }}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:14 }}>
                <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>Upcoming &amp; active jobs ({active.length})</h3>
              </div>
              {active.length===0 ? (
                <div className="card" style={{ padding:"48px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                  <div style={{ fontWeight:600, color:"var(--ink-60)", marginBottom:4 }}>No active jobs right now</div>
                  <div style={{ fontSize:13, color:"var(--ink-40)" }}>Enjoy your day!</div>
                </div>
              ) : active.map(b=><JobCard key={b._id} b={b} />)}
            </div>
          )}

          {tab==="jobs" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-51" name="Jobs" cap={GOLD} />
              <h1>My jobs.</h1>
              <p className="sub">{bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).length} active bookings</p>
              {bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).length===0
                ? <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>🗓</div>
                    <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No jobs assigned yet</div>
                  </div>
                : bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).map(b=><JobCard key={b._id} b={b} />)
              }
            </div>
          )}

          {tab==="history" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-52" name="Archive" cap={GREEN} />
              <h1>History.</h1>
              <p className="sub">{completed.length} completed jobs</p>
              {completed.length===0 ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                  <div style={{ fontWeight:600, color:"var(--ink-60)" }}>No completed jobs yet</div>
                </div>
              ) : completed.map(b=>(
                <div key={b._id} className="jcard" style={{ borderLeft:`4px solid ${GREEN}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{b.user?.name||"—"}</div>
                      <div style={{ fontSize:12, color:"var(--ink-60)" }}>
                        🧪 {getTestNames(b)} &nbsp; 📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; 💰 Rs. {b.amount?.toLocaleString()||"—"}
                      </div>
                    </div>
                    <StatusBadge status="completed" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab==="profile" && (
            <div className="fade-up">
              <SpecimenLabel code="HV-53" name="Profile" cap={LAVENDER} />
              <h1>My profile.</h1>
              <p className="sub">Manage your account details</p>
              <div style={{ maxWidth:500 }}>
                <div className="card" style={{ padding:24, marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(62,108,158,0.10)", border:"1px solid rgba(62,108,158,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🧪</div>
                  <div>
                    <div style={{ fontFamily:"var(--display)", fontWeight:900, fontSize:20, marginBottom:2 }}>{user?.name||"Phlebotomist"}</div>
                    <div style={{ fontSize:13, color:"var(--ink-60)", marginBottom:8 }}>{user?.email}</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(62,108,158,0.08)", color:BLUE, border:"1px solid rgba(62,108,158,0.3)", borderRadius:20, padding:"3px 10px" }}>Phlebotomist</span>
                      <span style={{ fontFamily:"var(--monof)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(184,137,46,0.08)", color:GOLD, border:"1px solid rgba(184,137,46,0.3)", borderRadius:20, padding:"3px 10px" }}>⭐ {user?.rating?.toFixed(1)||"5.0"}</span>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding:24 }}>
                  {[
                    { label:"Full name",    val:user?.name,          type:"text" },
                    { label:"Email",        val:user?.email,         type:"email" },
                    { label:"Phone",        val:user?.phone,         type:"tel" },
                    { label:"Service area", val:user?.serviceArea,   type:"text" },
                    { label:"License no.",  val:user?.licenseNumber, type:"text" },
                  ].map(f=>(
                    <div key={f.label} style={{ marginBottom:16 }}>
                      <label className="lbl">{f.label}</label>
                      <input className="inp" type={f.type} defaultValue={f.val||""} placeholder={f.label} />
                    </div>
                  ))}
                  <button className="btn-save">Save changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}