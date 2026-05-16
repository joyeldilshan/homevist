import { useState, useEffect } from "react";
import LabBackground from "../components/LabBackground";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const tests = [
    { name:"Complete Blood Count", code:"CBC", price:"2,500", time:"24h", tag:"Most Popular", icon:"🩸" },
    { name:"Blood Glucose Fasting", code:"FBS", price:"800",   time:"2h",  tag:"Diabetes",    icon:"💉" },
    { name:"Lipid Profile",         code:"LIP", price:"1,800", time:"24h", tag:"Heart Health", icon:"❤️" },
    { name:"Thyroid Profile",       code:"THY", price:"3,200", time:"48h", tag:"Hormones",     icon:"🔬" },
    { name:"Liver Function Test",   code:"LFT", price:"2,200", time:"24h", tag:"Organ Health", icon:"🧪" },
    { name:"HbA1c",                 code:"HBA", price:"1,400", time:"4h",  tag:"Diabetes",     icon:"📊" },
  ];

  const steps = [
    { n:"01", icon:"🔬", title:"Choose Your Test",  desc:"Browse 50+ tests with prep instructions and transparent pricing." },
    { n:"02", icon:"📅", title:"Pick a Time Slot",  desc:"Morning to evening, 7 days a week. Choose what suits you." },
    { n:"03", icon:"🚗", title:"We Come to You",    desc:"A certified phlebotomist arrives at your home with sterile equipment." },
    { n:"04", icon:"📄", title:"Get Your Report",   desc:"Download your verified PDF report with QR code — usually within 24h." },
  ];

  const testimonials = [
    { name:"Priya N.",    role:"Patient, Jaffna",  text:"Rajan arrived on time and was very gentle. My CBC report was ready in 18 hours. Absolutely loved the service!", rating:5 },
    { name:"Dr. Arjun M.",role:"Cardiologist",     text:"I recommend HemoVisit to all my patients. Reports are accurate, properly formatted, and barcode verification is excellent.", rating:5 },
    { name:"Sunita R.",   role:"Regular Patient",  text:"Used HemoVisit 6 times. Never had to step out of my home. The phlebotomists are always professional and certified.", rating:5 },
  ];

  return (
    <div style={{ background:"#fff", color:"var(--text)", fontFamily:"var(--font)", overflowX:"hidden" }}>
      <LabBackground opacity={0.18} />

      <style>{`
        .hero-stat { text-align:center; }
        .hero-stat-val { font-size:28px; font-weight:800; color:var(--red); }
        .hero-stat-lbl { font-size:12px; color:var(--text3); margin-top:2px; font-weight:500; }

        .test-card-w {
          background:#fff; border:1.5px solid var(--border); border-radius:var(--radius-lg);
          padding:24px; cursor:pointer; transition:all 0.25s;
        }
        .test-card-w:hover { border-color:var(--red); box-shadow:var(--shadow-red); transform:translateY(-3px); }

        .step-card-w { position:relative; }

        .testi-card-w {
          background:#fff; border:1.5px solid var(--border); border-radius:var(--radius-lg);
          padding:28px; transition:all 0.25s;
        }
        .testi-card-w:hover { border-color:var(--red-mid); box-shadow:var(--shadow-md); }

        .nav-link-w {
          font-size:14px; font-weight:500; color:var(--text2);
          cursor:pointer; transition:color 0.2s; border:none; background:none;
          font-family:var(--font); padding:4px 0;
        }
        .nav-link-w:hover { color:var(--red); }

        .faq-item {
          border:1.5px solid var(--border); border-radius:var(--radius-md);
          overflow:hidden; transition:border-color 0.2s; margin-bottom:10px;
        }
        .faq-item:hover { border-color:var(--red-mid); }
        .faq-q {
          width:100%; padding:18px 20px; background:#fff; border:none;
          display:flex; justify-content:space-between; align-items:center;
          cursor:pointer; font-family:var(--font); font-size:15px;
          font-weight:600; color:var(--text); text-align:left;
        }

        /* Mobile nav */
        .mobile-nav {
          position:fixed; inset:0; background:#fff; zIndex:199;
          display:flex; flex-direction:column; padding:24px;
          gap:16px; transform:translateX(100%); transition:transform 0.3s;
        }
        .mobile-nav.open { transform:translateX(0); }

        @media(max-width:768px) {
          .hero-grid { grid-template-columns:1fr !important; }
          .features-grid { grid-template-columns:1fr !important; }
          .tests-grid { grid-template-columns:1fr 1fr !important; }
          .steps-grid { grid-template-columns:1fr 1fr !important; }
          .testi-grid { grid-template-columns:1fr !important; }
          .cta-flex { flex-direction:column !important; text-align:center; }
          .footer-flex { flex-direction:column !important; gap:8px !important; text-align:center; }
          .hero-text h1 { font-size:clamp(32px,8vw,52px) !important; }
          .stats-flex { grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background: scrolled ? "rgba(255,255,255,0.95)" : "#fff", borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent", backdropFilter:"blur(12px)", transition:"all 0.3s", padding:"0 5vw", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🩸</div>
          <span style={{ fontSize:18, fontWeight:800, color:"var(--text)", letterSpacing:-0.5 }}>HemoVisit</span>
        </div>
        <div className="hide-mobile" style={{ display:"flex", gap:28 }}>
          {["Services","Tests","How It Works","About"].map(l=>(
            <button key={l} className="nav-link-w">{l}</button>
          ))}
        </div>
        <div className="hide-mobile" style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/login")}>Sign In</button>
          <button className="btn btn-primary btn-sm" onClick={()=>navigate("/login")}>Book Now</button>
        </div>
        {/* Mobile menu button */}
        <button className="hide-desktop" onClick={()=>setMenuOpen(true)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"var(--text)" }}>☰</button>
      </nav>

      {/* Mobile nav drawer */}
      <div className={`mobile-nav ${menuOpen?"open":""}`} style={{ zIndex:200 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontWeight:800, fontSize:18 }}>🩸 HemoVisit</span>
          <button onClick={()=>setMenuOpen(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>
        {["Services","Tests","How It Works","About"].map(l=>(
          <button key={l} style={{ textAlign:"left", padding:"14px 0", borderBottom:"1px solid var(--border)", background:"none", border:"none", borderBottom:"1px solid var(--border)", fontSize:16, fontWeight:500, color:"var(--text)", cursor:"pointer", fontFamily:"var(--font)", width:"100%" }}>{l}</button>
        ))}
        <button className="btn btn-outline btn-full" onClick={()=>{ navigate("/login"); setMenuOpen(false); }}>Sign In</button>
        <button className="btn btn-primary btn-full" onClick={()=>{ navigate("/login"); setMenuOpen(false); }}>Book Now →</button>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ paddingTop:64, minHeight:"100vh", display:"flex", alignItems:"center", background:"linear-gradient(160deg, #fff 60%, #FFF5F5 100%)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"60px 5vw", width:"100%" }}>
          <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>

            {/* Left */}
            <div className="hero-text fade-up">
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"var(--red-light)", border:"1px solid var(--red-mid)", borderRadius:20, padding:"6px 14px", marginBottom:24 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)" }} />
                <span style={{ fontSize:12, fontWeight:600, color:"var(--red)" }}>Available in Jaffna, Sri Lanka</span>
              </div>

              <h1 style={{ fontSize:"clamp(36px,5vw,60px)", fontWeight:800, lineHeight:1.1, letterSpacing:-1.5, marginBottom:20, color:"var(--text)" }}>
                Blood Tests<br />
                <span style={{ color:"var(--red)", fontFamily:"var(--font-serif)", fontStyle:"italic" }}>at Your Doorstep</span>
              </h1>

              <p style={{ fontSize:17, color:"var(--text2)", lineHeight:1.8, marginBottom:36, maxWidth:480 }}>
                Skip the clinic queue. A certified phlebotomist visits your home, collects your sample, and delivers a verified report with barcode in as little as 2 hours.
              </p>

              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:48 }}>
                <button className="btn btn-primary btn-lg" onClick={()=>navigate("/login")}>Book a Test — Free</button>
                <button className="btn btn-ghost btn-lg" onClick={()=>navigate("/login")}>Sign In →</button>
              </div>

              {/* Stats */}
              <div className="stats-flex" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, paddingTop:32, borderTop:"1px solid var(--border)" }}>
                {[["15K+","Patients"],["4.9★","Rating"],["98.7%","Accuracy"],["30min","Arrival"]].map(([v,l])=>(
                  <div key={l} className="hero-stat">
                    <div className="hero-stat-val">{v}</div>
                    <div className="hero-stat-lbl">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual card stack */}
            <div className="hide-mobile fade-up" style={{ position:"relative", height:520 }}>
              {/* Main card */}
              <div className="card" style={{ position:"absolute", top:40, left:20, right:20, padding:28, boxShadow:"var(--shadow-lg)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:12, color:"var(--text3)", fontWeight:500, marginBottom:4 }}>Today's appointment</div>
                    <div style={{ fontSize:18, fontWeight:700 }}>Complete Blood Count</div>
                  </div>
                  <span className="tag tag-green">● Confirmed</span>
                </div>
                <div style={{ display:"flex", gap:16, marginBottom:20 }}>
                  {[["📅","Apr 15, 2026"],["⏰","09:00 AM"],["🧪","Rajan K."]].map(([i,v])=>(
                    <div key={v} style={{ background:"var(--bg)", borderRadius:10, padding:"10px 14px", flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{i}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Progress */}
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Sample collected → Processing</div>
                <div style={{ height:6, background:"var(--surface2)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:"60%", height:"100%", background:"linear-gradient(90deg,var(--red),#FC8181)", borderRadius:3 }} />
                </div>
              </div>
              {/* Report card */}
              <div className="card" style={{ position:"absolute", bottom:20, right:0, width:220, padding:20, boxShadow:"var(--shadow-lg)" }}>
                <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8, fontWeight:500 }}>Report Ready</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Lipid Profile</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginBottom:12 }}>#BK004821</div>
                <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:36, marginBottom:10 }}>
                  {[3,6,2,8,4,7,2,9,3,5,8,2,6,7,3,9,5,2,7,4].map((h,i)=>(
                    <div key={i} style={{ flex:1, background:i%3===0?"var(--red)":"var(--border2)", height:h*3+"px", borderRadius:1 }} />
                  ))}
                </div>
                <button className="btn btn-primary btn-sm btn-full" style={{ fontSize:11 }}>⬇ Download PDF</button>
              </div>
              {/* Rating card */}
              <div className="card" style={{ position:"absolute", top:20, right:-10, width:180, padding:16, boxShadow:"var(--shadow-md)" }}>
                <div style={{ fontSize:11, color:"var(--text3)", marginBottom:6 }}>Phlebotomist Rating</div>
                <div style={{ fontSize:24, fontWeight:800, color:"var(--amber)" }}>4.9 ★</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>Rajan K. · 142 reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"var(--bg)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:12 }}>Why HemoVisit</div>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:-0.5 }}>Healthcare that comes to you</h2>
          </div>
          <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
            {[
              { icon:"🏠", title:"Home Collection",    desc:"No need to visit a lab. We collect samples at your home, office, or anywhere you prefer." },
              { icon:"🎓", title:"Certified Staff",     desc:"All phlebotomists are licensed, trained, and background-verified for your safety." },
              { icon:"📄", title:"Verified Reports",    desc:"Every report has a unique barcode and QR code accepted at any hospital in Sri Lanka." },
              { icon:"⚡", title:"Fast Turnaround",     desc:"Most results ready in 2–24 hours. Get notified instantly via SMS and email." },
              { icon:"🔒", title:"Secure & Private",    desc:"Your health data is encrypted, HIPAA-compliant, and never shared without consent." },
              { icon:"💰", title:"Transparent Pricing", desc:"No hidden fees. See the exact price before you book. Pay by cash, card, or online." },
            ].map((f,i)=>(
              <div key={i} className="card" style={{ padding:28, transition:"all 0.25s" }}
                onMouseOver={e=>{ e.currentTarget.style.borderColor="var(--red-mid)"; e.currentTarget.style.boxShadow="var(--shadow-md)"; }}
                onMouseOut={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.boxShadow="var(--shadow-sm)"; }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:16 }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:14, color:"var(--text2)", lineHeight:1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEST CATALOG ─────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"#fff" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40, flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:12 }}>Test Catalog</div>
              <h2 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:800, letterSpacing:-0.5 }}>50+ Tests, All From Home</h2>
            </div>
            <button className="btn btn-outline" onClick={()=>navigate("/login")}>View All Tests →</button>
          </div>
          <div className="tests-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {tests.map((t,i)=>(
              <div key={i} className="test-card-w" onClick={()=>navigate("/login")}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{t.icon}</div>
                  <span className="tag tag-red">{t.tag}</span>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{t.name}</div>
                <div style={{ fontSize:12, color:"var(--text3)", marginBottom:14 }}>Results in {t.time}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:18, fontWeight:800, color:"var(--red)" }}>Rs. {t.price}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:"var(--text3)", background:"var(--bg)", padding:"3px 10px", borderRadius:20 }}>{t.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"var(--bg)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:12 }}>Process</div>
            <h2 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:800, letterSpacing:-0.5 }}>How It Works</h2>
          </div>
          <div className="steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }}>
            {steps.map((s,i)=>(
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ position:"relative", display:"inline-block", marginBottom:20 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"#fff", border:"2px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:"var(--shadow-sm)" }}>{s.icon}</div>
                  <div style={{ position:"absolute", top:-6, right:-6, width:22, height:22, borderRadius:"50%", background:"var(--red)", color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{s.n}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"#fff" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:12 }}>Reviews</div>
            <h2 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:800, letterSpacing:-0.5 }}>Trusted by Thousands</h2>
          </div>
          <div className="testi-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
            {testimonials.map((t,i)=>(
              <div key={i} className="testi-card-w">
                <div style={{ display:"flex", gap:2, marginBottom:16 }}>
                  {Array(t.rating).fill(0).map((_,j)=><span key={j} style={{ color:"var(--amber)", fontSize:16 }}>★</span>)}
                </div>
                <p style={{ fontSize:14, color:"var(--text2)", lineHeight:1.8, marginBottom:20 }}>"{t.text}"</p>
                <div style={{ display:"flex", alignItems:"center", gap:12, paddingTop:16, borderTop:"1px solid var(--border)" }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--red-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"var(--text3)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"var(--bg)" }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"var(--red)", textTransform:"uppercase", marginBottom:12 }}>FAQ</div>
            <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:800, letterSpacing:-0.5 }}>Frequently Asked</h2>
          </div>
          {[
            { q:"How fast will I get my results?", a:"Most tests are delivered within 2–4 hours. Complex panels may take up to 24 hours." },
            { q:"Are reports accepted by hospitals?", a:"Yes. All reports are verified by certified pathologists with a unique barcode/QR code that any doctor can scan." },
            { q:"Do I need to fast before my test?", a:"Depends on the test. Tests like FBS or Lipid Profile require 8–12 hours fasting. Prep instructions are shown at booking." },
            { q:"Is the home collection process safe?", a:"Absolutely. Our phlebotomists use single-use, sterile equipment and follow strict WHO safety guidelines." },
          ].map((faq,i)=>(
            <details key={i} className="faq-item">
              <summary className="faq-q">
                {faq.q}
                <span style={{ color:"var(--red)", fontSize:20, fontWeight:300, flexShrink:0 }}>+</span>
              </summary>
              <div style={{ padding:"0 20px 18px", fontSize:14, color:"var(--text2)", lineHeight:1.8 }}>{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 5vw", background:"var(--red)" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div className="cta-flex" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:32 }}>
            <div>
              <h2 style={{ fontSize:"clamp(24px,4vw,40px)", fontWeight:800, color:"#fff", letterSpacing:-0.5, marginBottom:12 }}>
                Book your first test<br />in under 2 minutes
              </h2>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.8)", lineHeight:1.7 }}>
                No clinic visits. No waiting rooms. Just accurate results at your convenience.
              </p>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", flexShrink:0 }}>
              <button onClick={()=>navigate("/login")} style={{ background:"#fff", color:"var(--red)", border:"none", borderRadius:12, padding:"14px 28px", fontFamily:"var(--font)", fontWeight:800, fontSize:15, cursor:"pointer", transition:"transform 0.2s", whiteSpace:"nowrap" }}
                onMouseOver={e=>e.target.style.transform="scale(1.03)"}
                onMouseOut={e=>e.target.style.transform="scale(1)"}>
                Create Free Account →
              </button>
              <button onClick={()=>navigate("/login")} style={{ background:"rgba(255,255,255,0.15)", color:"#fff", border:"1.5px solid rgba(255,255,255,0.4)", borderRadius:12, padding:"14px 28px", fontFamily:"var(--font)", fontWeight:600, fontSize:15, cursor:"pointer", whiteSpace:"nowrap" }}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background:"var(--text)", padding:"32px 5vw" }}>
        <div className="footer-flex" style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"var(--red)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🩸</div>
            <span style={{ fontWeight:700, color:"#fff", fontSize:16 }}>HemoVisit</span>
            <span style={{ color:"rgba(255,255,255,0.3)", margin:"0 8px" }}>·</span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Jaffna, Sri Lanka</span>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>© 2026 HemoVisit · Built by Joyel Dilshan</div>
        </div>
      </footer>

    </div>
  );
}