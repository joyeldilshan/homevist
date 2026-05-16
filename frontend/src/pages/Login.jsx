import { useState, useRef } from "react";
import LabBackground from "../components/LabBackground";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const audioCtx = useRef(null);

  const [lForm, setLForm] = useState({ email:"", password:"" });
  const [rForm, setRForm] = useState({ name:"", email:"", phone:"", password:"", confirm:"" });
  const setL = (k,v) => setLForm(p=>({...p,[k]:v}));
  const setR = (k,v) => setRForm(p=>({...p,[k]:v}));

  const playSound = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(isLogin?480:380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isLogin?720:280, ctx.currentTime+0.1);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.15);
      osc.start(); osc.stop(ctx.currentTime+0.15);
    } catch {}
  };

  const toggle = () => {
    if (toggling) return;
    playSound();
    setToggling(true);
    setTimeout(() => { setIsLogin(v=>!v); setToggling(false); }, 300);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!lForm.email || !lForm.password) { toast.error("Fill in all fields."); return; }
    setLoading(true);
    try {
      const user = await login(lForm.email, lForm.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      if      (user.role==="admin")        navigate("/admin");
      else if (user.role==="phlebotomist") navigate("/phlebotomist");
      else                                  navigate("/user");
    } catch (err) { toast.error(err.response?.data?.message || "Invalid credentials."); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { name, email, phone, password, confirm } = rForm;
    if (!name||!email||!phone||!password||!confirm) { toast.error("Fill in all fields."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    if (password.length < 6)  { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const user = await register({ name, email, phone, password });
      toast.success(`Welcome, ${user.name.split(" ")[0]}!`);
      navigate("/user");
    } catch (err) { toast.error(err.response?.data?.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  const demoLogin = async (email, pw) => {
    setLoading(true);
    try {
      const user = await login(email, pw);
      toast.success(`Demo: ${user.role}`);
      if      (user.role==="admin")        navigate("/admin");
      else if (user.role==="phlebotomist") navigate("/phlebotomist");
      else                                  navigate("/user");
    } catch { toast.error("Demo login failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"var(--font)" }}>
      <LabBackground opacity={0.2} />
      <style>{`
        @keyframes slideRight { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideLeft  { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
        .form-enter-r { animation:slideRight 0.3s ease forwards; }
        .form-enter-l { animation:slideLeft  0.3s ease forwards; }
        .form-exit    { opacity:0; transform:translateX(-10px); transition:all 0.25s; }

        @keyframes glow { 0%,100%{box-shadow:0 0 0 0 rgba(229,62,62,0.3)} 50%{box-shadow:0 0 0 6px rgba(229,62,62,0)} }
        .toggle-on { animation:glow 2s ease-in-out infinite; }

        .demo-btn-w {
          flex:1; padding:10px 8px; border:1.5px solid var(--border);
          border-radius:var(--radius-md); background:#fff; color:var(--text2);
          font-family:var(--font); font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .demo-btn-w:hover { border-color:var(--red); color:var(--red); background:var(--red-light); }

        @media(max-width:768px) {
          .auth-grid { grid-template-columns:1fr !important; }
          .auth-left  { display:none !important; }
        }
      `}</style>

      <div className="auth-grid" style={{ width:"100%", maxWidth:900, background:"#fff", borderRadius:24, boxShadow:"0 20px 60px rgba(0,0,0,0.1)", overflow:"hidden", display:"grid", gridTemplateColumns:"1fr 1fr" }}>

        {/* Left panel */}
        <div className="auth-left" style={{ background:"linear-gradient(160deg, var(--red) 0%, #C53030 100%)", padding:"48px 40px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
          <div style={{ position:"absolute", bottom:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:40 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🩸</div>
              <span style={{ fontWeight:800, fontSize:20, color:"#fff" }}>HemoVisit</span>
            </div>

            <h2 style={{ fontSize:28, fontWeight:800, color:"#fff", lineHeight:1.2, marginBottom:16, fontFamily:"var(--font-serif)", fontStyle:"italic" }}>
              Your health,<br />at your doorstep
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.75)", lineHeight:1.8, marginBottom:36 }}>
              Book a certified phlebotomist for a home blood collection. Get verified reports with barcode in as little as 2 hours.
            </p>

            {/* Floating card */}
            <div style={{ background:"rgba(255,255,255,0.12)", backdropFilter:"blur(10px)", borderRadius:16, padding:20, border:"1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginBottom:8, fontWeight:500 }}>LAB REPORT VERIFIED</div>
              <div style={{ fontWeight:700, fontSize:16, color:"#fff", marginBottom:4 }}>Complete Blood Count</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:14 }}>Booking #BK004821</div>
              <div style={{ display:"flex", gap:1.5, alignItems:"flex-end", height:28 }}>
                {[3,6,2,8,4,7,2,9,3,5,8,2,4,7,3,9,5,2,7,4,8,3].map((h,i)=>(
                  <div key={i} style={{ flex:1, background:i%4===0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.4)", height:h*2.5+"px", borderRadius:1 }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", gap:24 }}>
              {[["15K+","Patients"],["4.9★","Rating"],["24h","Reports"]].map(([v,l])=>(
                <div key={l}>
                  <div style={{ fontWeight:800, fontSize:20, color:"#fff" }}>{v}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={{ padding:"48px 40px", display:"flex", flexDirection:"column" }}>

          {/* Header + toggle */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:8 }}>
                {isLogin ? "Welcome back" : "Get started"}
              </div>
              <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, color:"var(--text)" }}>
                {isLogin ? "Sign In" : "Create Account"}
              </h1>
            </div>

            {/* Toggle switch */}
            <div onClick={toggle} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:50, padding:"8px 16px 8px 10px", transition:"all 0.3s", userSelect:"none" }}>
              <div style={{ width:46, height:26, borderRadius:50, background:isLogin?"var(--border)":"var(--red)", position:"relative", transition:"all 0.3s", flexShrink:0 }} className={!isLogin?"toggle-on":""}>
                <div style={{ position:"absolute", top:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.3s cubic-bezier(0.34,1.56,0.64,1)", left:isLogin?"3px":"23px", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:isLogin?"var(--text3)":"var(--red)" }}>
                {isLogin?"Register":"Login"}
              </span>
            </div>
          </div>

          {/* Forms */}
          <div style={{ flex:1, overflow:"hidden" }}>

            {/* LOGIN */}
            {isLogin && (
              <form onSubmit={handleLogin} className={toggling?"form-exit":"form-enter-r"}>
                <div style={{ marginBottom:14 }}>
                  <label className="lbl">Email Address</label>
                  <input className="inp" type="email" placeholder="you@example.com" value={lForm.email} onChange={e=>setL("email",e.target.value)} />
                </div>
                <div style={{ marginBottom:8, position:"relative" }}>
                  <label className="lbl">Password</label>
                  <input className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={lForm.password} onChange={e=>setL("password",e.target.value)} style={{ paddingRight:44 }} />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, bottom:11, background:"none", border:"none", cursor:"pointer", fontSize:16, color:"var(--text3)" }}>{showPw?"🙈":"👁"}</button>
                </div>
                <div style={{ textAlign:"right", marginBottom:20 }}>
                  <span style={{ fontSize:13, color:"var(--text3)", cursor:"pointer" }}>Forgot password?</span>
                </div>
                <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In →"}
                </button>

                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 14px" }}>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} />
                  <span style={{ fontSize:12, color:"var(--text4)", whiteSpace:"nowrap" }}>Quick demo access</span>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} />
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button type="button" className="demo-btn-w" onClick={()=>demoLogin("user@hemovisit.lk","user123")}>👤 Patient</button>
                  <button type="button" className="demo-btn-w" onClick={()=>demoLogin("rajan@hemovisit.lk","phlebo123")}>🧪 Phlebotomist</button>
                  <button type="button" className="demo-btn-w" onClick={()=>demoLogin("admin@hemovisit.lk","admin123")}>🛠 Admin</button>
                </div>

                <p style={{ marginTop:24, fontSize:13, color:"var(--text3)", textAlign:"center" }}>
                  No account?{" "}
                  <span onClick={toggle} style={{ color:"var(--red)", cursor:"pointer", fontWeight:600 }}>Register free →</span>
                </p>
              </form>
            )}

            {/* REGISTER */}
            {!isLogin && (
              <form onSubmit={handleRegister} className={toggling?"form-exit":"form-enter-l"}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                  <div style={{ gridColumn:"1/-1", marginBottom:14 }}>
                    <label className="lbl">Full Name</label>
                    <input className="inp" type="text" placeholder="Joyel Dilshan" value={rForm.name} onChange={e=>setR("name",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="lbl">Email</label>
                    <input className="inp" type="email" placeholder="you@email.com" value={rForm.email} onChange={e=>setR("email",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="lbl">Phone</label>
                    <input className="inp" type="tel" placeholder="+94 77 123 4567" value={rForm.phone} onChange={e=>setR("phone",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14, position:"relative" }}>
                    <label className="lbl">Password</label>
                    <input className="inp" type={showPw?"text":"password"} placeholder="Min 6 chars" value={rForm.password} onChange={e=>setR("password",e.target.value)} style={{ paddingRight:44 }} />
                    <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, bottom:11, background:"none", border:"none", cursor:"pointer", fontSize:16, color:"var(--text3)" }}>{showPw?"🙈":"👁"}</button>
                  </div>
                  <div style={{ marginBottom:14, position:"relative" }}>
                    <label className="lbl">Confirm Password</label>
                    <input className="inp" type={showCPw?"text":"password"} placeholder="Repeat" value={rForm.confirm} onChange={e=>setR("confirm",e.target.value)} style={{ paddingRight:44 }} />
                    <button type="button" onClick={()=>setShowCPw(v=>!v)} style={{ position:"absolute", right:12, bottom:11, background:"none", border:"none", cursor:"pointer", fontSize:16, color:"var(--text3)" }}>{showCPw?"🙈":"👁"}</button>
                  </div>
                </div>
                {rForm.confirm && (
                  <div style={{ fontSize:12, marginBottom:12, color:rForm.password===rForm.confirm?"var(--green)":"var(--red)", fontWeight:600 }}>
                    {rForm.password===rForm.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </div>
                )}
                <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account →"}
                </button>
                <p style={{ marginTop:16, fontSize:13, color:"var(--text3)", textAlign:"center" }}>
                  Already have an account?{" "}
                  <span onClick={toggle} style={{ color:"var(--red)", cursor:"pointer", fontWeight:600 }}>Sign in →</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}