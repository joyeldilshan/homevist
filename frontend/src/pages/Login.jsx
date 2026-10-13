import { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { isValidUkPhone, normaliseUkPhone, PHONE_MESSAGE } from "../utils/validators";
import locale from "../config/locale";
import { DEMO_MODE, DEMO_PASSWORD, DEMO_ACCOUNTS } from "../config/demo";

/**
 * Home Visit — Sign in / Register.
 *
 * PHASE 3. Rebuilt on the Phase 1 tokens so this page reads as the same
 * product as the landing: paper ground, Archivo display, teal primary,
 * terracotta as an accent only. The old "lab-label" treatment — specimen
 * tape, barcode sticker, hard 3px corners, flat drop shadow — is gone.
 *
 * PHOTO: the left panel shows /images/image 4.jpg, from the same set the
 * landing uses, and falls back to a teal gradient if it is missing. It
 * used to point at the brand mark (image 5.png): clip art stretched to
 * fill a tall panel, whose own "HOME VISIT MOBILE LAB" wordmark collided
 * with the heading laid over it.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { login, register } = useAuth();
  // /login and /register share this component. It used to hard-code true,
  // so /register opened on "Welcome back." with the sign-in form — the one
  // route whose whole purpose is the other tab.
  const [isLogin,  setIsLogin]  = useState(pathname !== "/register");
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
    setTimeout(() => {
      setIsLogin(loginMode);
      setToggling(false);
      // Keep the address bar honest, so the tab survives a reload or a
      // shared link. replace:true — toggling is not a navigation step the
      // back button should have to walk through.
      navigate(loginMode ? "/login" : "/register", { replace: true });
    }, 300);
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
          --card:    var(--color-bg-surface);
          --ink: var(--color-text-primary);
          --ink-60: var(--color-text-secondary);
          --ink-40: var(--color-text-muted);
          --rule: var(--color-border-default);
          /* Fill / border / large-text terracotta — 3.1:1 on paper. */
          --crimson: var(--color-bg-accent);
          /* The 4.5:1 variant. The ONLY terracotta allowed on small text. */
          --crimson-text: var(--color-text-accent);
          --lavender:#6E6AA8;
          --gold:    #B8862E;
          --teal:    var(--color-bg-primary);

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
        .au :focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

        /* ambient colour blobs */
        .au .blob { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .au .blob-a { width: 480px; height: 480px; top: -160px; right: -140px; background: radial-gradient(circle, rgba(201,96,58,0.20), transparent 65%); }
        .au .blob-b { width: 420px; height: 420px; bottom: -160px; left: -120px; background: radial-gradient(circle, rgba(28,122,107,0.18), transparent 65%); }

        /* home button */
        .au .home-btn {
          position: absolute; top: 20px; left: 20px; z-index: 10;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border: 1px solid var(--rule);
          border-radius: var(--radius-full); background: var(--glass-bg);
          backdrop-filter: var(--glass-blur); color: var(--ink-60);
          font-family: var(--monof); font-size: 11px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; box-shadow: var(--elev-1);
          transition: color var(--dur-instant) var(--ease),
                      border-color var(--dur-instant) var(--ease),
                      box-shadow var(--dur-fast) var(--ease),
                      transform var(--dur-fast) var(--ease);
        }
        /* --crimson-text, not --crimson: this label is 11px. */
        .au .home-btn:hover {
          border-color: var(--crimson-text); color: var(--crimson-text);
          box-shadow: var(--elev-2); transform: translateX(-2px);
        }

        /* card */
        .au .shell {
          width: 100%; max-width: 960px;
          display: grid; grid-template-columns: 0.92fr 1.08fr;
          background: var(--card);
          border: 1px solid var(--rule); border-radius: var(--radius-2xl);
          overflow: hidden; position: relative; z-index: 1;
          box-shadow: var(--elev-4);
          animation: auRise var(--dur-slow) var(--ease-out-expo) both;
        }
        /* Entrance is CSS, not a <Reveal> wrapper: .au centres .shell with
           flex, so an extra motion.div between them would become the flex
           child and the card would lose its max-width. The reduced-motion
           block at the foot of this stylesheet switches it off. */
        @keyframes auRise {
          from { opacity: 0; transform: translateY(14px) scale(.995); }
          to   { opacity: 1; transform: none; }
        }

        /* ---------- left photo panel ---------- */
        .au .panel { position: relative; min-height: 560px; display: flex; }
        /* The subject — the gloved hand and the tube — sits in the lower
           half of this frame. The copy is stacked at the top to keep off
           it, and the crop is biased just past centre. Desktop has only
           ~45px of slack here, so the stacking does the real work; the
           mobile strip crops hard and its own object-position matters. */
        .au .panel-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center 58%;
        }
        .au .panel-fallback {
          position: absolute; inset: 0;
          background: var(--grad-primary);
        }
        /* Teal-tinted, matching the landing's laboratory band, and deep
           enough at the foot that the copy clears AA over any crop. */
        .au .panel-veil {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(10,16,15,0.90) 0%,
            rgba(10,16,15,0.68) 42%,
            rgba(10,74,66,0.30) 72%,
            rgba(10,74,66,0.20) 100%);
        }
        .au .panel-in {
          position: relative; z-index: 1; width: 100%;
          display: flex; flex-direction: column; justify-content: flex-start;
          gap: 30px; padding: 34px 30px;
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
        /* Everything in this panel sits on a photograph, so a flat contrast
           figure cannot be trusted: the crop moves with the viewport and
           the lab coat behind the facts row is nearly white. The veil sets
           the average and these shadows carry the worst case. */
        .au .panel-title {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(26px, 3vw, 36px); line-height: var(--leading-tight);
          letter-spacing: var(--tracking-snug); color: #fff; margin-bottom: 12px;
          text-shadow: 0 2px 14px rgba(10,16,15,0.55);
        }
        .au .panel-text {
          font-size: var(--fs-small); line-height: var(--leading-body);
          color: rgba(255,255,255,0.88); max-width: 320px;
          text-shadow: 0 1px 8px rgba(10,16,15,0.70);
        }
        .au .panel-facts { display: flex; gap: 26px; margin-top: 26px; flex-wrap: wrap; }
        .au .panel-fact-v {
          font-family: var(--display); font-weight: 800; font-size: 19px;
          color: #fff; letter-spacing: var(--tracking-snug);
          text-shadow: 0 1px 8px rgba(10,16,15,0.70);
        }
        /* Was 0.55 alpha, which at 9.5px over the veil was well under
           4.5:1. Opaque white plus a tight shadow — this is the smallest
           text on the page and it has the least forgiving backdrop. */
        .au .panel-fact-l {
          font-family: var(--monof); font-size: 9.5px; letter-spacing: var(--tracking-wide);
          text-transform: uppercase; color: rgba(255,255,255,0.95); margin-top: 4px;
          text-shadow: 0 1px 6px rgba(10,16,15,0.85);
        }
        /* The "SPECIMEN 05" tape is gone: 10px white on a terracotta fill
           is about 3.5:1, and terracotta never carries small text. */

        /* ---------- right form panel ---------- */
        .au .formside { padding: clamp(28px, 4vw, 46px) clamp(22px, 4vw, 44px); display: flex; flex-direction: column; }

        /* Eyebrow — the dot + mono caption the landing uses for its section
           labels, in place of the old barcode sticker. */
        .au .eyebrow {
          display: inline-flex; align-items: center; gap: 9px;
          align-self: flex-start; margin-bottom: 18px;
          padding: 7px 14px; border: 1px solid var(--rule);
          border-radius: var(--radius-full); background: var(--paper);
          font-family: var(--monof); font-size: var(--fs-label); font-weight: 500;
          letter-spacing: var(--tracking-wide); text-transform: uppercase;
          color: var(--ink-60);
        }
        .au .eyebrow-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--crimson); flex-shrink: 0;
        }

        .au h1 {
          font-family: var(--display); font-weight: 900;
          font-size: var(--fs-h1); letter-spacing: var(--tracking-tight);
          line-height: var(--leading-tight); margin-bottom: 22px;
        }
        /* Second phrase in teal, as the landing hero does it. Large display
           type, so the accent could be terracotta here — teal is the choice
           that ties this page to the hero. */
        .au h1 .accent { color: var(--teal); }

        /* toggle */
        .au .toggle {
          display: flex; position: relative; width: 100%;
          background: var(--paper); border: 1px solid var(--rule);
          border-radius: var(--radius-full); padding: 4px; margin-bottom: 24px;
        }
        .au .toggle .slider {
          position: absolute; top: 4px; bottom: 4px; left: 4px;
          width: calc(50% - 4px); background: var(--grad-primary);
          border-radius: var(--radius-full); box-shadow: var(--elev-1);
          transition: left var(--dur-fast) var(--ease);
        }
        .au .toggle.right .slider { left: 50%; }
        .au .toggle button {
          flex: 1; background: transparent; border: none; cursor: pointer;
          padding: 11px 8px; position: relative; z-index: 1;
          font-family: var(--monof); font-size: 11px; font-weight: 500;
          letter-spacing: 0.16em; text-transform: uppercase;
          /* ink-40 on paper is 4.74:1, but this is 11px uppercase mono and
             it is a control, not prose — ink-60 keeps the inactive tab
             clearly readable next to the filled one. */
          color: var(--ink-60); transition: color var(--dur-instant) var(--ease);
        }
        .au .toggle button.on { color: var(--color-text-on-primary); }

        /* fields */
        .au .lbl {
          display: block; margin-bottom: 6px;
          font-family: var(--monof); font-size: 10px; font-weight: 500;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-60);
        }
        .au .inp {
          width: 100%; padding: 13px 15px;
          background: var(--paper); color: var(--ink);
          border: 1px solid var(--rule); border-radius: var(--radius-md);
          font-family: var(--sansf); font-size: 14px;
          transition: border-color var(--dur-instant) var(--ease),
                      box-shadow var(--dur-instant) var(--ease),
                      background var(--dur-instant) var(--ease);
        }
        .au .inp::placeholder { color: var(--ink-40); }
        .au .inp:hover { border-color: var(--color-border-strong); }
        .au .inp:focus {
          outline: none; background: var(--color-bg-surface);
          border-color: var(--color-border-focus); box-shadow: var(--glow-focus);
        }

        .au .eye {
          position: absolute; right: 10px; bottom: 8px;
          background: none; border: none; cursor: pointer;
          font-size: 15px; color: var(--ink-40); padding: 4px;
        }

        /* buttons */
        .au .cta {
          width: 100%; padding: 15px 20px; margin-top: 4px;
          background: var(--grad-primary); color: var(--color-text-on-primary);
          border: 1px solid transparent; border-radius: var(--radius-md); cursor: pointer;
          font-family: var(--sansf); font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
          box-shadow: var(--elev-1);
          transition: box-shadow var(--dur-fast) var(--ease),
                      transform var(--dur-fast) var(--ease),
                      filter var(--dur-instant) var(--ease);
        }
        .au .cta:hover:not(:disabled) { box-shadow: var(--glow-primary); filter: brightness(1.06); }
        .au .cta:active:not(:disabled) { transform: translateY(1px); }
        .au .cta:disabled { opacity: .4; cursor: default; box-shadow: none; }

        .au .swap { margin-top: 20px; font-size: 13px; color: var(--ink-60); text-align: center; }
        /* 13px, so --crimson-text. This link was the page's clearest
           breach of the small-text rule. */
        .au .swap span {
          color: var(--crimson-text); cursor: pointer; font-weight: 700;
          text-underline-offset: 3px;
        }
        .au .swap span:hover { text-decoration: underline; }
        .au .forgot { text-align: right; margin: 6px 0 18px; }
        .au .forgot span { font-size: 12.5px; color: var(--ink-40); cursor: pointer; }
        .au .forgot span:hover {
          color: var(--ink-60); text-decoration: underline; text-underline-offset: 3px;
        }
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
          .au .panel { min-height: 0; height: 196px; }
          .au .panel-img { object-position: center 70%; }
          .au .panel-in { padding: 46px 20px 18px; justify-content: flex-start; gap: 0; }
          .au .panel-brand-row { position: absolute; top: 16px; left: 20px; }
          .au .panel-title { font-size: 22px; margin-bottom: 4px; }
          /* The prose and the facts are desktop-panel furniture. At this
             height they would sit over the photograph's subject. */
          .au .panel-text, .au .panel-facts { display: none; }
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
          margin-top: 24px; padding: 18px;
          border: 1px solid var(--rule); border-radius: var(--radius-lg);
          background: var(--color-bg-subtle);
          box-shadow: var(--elev-1);
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
          display: flex; flex-direction: column; gap: 3px; text-align: left;
          padding: 11px 13px; cursor: pointer;
          border: 1px solid var(--rule); border-radius: var(--radius-md);
          background: var(--color-bg-surface); font-family: var(--sansf);
          box-shadow: var(--elev-1);
          transition: border-color var(--dur-instant) var(--ease),
                      box-shadow var(--dur-fast) var(--ease),
                      transform var(--dur-fast) var(--ease);
        }
        .au .demo-btn:hover:not(:disabled) {
          border-color: var(--teal); box-shadow: var(--elev-2); transform: translateY(-1px);
        }
        .au .demo-btn:disabled { opacity: .5; cursor: default; box-shadow: none; transform: none; }
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
          {imgOk ? (
            <img
              src="/images/image%204.jpg"
              alt="A gloved hand holding a labelled blood sample tube"
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
                A phlebotomist visits your home, takes the sample, and your
                report arrives digitally with a barcode reference.
              </p>
              {/* Facts the software can stand behind, and the same three the
                  landing hero shows: the area from locale.serviceAreaPrefixes,
                  the count from the seeded catalogue. What used to sit here —
                  "15K+" patients, a "4.9" rating, a "2h" turnaround — was
                  invented. A rating with no reviews behind it is exactly what
                  this project must not ship, and "certified" and "2 hours"
                  above it were claims nobody can check. */}
              <div className="panel-facts">
                {[["Cardiff","& South Wales"],["CF","Postcodes covered"],["6","Test panels"]].map(([v,l])=>(
                  <div key={l}>
                    <div className="panel-fact-v">{v}</div>
                    <div className="panel-fact-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- RIGHT: form ---------- */}
        <div className="formside">
          <div className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            HV-10 · {isLogin ? "Sign in" : "Register"}
          </div>

          <h1>
            {isLogin
              ? <>Welcome <span className="accent">back.</span></>
              : <>Create your <span className="accent">account.</span></>}
          </h1>

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
                  <div className="match" style={{ color: rForm.password===rForm.confirm ? "var(--color-status-success)" : "var(--color-status-danger)" }}>
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