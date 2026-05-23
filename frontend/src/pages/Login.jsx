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

  const switchTo = (loginMode) => {
    if (toggling || isLogin === loginMode) return;
    playSound();
    setToggling(true);
    setTimeout(() => { setIsLogin(loginMode); setToggling(false); }, 300);
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

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"var(--font)" }}>
      <LabBackground opacity={0.2} />
      <style>{`
        @keyframes slideRight { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideLeft  { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
        .form-enter-r { animation:slideRight 0.3s ease forwards; }
        .form-enter-l { animation:slideLeft  0.3s ease forwards; }
        .form-exit    { opacity:0; transform:translateX(-10px); transition:all 0.25s; }

        .home-btn {
          position:absolute; top:24px; left:24px; z-index:10;
          display:flex; align-items:center; gap:8px;
          padding:10px 16px; border:1.5px solid var(--border);
          border-radius:50px; background:rgba(255,255,255,0.9);
          backdrop-filter:blur(8px); color:var(--text2);
          font-family:var(--font); font-size:13px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .home-btn:hover { border-color:var(--red); color:var(--red); transform:translateX(-2px); }

        /* === BOLD SPLIT BLOCK TOGGLE === */
        .split-block {
          display: flex; background: var(--bg);
          border: 1.5px solid var(--border);
          border-radius: 12px; padding: 4px;
          position: relative; width: 100%;
          margin-bottom: 24px;
        }
        .split-block .slider {
          position: absolute; top: 4px; bottom: 4px;
          width: calc(50% - 4px);
          background: linear-gradient(135deg, var(--red), #C53030);
          border-radius: 9px; z-index: 1;
          transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 12px rgba(229,62,62,0.3);
          left: 4px;
        }
        .split-block.right .slider { left: 50%; }
        .split-btn {
          flex: 1; background: transparent; border: none;
          padding: 12px 8px; cursor: pointer;
          font-family: var(--font); font-size: 13px; font-weight: 700;
          letter-spacing: 0.8px; color: var(--text3);
          border-radius: 9px; position: relative; z-index: 2;
          transition: color 0.3s;
        }
        .split-btn.on { color: #fff; }
        .split-btn:not(.on):hover { color: var(--text); }

        @media(max-width:768px) {
          .auth-grid { grid-template-columns:1fr !important; }
          .auth-left  { display:none !important; }
          .home-btn   { top:16px; left:16px; }
        }
      `}</style>

      {/* Home button */}
      <button className="home-btn" onClick={()=>navigate("/")}>
        ← Home
      </button>

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

          {/* Header */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:8 }}>
              {isLogin ? "Welcome back" : "Get started"}
            </div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, color:"var(--text)" }}>
              {isLogin ? "Sign In" : "Create Account"}
            </h1>
          </div>

          {/* Bold split block toggle */}
          <div className={`split-block ${!isLogin ? "right" : ""}`}>
            <span className="slider" />
            <button
              type="button"
              className={`split-btn ${isLogin ? "on" : ""}`}
              onClick={() => switchTo(true)}
            >
              LOGIN
            </button>
            <button
              type="button"
              className={`split-btn ${!isLogin ? "on" : ""}`}
              onClick={() => switchTo(false)}
            >
              REGISTER
            </button>
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

                <p style={{ marginTop:24, fontSize:13, color:"var(--text3)", textAlign:"center" }}>
                  No account?{" "}
                  <span onClick={() => switchTo(false)} style={{ color:"var(--red)", cursor:"pointer", fontWeight:600 }}>Register free →</span>
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
                  <span onClick={() => switchTo(true)} style={{ color:"var(--red)", cursor:"pointer", fontWeight:600 }}>Sign in →</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}