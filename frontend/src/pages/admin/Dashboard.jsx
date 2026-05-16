import { useState, useEffect } from "react";
import LabBackground from "../../components/LabBackground";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

const sUser   = b => b?.user?.name      || "Unknown Patient";
const sTest   = b => b?.testType?.name  || "Unknown Test";
const sAmount = b => b?.amount ? `Rs. ${Number(b.amount).toLocaleString()}` : "—";
const sDate   = d => d ? new Date(d).toDateString() : "—";
const sId     = b => b?.bookingId || "—";

const STATUS_CONFIG = {
  pending:          { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Pending"          },
  confirmed:        { color:"#3182CE", bg:"#EBF8FF", border:"#BEE3F8", label:"Confirmed"        },
  sample_collected: { color:"#805AD5", bg:"#FAF5FF", border:"#E9D8FD", label:"Sample Collected" },
  processing:       { color:"#D69E2E", bg:"#FFFFF0", border:"#FEFCBF", label:"Lab Processing"   },
  completed:        { color:"#38A169", bg:"#F0FFF4", border:"#C6F6D5", label:"Completed"        },
  cancelled:        { color:"#718096", bg:"#F7FAFC", border:"#E2E8F0", label:"Cancelled"        },
  rejected:         { color:"#E53E3E", bg:"#FFF5F5", border:"#FED7D7", label:"Rejected"        },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:c.color }} />
      {c.label}
    </span>
  );
};

