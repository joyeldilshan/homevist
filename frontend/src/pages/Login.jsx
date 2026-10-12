import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { isValidUkPhone, normaliseUkPhone, PHONE_MESSAGE } from "../utils/validators";
import locale from "../config/locale";
import { DEMO_MODE, DEMO_PASSWORD, DEMO_ACCOUNTS } from "../config/demo";

/**
 * Home Visit — Sign in / Register (lab-label edition).
 * PHOTO: save one image as  frontend/public/images/image5.jpg
 * (shown in the left panel; falls back to a gradient if missing).
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const [imgOk,    setImgOk]    = useState(true);
  const audioCtx = useRef(null);

  const [lForm, setLForm] = useState({ email:"", password:"" });
  const [rForm, setRForm] = useState({ name:"", email:"", phone:"", password:"", confirm:"" });
  const [consent, setConsent] = useState(false);
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
      else if (user.role==="mlt")          navigate("/mlt");
      else                                  navigate("/user");
    } catch (err) { toast.error(err.response?.data?.message || "Invalid credentials."); }
    finally { setLoading(false); }
  };

  /*
   * Demo sign-in.
   *
   * Goes through exactly the same login() call as the normal form — no
   * separate auth path, no bypass. When VITE_DEMO_PASSWORD is unset it
   * only fills the email in, so a build without that variable cannot
   * sign anyone in.
   */
  const handleDemo = async (account) => {
    setL("email", account.email);

    if (!DEMO_PASSWORD) {
      setL("password", "");
      toast("Email filled in. Paste the password printed by `npm run seed`.", { icon: "🔑" });
      document.getElementById("login-password")?.focus();
      return;
    }

    setLoading(true);
    try {
      const user = await login(account.email, DEMO_PASSWORD);
      toast.success(`Signed in as ${account.label}`);
      if      (user.role==="admin")        navigate("/admin");
      else if (user.role==="phlebotomist") navigate("/phlebotomist");
      else if (user.role==="mlt")          navigate("/mlt");
      else                                  navigate("/user");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Demo sign-in failed. Has the database been seeded?"
      );
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { name, email, phone, password, confirm } = rForm;
    if (!name||!email||!phone||!password||!confirm) { toast.error("Fill in all fields."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    if (password.length < 6)  { toast.error("Password must be at least 6 characters."); return; }
    if (!isValidUkPhone(phone)) { toast.error(PHONE_MESSAGE); return; }
    if (!consent) { toast.error("Please confirm you have read the Privacy Policy."); return; }
    setLoading(true);
    try {
      const user = await register({
        name, email, phone: normaliseUkPhone(phone), password,
        privacyPolicyAccepted: true,
      });
      toast.success(`Welcome, ${user.name.split(" ")[0]}!`);
      navigate("/user");
    } catch (err) { toast.error(err.response?.data?.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="au">
      <style>{`
        .au {
          --paper: var(--color-bg-page);
          --card:    #FBF9F5;
          --ink: var(--color-text-primary);
          --ink-60: var(--color-text-secondary);
          --ink-40: var(--color-text-muted);
          --rule: var(--color-border-default);
          --crimson: var(--color-bg-accent);
          --lavender:#6E6AA8;
          --gold:    #B8862E;
          --teal:    #0F6E62;

          min-height: 100vh;
          min-height: 100dvh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sansf);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 76px 16px 32px;
          position: relative;
          overflow: hidden;
        }
        .au *, .au *::before, .au *::after { margin:0; padding:0; box-sizing:border-box; }
        .au :focus-visible { outline: 2px solid var(--crimson); outline-offset: 2px; }

        /* ambient colour blobs */
        .au .blob { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .au .blob-a { width: 480px; height: 480px; top: -160px; right: -140px; background: radial-gradient(circle, rgba(201,96,58,0.20), transparent 65%); }
        .au .blob-b { width: 420px; height: 420px; bottom: -160px; left: -120px; background: radial-gradient(circle, rgba(28,122,107,0.18), transparent 65%); }

        /* home button */
        .au .home-btn {
          position: absolute; top: 20px; left: 20px; z-index: 10;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px; border: 1px solid var(--rule);
          border-radius: 3px; background: rgba(251,249,245,0.9);
          backdrop-filter: blur(8px); color: var(--ink-60);
          font-family: var(--monof); font-size: 11px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; transition: all .2s;
        }
        .au .home-btn:hover { border-color: var(--crimson); color: var(--crimson); transform: translateX(-2px); }

        /* card */
        .au .shell {
          width: 100%; max-width: 940px;
          display: grid; grid-template-columns: 0.9fr 1.1fr;
          background: var(--card);
          border: 1px solid var(--rule); border-radius: 6px;
          overflow: hidden; position: relative; z-index: 1;
          box-shadow: 0 30px 70px rgba(22,33,31,0.18);
        }

        /* ---------- left photo panel ---------- */
        .au .panel { position: relative; min-height: 560px; display: flex; }
        .au .panel-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .au .panel-fallback {
          position: absolute; inset: 0;
          background: linear-gradient(150deg, var(--crimson), #5c0a21 70%);
        }
        .au .panel-veil {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(22,33,31,0.30), rgba(22,33,31,0.86));
        }
        .au .panel-in {
          position: relative; z-index: 1; width: 100%;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 34px 30px;
        }
        .au .brand {
          display: inline-flex; align-items: center; gap: 9px;
          font-family: var(--monof); font-size: 12px; font-weight: 500;
          letter-spacing: 0.22em; text-transform: uppercase; color: #fff;
        }
        .au .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #D47A58, var(--crimson));
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,96,58,0.4); }
          50%     { box-shadow: 0 0 0 7px rgba(201,96,58,0); }
        }
        .au .panel-title {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3vw, 36px); line-height: 1.08;
          letter-spacing: -0.015em; color: #fff; margin-bottom: 12px;
        }
        .au .panel-text { font-size: 13.5px; line-height: 1.7; color: rgba(255,255,255,0.72); max-width: 300px; }
        .au .panel-stats { display: flex; gap: 26px; margin-top: 26px; }
        .au .panel-stat-v { font-family: var(--display); font-weight: 900; font-size: 22px; color: #fff; }
        .au .panel-stat-l {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: 0.13em;
          text-transform: uppercase; color: rgba(255,255,255,0.55); margin-top: 3px;
        }
        .au .plate-tape {
          position: absolute; top: 0; left: 20px; z-index: 2;
          padding: 5px 12px; background: var(--crimson); color: #fff;
          font-family: var(--monof); font-size: 10px; letter-spacing: .14em;
          text-transform: uppercase; border-radius: 0 0 3px 3px;
        }

        /* ---------- right form panel ---------- */
        .au .formside { padding: clamp(28px, 4vw, 46px) clamp(22px, 4vw, 44px); display: flex; flex-direction: column; }

        /* specimen label */
        .au .label {
          display: inline-flex; align-items: stretch; align-self: flex-start;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--paper); overflow: hidden; margin-bottom: 18px;
        }
        .au .label-cap { width: 8px; background: var(--crimson); }
        .au .label-body { padding: 6px 11px; display: flex; align-items: center; gap: 11px; }
        .au .label-code {
          font-family: var(--monof); font-size: 10.5px; font-weight: 500;
          letter-spacing: 0.14em; text-transform: uppercase;
        }
        .au .label-name {
          font-family: var(--monof); font-size: 10.5px;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40);
        }
        .au .barcode {
          width: 40px; align-self: stretch; min-height: 14px; opacity: .75;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        .au h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3vw, 34px); letter-spacing: -0.015em;
          margin-bottom: 22px;
        }

        /* toggle */
        .au .toggle {
          display: flex; position: relative; width: 100%;
          background: var(--paper); border: 1px solid var(--rule);
          border-radius: 3px; padding: 4px; margin-bottom: 24px;
        }
        .au .toggle .slider {
          position: absolute; top: 4px; bottom: 4px; left: 4px;
          width: calc(50% - 4px); background: var(--ink);
          border-radius: 2px; transition: left .18s var(--ease);
        }
        .au .toggle.right .slider { left: 50%; }
        .au .toggle button {
          flex: 1; background: transparent; border: none; cursor: pointer;
          padding: 11px 8px; position: relative; z-index: 1;
          font-family: var(--monof); font-size: 11px; font-weight: 500;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--ink-40); transition: color .12s var(--ease);
        }
        .au .toggle button.on { color: var(--paper); }

        /* fields */
        .au .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-60);
        }
        .au .inp {
          width: 100%; padding: 12px 14px;
          background: var(--paper); color: var(--ink);
          border: 1px solid var(--rule); border-radius: 3px;
          font-family: var(--sansf); font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .au .inp::placeholder { color: var(--ink-40); }
        .au .inp:focus { outline: none; border-color: var(--crimson); box-shadow: 0 0 0 3px rgba(201,96,58,0.12); }

        .au .eye {
          position: absolute; right: 10px; bottom: 8px;
          background: none; border: none; cursor: pointer;
          font-size: 15px; color: var(--ink-40); padding: 4px;
        }

        /* buttons */
        .au .cta {
          width: 100%; padding: 14px 20px; margin-top: 4px;
          background: var(--color-bg-primary); color: var(--color-text-on-primary);
          border: 1px solid transparent; border-radius: var(--radius-md); cursor: pointer;
          font-family: var(--sansf); font-size: 13.5px; font-weight: 600; letter-spacing: 0.01em;
          transition: background var(--dur-instant) var(--ease);
        }
        .au .cta:hover { background: var(--color-bg-primary-hover); }
        .au .cta:disabled { opacity: .4; cursor: default; }

        .au .swap { margin-top: 20px; font-size: 13px; color: var(--ink-60); text-align: center; }
        .au .swap span { color: var(--crimson); cursor: pointer; font-weight: 700; }
        .au .forgot { text-align: right; margin: 6px 0 18px; }
        .au .forgot span { font-size: 12.5px; color: var(--ink-40); cursor: pointer; }
        .au .match { font-size: 12px; margin: 4px 0 12px; font-weight: 600; }

        @keyframes slideRight { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideLeft  { from{opacity:0;transform:translateX(18px)}  to{opacity:1;transform:translateX(0)} }
        .au .form-enter-r { animation: slideRight .3s ease forwards; }
        .au .form-enter-l { animation: slideLeft  .3s ease forwards; }
        .au .form-exit    { opacity: 0; transform: translateX(-10px); transition: all .25s; }

        /* ---------- responsive ---------- */
        @media (max-width: 860px) {
          .au { padding: 72px 12px 24px; align-items: flex-start; }
          .au .shell { grid-template-columns: 1fr; max-width: 480px; }
          .au .panel { min-height: 0; height: 180px; }
          .au .panel-in { padding: 18px 20px; justify-content: flex-end; }
          .au .panel-brand-row { position: absolute; top: 16px; left: 20px; }
          .au .panel-title { font-size: 22px; margin-bottom: 4px; }
          .au .panel-text, .au .panel-stats { display: none; }
          .au .formside { padding: 26px 20px 30px; }
        }
        @media (max-width: 380px) {
          .au .reg-grid { grid-template-columns: 1fr !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .au * { animation: none !important; transition: none !important; }
        }

        /* ── Demo panel (VITE_DEMO_MODE only) ── */
        .au .demo {
          margin-top: 22px; padding: 16px;
          border: 1px dashed var(--rule); border-radius: 10px;
          background: rgba(0,0,0,0.015);
        }
        .au .demo-head {
          display: flex; align-items: center; gap: 8px;
          font-family: var(--monof); font-size: 10.5px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-60);
        }
        .au .demo-pip {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--crimson); flex-shrink: 0;
        }
        .au .demo-sub { margin: 7px 0 13px; font-size: 12.5px; color: var(--ink-40); }
        .au .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .au .demo-btn {
          display: flex; flex-direction: column; gap: 2px; text-align: left;
          padding: 9px 11px; cursor: pointer;
          border: 1px solid var(--rule); border-radius: 7px;
          background: #fff; font-family: var(--sansf);
          transition: border-color .12s, background .12s;
        }
        .au .demo-btn:hover:not(:disabled) { border-color: var(--crimson); background: var(--paper); }
        .au .demo-btn:disabled { opacity: .5; cursor: default; }
        .au .demo-role { font-size: 12.5px; font-weight: 700; color: var(--ink); }
        .au .demo-mail { font-family: var(--monof); font-size: 10px; color: var(--ink-40); }
        .au .demo-note { margin-top: 11px; font-size: 11.5px; line-height: 1.55; color: var(--ink-40); }
        .au .demo-note code { font-family: var(--monof); font-size: 11px; }
        @media (max-width: 460px) { .au .demo-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="blob blob-a" />
      <div className="blob blob-b" />

      <button className="home-btn" onClick={()=>navigate("/")}>← Home</button>

      <div className="shell">

        {/* ---------- LEFT: photo panel ---------- */}
        <div className="panel">
          <span className="plate-tape">Specimen 05</span>
          {imgOk ? (
            <img
              src="/images/image 5.png"
              alt="Home Visit Mobile Lab logo"
              className="panel-img"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="panel-fallback" />
          )}
          <div className="panel-veil" />
          <div className="panel-in">
            <div className="panel-brand-row">
              <div className="brand"><span className="brand-dot" />Home Visit</div>
            </div>
            <div>
              <div className="panel-title">Your health,<br />at your doorstep.</div>
              <p className="panel-text">
                Book a certified phlebotomist for a home blood collection.
                Verified, barcoded reports in as little as 2 hours.
              </p>
              <div className="panel-stats">
                {[["15K+","Patients"],["4.9","Rating"],["2h","Reports"]].map(([v,l])=>(
                  <div key={l}>
                    <div className="panel-stat-v">{v}</div>
                    <div className="panel-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- RIGHT: form ---------- */}
        <div className="formside">
          <div className="label">
            <div className="label-cap" />
            <div className="label-body">
              <span className="label-code">HV-10</span>
              <span className="label-name">{isLogin ? "Sign in" : "Register"}</span>
              <span className="barcode" />
            </div>
          </div>

          <h1>{isLogin ? "Welcome back." : "Create your account."}</h1>

          <div className={`toggle ${!isLogin ? "right" : ""}`}>
            <span className="slider" />
            <button type="button" className={isLogin ? "on" : ""} onClick={() => switchTo(true)}>Login</button>
            <button type="button" className={!isLogin ? "on" : ""} onClick={() => switchTo(false)}>Register</button>
          </div>

          <div style={{ flex:1, overflow:"hidden" }}>
            {/* LOGIN */}
            {isLogin && (
              <form onSubmit={handleLogin} className={toggling?"form-exit":"form-enter-r"}>
                <div style={{ marginBottom:14 }}>
                  <label className="lbl">Email address</label>
                  <input className="inp" type="email" placeholder="you@example.com" value={lForm.email} onChange={e=>setL("email",e.target.value)} />
                </div>
                <div style={{ marginBottom:2, position:"relative" }}>
                  <label className="lbl">Password</label>
                  <input id="login-password" className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={lForm.password} onChange={e=>setL("password",e.target.value)} style={{ paddingRight:44 }} />
                  <button type="button" className="eye" onClick={()=>setShowPw(v=>!v)} aria-label="Show password">{showPw?"🙈":"👁"}</button>
                </div>
                <div className="forgot"><span>Forgot password?</span></div>
                <button className="cta" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in →"}
                </button>
                <p className="swap">
                  No account?{" "}
                  <span onClick={() => switchTo(false)}>Register free →</span>
                </p>

                {/* Only rendered when VITE_DEMO_MODE=true. */}
                {DEMO_MODE && (
                  <div className="demo">
                    <div className="demo-head">
                      <span className="demo-pip" aria-hidden="true" />
                      Try the demo
                    </div>
                    <p className="demo-sub">
                      Sign in as any role to explore the app. Sample data only.
                    </p>
                    <div className="demo-grid">
                      {DEMO_ACCOUNTS.map((a) => (
                        <button
                          key={a.role}
                          type="button"
                          className="demo-btn"
                          onClick={() => handleDemo(a)}
                          disabled={loading}
                          title={a.blurb}
                        >
                          <span className="demo-role">{a.label}</span>
                          <span className="demo-mail">{a.email}</span>
                        </button>
                      ))}
                    </div>
                    {!DEMO_PASSWORD && (
                      <p className="demo-note">
                        No demo password is built into this app. Clicking fills the
                        email; take the password from the output of{" "}
                        <code>npm run seed</code>.
                      </p>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* REGISTER */}
            {!isLogin && (
              <form onSubmit={handleRegister} className={toggling?"form-exit":"form-enter-l"}>
                <div className="reg-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                  <div style={{ gridColumn:"1/-1", marginBottom:14 }}>
                    <label className="lbl">Full name</label>
                    <input className="inp" type="text" placeholder="Jane Smith" value={rForm.name} onChange={e=>setR("name",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="lbl">Email</label>
                    <input className="inp" type="email" placeholder="you@email.com" value={rForm.email} onChange={e=>setR("email",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label className="lbl">Phone</label>
                    <input className="inp" type="tel" placeholder={locale.examplePhone} value={rForm.phone} onChange={e=>setR("phone",e.target.value)} />
                  </div>
                  <div style={{ marginBottom:14, position:"relative" }}>
                    <label className="lbl">Password</label>
                    <input className="inp" type={showPw?"text":"password"} placeholder="Min 6 chars" value={rForm.password} onChange={e=>setR("password",e.target.value)} style={{ paddingRight:44 }} />
                    <button type="button" className="eye" onClick={()=>setShowPw(v=>!v)} aria-label="Show password">{showPw?"🙈":"👁"}</button>
                  </div>
                  <div style={{ marginBottom:14, position:"relative" }}>
                    <label className="lbl">Confirm password</label>
                    <input className="inp" type={showCPw?"text":"password"} placeholder="Repeat" value={rForm.confirm} onChange={e=>setR("confirm",e.target.value)} style={{ paddingRight:44 }} />
                    <button type="button" className="eye" onClick={()=>setShowCPw(v=>!v)} aria-label="Show password">{showCPw?"🙈":"👁"}</button>
                  </div>
                </div>
                {rForm.confirm && (
                  <div className="match" style={{ color: rForm.password===rForm.confirm ? "var(--teal)" : "var(--crimson)" }}>
                    {rForm.password===rForm.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </div>
                )}
                <label style={{ display:"flex", alignItems:"flex-start", gap:10, margin:"4px 0 16px", fontSize:13, lineHeight:1.6, cursor:"pointer" }}>
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    style={{ marginTop:3, width:16, height:16, flexShrink:0, cursor:"pointer" }}
                  />
                  <span>
                    I have read the{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color:"var(--teal)", textDecoration:"underline" }}>
                      Privacy Policy
                    </Link>{" "}
                    and understand how my health information will be handled.
                  </span>
                </label>
                <button className="cta" type="submit" disabled={loading || !consent}>
                  {loading ? "Creating account..." : "Create account →"}
                </button>
                <p className="swap">
                  Already have an account?{" "}
                  <span onClick={() => switchTo(true)}>Sign in →</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}