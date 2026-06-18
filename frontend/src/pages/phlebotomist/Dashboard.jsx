import { useState, useEffect } from "react";
import LabBackground from "../../components/LabBackground";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending:          { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Pending"          },
  confirmed:        { color:"#3182CE", bg:"#EBF8FF", border:"#BEE3F8", label:"Confirmed"        },
  sample_collected: { color:"#805AD5", bg:"#FAF5FF", border:"#E9D8FD", label:"Sent to Lab"      },
  processing:       { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Lab Processing"   },
  completed:        { color:"#38A169", bg:"#F0FFF4", border:"#C6F6D5", label:"Completed"        },
  cancelled:        { color:"#718096", bg:"#F7FAFC", border:"#E2E8F0", label:"Cancelled"        },
  rejected:         { color:"#E53E3E", bg:"#FFF5F5", border:"#FED7D7", label:"Rejected"        },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
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
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"jobs",      icon:"🗓",  label:"My Jobs"   },
    { id:"history",   icon:"📋", label:"History"   },
    { id:"profile",   icon:"👤", label:"Profile"   },
  ];

  const JobCard = ({ b }) => (
    <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"20px 22px", marginBottom:12, borderLeft:`3px solid ${STATUS_CONFIG[b.status]?.color||"var(--border2)"}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:5 }}>{b.user?.name||"Patient"}</div>
          <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9 }}>
            🧪 {getTestNames(b)}<br />
            📅 {b.appointmentDate?new Date(b.appointmentDate).toDateString():"—"} &nbsp; ⏰ {b.appointmentTime||"—"}<br />
            📍 {b.address||"—"}<br />
            📞 {b.user?.phone||"—"}<br />
            💰 Rs. {b.amount?.toLocaleString()||"—"} &nbsp;
            <span style={{ color:"var(--text4)", fontSize:11 }}>#{b.bookingId||"—"}</span>
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Flow guide */}
      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:12, flexWrap:"wrap" }}>
        {["pending","confirmed","sample_collected","processing","completed"].map((s,i,arr)=>{
          const cur = arr.indexOf(b.status);
          const me  = arr.indexOf(s);
          const c   = STATUS_CONFIG[s];
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:me<=cur?c.color:"var(--border2)", flexShrink:0, transition:"background 0.3s" }} />
              <span style={{ fontSize:10, color:me===cur?c.color:me<cur?"var(--text3)":"var(--text4)", fontWeight:me===cur?700:400 }}>
                {["Pending","Confirmed","At Lab","Processing","Done"][i]}
              </span>
              {i<arr.length-1 && <span style={{ color:"var(--border2)", fontSize:10 }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {b.status==="pending" && (
          <>
            <button onClick={()=>updateStatus(b._id,"confirmed","Accepted by phlebotomist")}
              style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid #C6F6D5", background:"#F0FFF4", color:"#276749", fontFamily:"var(--font)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ✅ Accept Job
            </button>
            <button onClick={()=>updateStatus(b._id,"rejected","Rejected by phlebotomist")}
              style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid var(--red-mid)", background:"var(--red-light)", color:"var(--red)", fontFamily:"var(--font)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ✕ Reject
            </button>
          </>
        )}

        {/* Show Send-to-Lab on BOTH confirmed AND sample_collected.
            This guarantees a Sample record gets created and rescues any
            booking stranded at "sample_collected" without one. The backend
            is idempotent, so clicking again is always safe. */}
        {(b.status==="confirmed" || b.status==="sample_collected") && (
          <button onClick={()=>sendToLab(b._id)} disabled={sending===b._id}
            style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid #C3EDDE", background:"#F0FBF7", color:"#1E6F5C", fontFamily:"var(--font)", fontWeight:700, fontSize:13, cursor:"pointer", opacity:sending===b._id?0.6:1 }}>
            {sending===b._id ? "Sending..." : "🧫 Collect & Send to Lab"}
          </button>
        )}
        {b.status==="sample_collected" && (
          <span style={{ fontSize:12, color:"#805AD5", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#805AD5", display:"inline-block" }} />
            At lab
          </span>
        )}

        {b.status==="processing" && (
          <span style={{ fontSize:12, color:"#D69E2E", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#D69E2E", display:"inline-block" }} />
            Lab is processing the sample
          </span>
        )}
        {b.status==="completed" && (
          <span style={{ fontSize:12, color:"var(--green)", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--green)", display:"inline-block" }} />
            Report delivered to patient
          </span>
        )}
      </div>
    </div>
  );

  const Sidebar = () => (
    <aside style={{ width:240, background:"#fff", borderRight:"1px solid var(--border)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:2, flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🩸</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>HemoVisit</span>
      </div>

      <div style={{ margin:"0 4px 16px", padding:"14px", borderRadius:12, background:available?"#F0FFF4":"var(--bg)", border:`1.5px solid ${available?"#C6F6D5":"var(--border)"}`, transition:"all 0.3s" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Availability</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:available?"var(--green)":"var(--text4)", transition:"background 0.3s" }} />
            <span style={{ fontSize:13, fontWeight:700, color:available?"var(--green)":"var(--text3)" }}>{available?"Online":"Offline"}</span>
          </div>
          <div onClick={toggleAvailability} style={{ width:42, height:23, borderRadius:50, background:available?"var(--green)":"var(--border2)", cursor:"pointer", position:"relative", transition:"all 0.3s" }}>
            <div style={{ position:"absolute", top:2.5, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.3s", left:available?"22px":"2.5px", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
          </div>
        </div>
      </div>

      {TABS.map(t=>(
        <button key={t.id} onClick={()=>{ setTab(t.id); setSideOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", transition:"all 0.15s", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", background:tab===t.id?"var(--red-light)":"transparent", color:tab===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>{t.label}
        </button>
      ))}

      <div style={{ marginTop:"auto", padding:"14px", borderRadius:12, background:"var(--bg)", border:"1px solid var(--border)" }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{user?.name||"Phlebotomist"}</div>
        <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>Phlebotomist</div>
        <div style={{ fontSize:12, color:"var(--amber)", marginBottom:10 }}>⭐ {user?.rating?.toFixed(1)||"5.0"} · {user?.totalRatings||0} reviews</div>
        <button onClick={()=>{ logout(); navigate("/login"); }} style={{ width:"100%", padding:"8px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", color:"var(--text3)", fontFamily:"var(--font)", fontSize:12, fontWeight:500, cursor:"pointer" }}>Sign Out</button>
      </div>
    </aside>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", fontFamily:"var(--font)", position:"relative" }}>
      <LabBackground opacity={0.1} />

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.4s ease forwards; }
        @media(max-width:768px) {
          .phle-sidebar { display:none !important; }
          .phle-topbar  { display:flex !important; }
          .phle-pad     { padding:20px 16px !important; padding-top:76px !important; }
          .phle-stats   { grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>

      <div className="phle-sidebar hide-mobile" style={{ position:"relative", zIndex:10 }}><Sidebar /></div>

      <div className="phle-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:"#fff", borderBottom:"1px solid var(--border)", zIndex:100, alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <span style={{ fontWeight:800, fontSize:15 }}>🩸 HemoVisit</span>
        <button onClick={()=>setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {sideOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)" }} onClick={()=>setSideOpen(false)} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#fff", overflowY:"auto" }}>
            <div style={{ padding:"16px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontWeight:800 }}>🩸 HemoVisit</span>
              <button onClick={()=>setSideOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:12 }}><Sidebar /></div>
          </div>
        </div>
      )}

      <main className="phle-pad" style={{ flex:1, padding:"32px 40px", overflowY:"auto", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>

          {tab==="dashboard" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
                  Welcome, {user?.name?.split(" ")[0]||"Phlebotomist"} 🧪
                </h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>
                  {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                </p>
              </div>

              <div className="phle-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"📋", label:"Total Jobs",  value:bookings.length,                color:"var(--blue)"  },
                  { icon:"🔄", label:"Active",       value:active.length,                  color:"var(--amber)" },
                  { icon:"✅", label:"Completed",    value:completed.length,               color:"var(--green)" },
                  { icon:"⭐", label:"Rating",       value:user?.rating?.toFixed(1)||"5.0", color:"var(--amber)" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:20, boxShadow:"var(--shadow-sm)" }}>
                    <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:28, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                <h3 style={{ fontSize:16, fontWeight:700 }}>Upcoming &amp; Active Jobs ({active.length})</h3>
              </div>
              {active.length===0 ? (
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"48px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                  <div style={{ fontWeight:600, color:"var(--text2)", marginBottom:4 }}>No active jobs right now</div>
                  <div style={{ fontSize:13, color:"var(--text3)" }}>Enjoy your day!</div>
                </div>
              ) : active.map(b=><JobCard key={b._id} b={b} />)}
            </div>
          )}

          {tab==="jobs" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Jobs</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).length} active bookings</p>
              </div>
              {bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).length===0
                ? <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>🗓</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>No jobs assigned yet</div>
                  </div>
                : bookings.filter(b=>!["cancelled","rejected"].includes(b.status)).map(b=><JobCard key={b._id} b={b} />)
              }
            </div>
          )}

          {tab==="history" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>History</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{completed.length} completed jobs</p>
              </div>
              {completed.length===0 ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                  <div style={{ fontWeight:600, color:"var(--text2)" }}>No completed jobs yet</div>
                </div>
              ) : completed.map(b=>(
                <div key={b._id} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"18px 22px", marginBottom:10, borderLeft:"3px solid var(--green)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{b.user?.name||"—"}</div>
                      <div style={{ fontSize:12, color:"var(--text3)" }}>
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
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>My Profile</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>Manage your account details</p>
              </div>
              <div style={{ maxWidth:500 }}>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:16, padding:24, marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>🧪</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:18, marginBottom:4 }}>{user?.name||"Phlebotomist"}</div>
                    <div style={{ fontSize:13, color:"var(--text3)", marginBottom:8 }}>{user?.email}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <span className="tag tag-red">Phlebotomist</span>
                      <span className="tag tag-amber">⭐ {user?.rating?.toFixed(1)||"5.0"}</span>
                    </div>
                  </div>
                </div>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:16, padding:24 }}>
                  {[
                    { label:"Full Name",     val:user?.name,          type:"text" },
                    { label:"Email",         val:user?.email,         type:"email" },
                    { label:"Phone",         val:user?.phone,         type:"tel" },
                    { label:"Service Area",  val:user?.serviceArea,   type:"text" },
                    { label:"License No.",   val:user?.licenseNumber, type:"text" },
                  ].map(f=>(
                    <div key={f.label} style={{ marginBottom:16 }}>
                      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>{f.label}</label>
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