const Lbl = ({ c }) => <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>{c}</label>;

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
      <LabBackground opacity={0.1} />
    <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:20, padding:28, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", boxShadow:"var(--shadow-lg)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text)", letterSpacing:-0.3 }}>{title}</h2>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"var(--surface2)", border:"none", cursor:"pointer", fontSize:14, color:"var(--text2)" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const CATS = ["haematology","biochemistry","microbiology","immunology","urine","other"];

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
  const testCounts = testTypes.map(t=>({ name:t?.name||"—", count:safeB.filter(b=>b?.testType?.name===t?.name).length })).sort((a,b)=>b.count-a.count);
  const maxCount   = Math.max(...testCounts.map(t=>t.count),1);

  const TABS = [
    { id:"overview",      icon:"📊", label:"Overview"       },
    { id:"bookings",      icon:"📋", label:"All Bookings"   },
    { id:"assign",        icon:"🎯", label:"Assign Jobs",  badge:unassigned.length },
    { id:"tests",         icon:"🔬", label:"Test Catalog"   },
    { id:"phlebotomists", icon:"🧪", label:"Phlebotomists"  },
    { id:"analytics",     icon:"📈", label:"Analytics"      },
  ];

  const FI = ({ label, fkey, type="text", placeholder, val, setter }) => (
    <div style={{ marginBottom:12 }}>
      <Lbl c={label} />
      <input className="inp" type={type} placeholder={placeholder} value={val} onChange={e=>setter(p=>({...p,[fkey]:e.target.value}))} />
    </div>
  );

  const Sidebar = () => (
    <aside style={{ width:240, background:"#fff", borderRight:"1px solid var(--border)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:2, flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🩸</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>HemoVisit</span>
      </div>
      <div style={{ margin:"0 4px 14px", padding:"10px 14px", borderRadius:10, background:"var(--red-light)", border:"1.5px solid var(--red-mid)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--red)", textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Admin Console</div>
        <div style={{ fontSize:12, color:"var(--text3)" }}>Full access</div>
      </div>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>{ setTab(t.id); setSideOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", transition:"all 0.15s", fontSize:14, fontWeight:500, border:"none", textAlign:"left", width:"100%", background:tab===t.id?"var(--red-light)":"transparent", color:tab===t.id?"var(--red)":"var(--text2)", fontFamily:"var(--font)" }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{ flex:1 }}>{t.label}</span>
          {t.badge>0 && <span style={{ background:"var(--red)", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
        </button>
      ))}
      <div style={{ marginTop:"auto", padding:"12px 14px", borderRadius:12, background:"var(--bg)", border:"1px solid var(--border)" }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{user?.name||"Admin"}</div>
        <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10 }}>Administrator</div>
        <button onClick={()=>{ logout(); navigate("/login"); }} style={{ width:"100%", padding:"8px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", color:"var(--text3)", fontFamily:"var(--font)", fontSize:12, fontWeight:500, cursor:"pointer" }}>Sign Out</button>
      </div>
    </aside>
  );

  const TblHead = ({ cols }) => (
    <div style={{ display:"grid", gridTemplateColumns:cols, padding:"12px 18px", background:"var(--bg)", borderBottom:"1px solid var(--border)" }}>
      {cols.split(" ").map((_,i,a)=>(
        <div key={i} style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1 }}>{["Patient","Booking","Test","Date","Amount","Status","Action","Name","Code","Category","Price","TAT","Active","Actions","Email","Phone","Area","License","Rating"][i]||""}</div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", fontFamily:"var(--font)" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.4s ease forwards; }
        .trow { padding:14px 18px; border-bottom:1px solid var(--border); transition:background 0.15s; align-items:center; }
        .trow:hover { background:var(--red-light); }
        .act { padding:5px 12px; border-radius:8px; border:none; font-family:var(--font); font-weight:700; font-size:12px; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
        .act:hover { transform:translateY(-1px); }
        .prow { background:#fff; border:1.5px solid var(--border); border-radius:12px; padding:16px 18px; margin-bottom:10px; transition:all 0.2s; }
        .prow:hover { border-color:var(--red-mid); box-shadow:var(--shadow-sm); }
        @media(max-width:768px) {
          .adm-sidebar { display:none !important; }
          .adm-topbar  { display:flex !important; }
          .adm-pad     { padding:20px 14px !important; }
          .adm-stats   { grid-template-columns:repeat(2,1fr) !important; }
          .adm-table   { overflow-x:auto; }
        }
      `}</style>

      <div className="adm-sidebar hide-mobile"><Sidebar /></div>

      {/* Mobile topbar */}
      <div className="adm-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:56, background:"#fff", borderBottom:"1px solid var(--border)", zIndex:100, alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <span style={{ fontWeight:800, fontSize:15 }}>🩸 HemoVisit Admin</span>
        <button onClick={()=>setSideOpen(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {sideOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)" }} onClick={()=>setSideOpen(false)} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#fff", overflowY:"auto" }}>
            <div style={{ padding:"16px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontWeight:800 }}>🩸 Admin</span>
              <button onClick={()=>setSideOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:12 }}><Sidebar /></div>
          </div>
        </div>
      )}

      <main className="adm-pad" style={{ flex:1, padding:"32px 40px", overflowY:"auto" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          {/* OVERVIEW */}
          {tab==="overview" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Overview</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
              </div>
              <div className="adm-stats" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"📋", label:"Total",       value:safeB.length,                        color:"var(--blue)"  },
                  { icon:"⏳", label:"Pending",      value:pending.length,                       color:"var(--amber)" },
                  { icon:"✅", label:"Completed",    value:completed.length,                     color:"var(--green)" },
                  { icon:"⚠️", label:"Unassigned",   value:unassigned.length,                    color:"var(--red)"   },
                  { icon:"💰", label:"Revenue",      value:"Rs."+(revenue/1000).toFixed(1)+"K", color:"var(--green)" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:18, boxShadow:"var(--shadow-sm)" }}>
                    <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {unassigned.length>0 && (
                <div style={{ background:"var(--red-light)", border:"1.5px solid var(--red-mid)", borderRadius:14, padding:"16px 20px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:"var(--red)", marginBottom:2 }}>⚠️ {unassigned.length} booking{unassigned.length>1?"s":""} need phlebotomist assignment</div>
                    <div style={{ fontSize:13, color:"var(--text2)" }}>Patients are waiting for confirmation.</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>setTab("assign")}>Assign Now →</button>
                </div>
              )}

              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Recent Bookings</h3>
              <div className="adm-table" style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1.5fr 1fr 1fr", padding:"12px 18px", background:"var(--bg)", borderBottom:"1px solid var(--border)" }}>
                  {["Patient","Test","Date","Amount","Status"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {safeB.slice(0,8).map(b=>(
                  <div key={b._id} className="trow" style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1.5fr 1fr 1fr" }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{sUser(b)}</div>
                    <div style={{ fontSize:12, color:"var(--text3)" }}>{sTest(b)}</div>
                    <div style={{ fontSize:12, color:"var(--text3)" }}>{sDate(b.appointmentDate)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--green)" }}>{sAmount(b)}</div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
                {safeB.length===0 && <div style={{ padding:"40px", textAlign:"center", color:"var(--text4)", fontSize:14 }}>No bookings yet.</div>}
              </div>
            </div>
          )}

          {/* ALL BOOKINGS */}
          {tab==="bookings" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>All Bookings</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{safeB.length} total bookings</p>
              </div>
              <div className="adm-table" style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1.5fr 1.5fr 1fr 1.2fr 1.5fr", padding:"12px 18px", background:"var(--bg)", borderBottom:"1px solid var(--border)" }}>
                  {["Booking","Patient","Test","Amount","Status","Action"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {safeB.length===0
                  ? <div style={{ padding:"40px", textAlign:"center", color:"var(--text4)", fontSize:14 }}>No bookings yet.</div>
                  : safeB.map(b=>(
                    <div key={b._id} className="trow" style={{ display:"grid", gridTemplateColumns:"1.2fr 1.5fr 1.5fr 1fr 1.2fr 1.5fr" }}>
                      <div style={{ fontSize:11, color:"var(--text4)", fontWeight:600 }}>{sId(b)}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{sUser(b)}</div>
                        <div style={{ fontSize:11, color:"var(--text4)" }}>{b.user?.phone||"—"}</div>
                      </div>
                      <div style={{ fontSize:12, color:"var(--text2)" }}>{sTest(b)}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--green)" }}>{sAmount(b)}</div>
                      <StatusBadge status={b.status} />
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {b.status==="pending"&&!b.phlebotomist && <button className="act" style={{ background:"#EBF8FF", color:"#2C5282", border:"1px solid #BEE3F8" }} onClick={()=>setAssignModal(b._id)}>Assign</button>}
                        {b.status==="pending" && <button className="act" style={{ background:"#F0FFF4", color:"#276749", border:"1px solid #C6F6D5" }} onClick={()=>updateStatus(b._id,"confirmed")}>Confirm</button>}
                        {b.status==="processing" && <button className="act" style={{ background:"#F0FFF4", color:"#276749", border:"1px solid #C6F6D5" }} onClick={()=>updateStatus(b._id,"completed")}>Complete</button>}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ASSIGN */}
          {tab==="assign" && (
            <div className="fade-up">
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Assign Jobs</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>{unassigned.length} unassigned bookings</p>
              </div>
              {unassigned.length===0
                ? <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>All bookings are assigned!</div>
                  </div>
                : unassigned.map(b=>(
                  <div key={b._id} style={{ background:"#fff", border:"1.5px solid var(--red-mid)", borderRadius:14, padding:"20px 22px", marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <div style={{ fontWeight:700, fontSize:15 }}>{sUser(b)}</div>
                          <span className="tag tag-red">Unassigned</span>
                        </div>
                        <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.9 }}>
                          🧪 {sTest(b)}<br />📅 {sDate(b.appointmentDate)} ⏰ {b.appointmentTime||"—"}<br />
                          📍 {b.address||"—"}<br />📞 {b.user?.phone||"—"}<br />
                          💰 {sAmount(b)} &nbsp; 🔖 {sId(b)}
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={()=>setAssignModal(b._id)}>Assign Phlebotomist →</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* TESTS */}
          {tab==="tests" && (
            <div className="fade-up">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
                <div>
                  <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Test Catalog</h1>
                  <p style={{ color:"var(--text3)", fontSize:14 }}>{testTypes.length} test types</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setTestModal(true)}>+ Add Test</button>
              </div>
              <div className="adm-table" style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 0.8fr 0.6fr 1.2fr", padding:"12px 18px", background:"var(--bg)", borderBottom:"1px solid var(--border)" }}>
                  {["Test Name","Code","Category","Price","Time","Active","Actions"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:"var(--text4)", textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {testTypes.map(t=>(
                  <div key={t._id} className="trow" style={{ display:"grid", gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 0.8fr 0.6fr 1.2fr" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{t?.name||"—"}</div>
                      {t?.preparation && <div style={{ fontSize:11, color:"var(--amber)" }}>⚠ {t.preparation?.slice(0,35)}</div>}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--text3)" }}>{t?.code||"—"}</div>
                    <span className="tag tag-blue" style={{ display:"inline-flex", textTransform:"capitalize", fontSize:10 }}>{t?.category||"—"}</span>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--green)" }}>Rs.{t?.price?.toLocaleString()||"—"}</div>
                    <div style={{ fontSize:12, color:"var(--text3)" }}>{t?.duration||"—"}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:t?.isActive?"var(--green)":"var(--text4)" }}>{t?.isActive?"✓":"✕"}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="act" style={{ background:"#EBF8FF", color:"#2C5282", border:"1px solid #BEE3F8" }}
                        onClick={()=>{ setEditTest({ name:t.name, code:t.code, price:t.price, duration:t.duration, category:t.category, preparation:t.preparation||"", description:t.description||"" }); setEditTestModal(t); }}>
                        Edit
                      </button>
                      <button className="act" style={{ background:"var(--red-light)", color:"var(--red)", border:"1px solid var(--red-mid)" }}
                        onClick={()=>deactivateTest(t._id)}>
                        Off
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHLEBOTOMISTS */}
          {tab==="phlebotomists" && (
            <div className="fade-up">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
                <div>
                  <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Phlebotomists</h1>
                  <p style={{ color:"var(--text3)", fontSize:14 }}>{phlebotomists.length} team members</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setPhleModal(true)}>+ Add Phlebotomist</button>
              </div>
              {phlebotomists.length===0
                ? <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:"60px", textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧪</div>
                    <div style={{ fontWeight:600, color:"var(--text2)", marginBottom:4 }}>No phlebotomists yet</div>
                    <button className="btn btn-primary btn-sm" onClick={()=>setPhleModal(true)}>Add First Phlebotomist</button>
                  </div>
                : phlebotomists.map(p=>(
                  <div key={p._id} className="prow">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:48, height:48, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🧪</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{p?.name||"—"}</div>
                          <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.8 }}>
                            📧 {p?.email||"—"} &nbsp; 📞 {p?.phone||"—"}<br />
                            📍 {p?.serviceArea||"—"} &nbsp; 🪪 {p?.licenseNumber||"—"}<br />
                            ⭐ {p?.rating?.toFixed(1)||"5.0"} · {p?.totalRatings||0} reviews
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:p?.isAvailable?"var(--green)":"var(--text4)", display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ width:8, height:8, borderRadius:"50%", background:p?.isAvailable?"var(--green)":"var(--text4)", display:"inline-block" }} />
                          {p?.isAvailable?"Online":"Offline"}
                        </span>
                        <button className="act" style={{ background:"#EBF8FF", color:"#2C5282", border:"1px solid #BEE3F8" }}
                          onClick={()=>{ setEditPhle({ name:p.name, phone:p.phone, serviceArea:p.serviceArea||"", licenseNumber:p.licenseNumber||"" }); setEditPhleModal(p); }}>
                          Edit
                        </button>
                        <button className="act" style={{ background:"var(--red-light)", color:"var(--red)", border:"1px solid var(--red-mid)" }}
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
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Analytics</h1>
                <p style={{ color:"var(--text3)", fontSize:14 }}>Platform performance overview</p>
              </div>
              <div className="adm-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"💰", label:"Total Revenue",   value:`Rs. ${revenue.toLocaleString()}`,  color:"var(--green)" },
                  { icon:"📋", label:"Total Bookings",  value:safeB.length,                       color:"var(--blue)"  },
                  { icon:"📊", label:"Completion Rate", value:safeB.length?Math.round((completed.length/safeB.length)*100)+"%":"0%", color:"var(--green)" },
                  { icon:"💎", label:"Avg Test Value",  value:completed.length?"Rs."+Math.round(revenue/completed.length).toLocaleString():"—", color:"var(--purple)" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:18, boxShadow:"var(--shadow-sm)" }}>
                    <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"var(--text3)", fontWeight:500, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                {[
                  { title:"Status Breakdown", items: Object.entries(STATUS_CONFIG).map(([s,c])=>({ name:c.label, count:safeB.filter(b=>b.status===s).length, color:c.color })).filter(i=>i.count>0) },
                  { title:"Popular Tests",    items: testCounts.filter(t=>t.count>0).map(t=>({ name:t.name, count:t.count, color:"var(--red)" })) },
                ].map(section=>(
                  <div key={section.title} style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:20 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:18 }}>{section.title}</div>
                    {section.items.length===0
                      ? <div style={{ fontSize:13, color:"var(--text4)" }}>No data yet.</div>
                      : section.items.map((item,i)=>{
                          const total = section.items.reduce((s,x)=>s+x.count,0)||1;
                          const pct   = Math.round((item.count/total)*100);
                          return (
                            <div key={i} style={{ marginBottom:14 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
                                <span style={{ color:"var(--text2)", fontWeight:500 }}>{item.name}</span>
                                <span style={{ fontWeight:700, color:item.color }}>{item.count} ({pct}%)</span>
                              </div>
                              <div style={{ height:6, background:"var(--surface2)", borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${pct}%`, height:"100%", background:item.color, borderRadius:3, opacity:0.8, transition:"width 0.6s ease" }} />
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
        </div>
      </main>

      {/* ASSIGN MODAL */}
      {assignModal && (
        <Modal title="Assign Phlebotomist" onClose={()=>setAssignModal(null)}>
          <p style={{ fontSize:13, color:"var(--text3)", marginBottom:16 }}>Click a phlebotomist to assign them to this booking.</p>
          {phlebotomists.length===0
            ? <div style={{ textAlign:"center", padding:"30px 0", color:"var(--text3)", fontSize:14 }}>No phlebotomists found. Add one first.</div>
            : phlebotomists.map(p=>(
              <div key={p._id} onClick={()=>assignPhlebotomist(assignModal,p._id)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:12, border:"1.5px solid var(--border)", marginBottom:10, cursor:"pointer", transition:"all 0.2s", background:"#fff" }}
                onMouseOver={e=>{ e.currentTarget.style.borderColor="var(--red)"; e.currentTarget.style.background="var(--red-light)"; }}
                onMouseOut={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="#fff"; }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧪</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p?.name||"—"}</div>
                    <div style={{ fontSize:12, color:"var(--text3)" }}>⭐ {p?.rating?.toFixed(1)||"5.0"} · {p?.serviceArea||"Jaffna"}</div>
                  </div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:p?.isAvailable?"var(--green)":"var(--text4)" }}>
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
        <Modal title="Add New Test" onClose={()=>setTestModal(false)}>
          <FI label="Test Name"   fkey="name"        type="text"   placeholder="e.g. Complete Blood Count" val={newTest.name}        setter={setNewTest} />
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
          <button className="btn btn-primary btn-full" onClick={createTest}>Add Test Type</button>
        </Modal>
      )}

      {/* EDIT TEST MODAL */}
      {editTestModal && (
        <Modal title="Edit Test" onClose={()=>setEditTestModal(null)}>
          <FI label="Test Name"   fkey="name"        type="text"   placeholder="Test name"              val={editTest.name||""}        setter={setEditTest} />
          <FI label="Price (Rs.)" fkey="price"       type="number" placeholder="Price"                  val={editTest.price||""}       setter={setEditTest} />
          <FI label="Turnaround"  fkey="duration"    type="text"   placeholder="e.g. 24h"               val={editTest.duration||""}    setter={setEditTest} />
          <FI label="Preparation" fkey="preparation" type="text"   placeholder="Preparation instructions" val={editTest.preparation||""} setter={setEditTest} />
          <div style={{ marginBottom:16 }}>
            <Lbl c="Category" />
            <select className="inp" value={editTest.category||"haematology"} onChange={e=>setEditTest(p=>({...p,category:e.target.value}))}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setEditTestModal(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveEditTest}>Save Changes</button>
          </div>
        </Modal>
      )}

      {/* ADD PHLEBOTOMIST MODAL */}
      {phleModal && (
        <Modal title="Add Phlebotomist" onClose={()=>setPhleModal(false)}>
          <FI label="Full Name"    fkey="name"          type="text"     placeholder="e.g. Rajan Kumar"    val={newPhle.name}          setter={setNewPhle} />
          <FI label="Email"        fkey="email"         type="email"    placeholder="email@example.com"   val={newPhle.email}         setter={setNewPhle} />
          <FI label="Phone"        fkey="phone"         type="tel"      placeholder="+94 77 123 4567"     val={newPhle.phone}         setter={setNewPhle} />
          <FI label="Password"     fkey="password"      type="password" placeholder="Min 6 characters"   val={newPhle.password}      setter={setNewPhle} />
          <FI label="Service Area" fkey="serviceArea"   type="text"     placeholder="e.g. Jaffna North"  val={newPhle.serviceArea}   setter={setNewPhle} />
          <FI label="License No."  fkey="licenseNumber" type="text"     placeholder="e.g. HV-PHL-05"     val={newPhle.licenseNumber} setter={setNewPhle} />
          <button className="btn btn-primary btn-full" onClick={createPhle}>Create Account</button>
        </Modal>
      )}

      {/* EDIT PHLEBOTOMIST MODAL */}
      {editPhleModal && (
        <Modal title="Edit Phlebotomist" onClose={()=>setEditPhleModal(null)}>
          <FI label="Full Name"    fkey="name"          type="text" placeholder="Full name"       val={editPhle.name||""}          setter={setEditPhle} />
          <FI label="Phone"        fkey="phone"         type="tel"  placeholder="Phone number"    val={editPhle.phone||""}         setter={setEditPhle} />
          <FI label="Service Area" fkey="serviceArea"   type="text" placeholder="Service area"    val={editPhle.serviceArea||""}   setter={setEditPhle} />
          <FI label="License No."  fkey="licenseNumber" type="text" placeholder="License number"  val={editPhle.licenseNumber||""} setter={setEditPhle} />
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setEditPhleModal(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveEditPhle}>Save Changes</button>
          </div>
        </Modal>
      )}
    </div>
  );
}