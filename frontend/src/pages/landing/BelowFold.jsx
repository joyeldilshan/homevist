import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BOOKING_STAGES, ROLE_COUNT, TEST_PANEL_COUNT } from "../../config/product";
import {
  onScrollFrame, prefersReducedMotion, useCountUp, useInView, useParallax, useReveal, useTilt,
} from "../../motion/lite";
import { CAP, Icon, SpecimenLabel, SplitWords } from "./parts";

/**
 * Everything below the hero. Lazy-loaded by Home.jsx, pre-rendered with
 * it, and visible in the HTML before this chunk arrives: every effect
 * here only starts once the chunk has hydrated.
 *
 * Same rules as Home.jsx: no window, storage or clock in render, content
 * visible by default, transform/opacity, and copy that only states what
 * the code does.
 */

// SSR-safe layout effect (the server warns about useLayoutEffect).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ── Content ───────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Icon.drop,   tint: "crimson",  title: "Home blood collection", desc: "A phlebotomist comes to your home and collects your sample using sterile, single-use equipment." },
  { icon: Icon.report, tint: "gold",     title: "Digital reports",       desc: "Your report is delivered digitally with a barcode reference." },
  { icon: Icon.lock,   tint: "teal",     title: "Your data",             desc: "We handle your health information in line with our Privacy Policy." },
  { icon: Icon.track,  tint: "lavender", title: "Track your booking",    desc: "Follow your booking from request through to report, with status updates at each stage." },
  { icon: Icon.panels, tint: "crimson",  title: "Blood test panels",     desc: "Routine panels including full blood count, lipids, thyroid, liver function and HbA1c." },
  { icon: Icon.lab,    tint: "teal",     title: "Laboratory processing", desc: "Samples are processed by an external laboratory." },
];

const STEPS = [
  { n: "01", icon: Icon.calendar, tint: "crimson",  title: "Book your test",   desc: "Choose your tests, a date and a time slot. We check your postcode as you book." },
  { n: "02", icon: Icon.home,     tint: "gold",     title: "We arrive",        desc: "Your phlebotomist arrives at the agreed time with sterile equipment." },
  { n: "03", icon: Icon.tube,     tint: "lavender", title: "Sample collected", desc: "Collection is quick and done in the comfort of your own home." },
  { n: "04", icon: Icon.report,   tint: "teal",     title: "Get your report",  desc: "Your digital report arrives by email with a barcode reference." },
];

// The four roles in the role enum of backend/models/User.js.
const ROLES = [
  { key: "patient", label: "Patient",        tint: "crimson",
    desc: "Books tests, tracks the visit, downloads reports and manages a repeat subscription.",
    can: ["Book one or more tests", "Follow each stage of the booking", "Download the PDF report"] },
  { key: "phleb",   label: "Phlebotomist",   tint: "gold",
    desc: "Sees assigned visits, sets availability, and updates each booking as the sample is collected.",
    can: ["See assigned home visits", "Set availability", "Mark a sample as collected"] },
  { key: "lab",     label: "Lab technician", tint: "lavender",
    desc: "Receives samples, records results, and uploads the PDF report.",
    can: ["Receive collected samples", "Record results", "Upload the PDF report"] },
  { key: "admin",   label: "Admin",          tint: "teal",
    desc: "Assigns phlebotomists, manages the test catalogue and plans, and reviews the email audit log.",
    can: ["Assign phlebotomists", "Manage tests and plans", "Review the email audit log"] },
];

const FAQS = [
  { q: "How early can I book a slot?",           a: "You can choose any date from today onwards when you book. Your booking is confirmed once a phlebotomist has been assigned to it." },
  { q: "How long will my report take?",          a: "Expected turnaround for each test is shown when you book." },
  { q: "Do you cover my area?",                  a: "We currently visit postcodes starting CF, covering Cardiff and the surrounding South Wales area. Enter your postcode when booking and we will tell you straight away if we can reach you." },
  { q: "How is my health information handled?",  a: "We handle your health information in line with our Privacy Policy, which explains what we collect, why, and how long we keep it." },
];

/* ── About ─────────────────────────────────────────────────────── */
function About() {
  const img = useRef(null);
  useParallax(img, 28);
  return (
    <section id="about" className="wrap lp-sec">
      <div className="lp-two">
        <div data-reveal="up">
          <SpecimenLabel id="about" />
          <h2 className="lp-h2" data-reveal="words"><SplitWords text="Every drop tells a story." /></h2>
          <p className="lp-body">
            HemoVisit connects patients in Cardiff and South Wales with a
            phlebotomist who comes to them. The sample goes to a laboratory
            for analysis, and the result comes back as a report you can
            download from your account.
          </p>
        </div>
        <div data-reveal="scale" style={{ "--i": 1 }}>
          <div className="lp-photo lp-photo-tall">
            <img ref={img} src="/images/image%204.jpg" alt="A gloved hand holding a labelled blood sample tube"
                 loading="lazy" decoding="async" width="1400" height="2100" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Services ──────────────────────────────────────────────────── */
function ServiceCard({ f }) {
  const ref = useRef(null);
  useTilt(ref);
  const Ico = f.icon;
  return (
    <article className="lp-card" ref={ref} style={{ "--tint": CAP[f.tint] }}>
      <span className="lp-glow" aria-hidden="true" />
      <div className="lp-card-in">
        <span className="lp-card-ico"><Ico /></span>
        <h3>{f.title}</h3>
        <p>{f.desc}</p>
      </div>
    </article>
  );
}

function Services() {
  return (
    <section id="features" className="wrap lp-sec">
      <div className="lp-head" data-reveal="up">
        <SpecimenLabel id="features" />
        <h2 className="lp-h2" data-reveal="words"><SplitWords text="What you get." /></h2>
        <p className="lp-body">Everything the service does, and nothing it does not.</p>
      </div>
      <div className="lp-cards">
        {FEATURES.map((f, i) => (
          <div key={f.title} data-reveal="up" style={{ "--i": i % 3 }}>
            <ServiceCard f={f} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── How it works: sticky, scroll-driven ───────────────────────────
 * The rail fills with scroll progress through the list; the step whose
 * top has crossed the reading line is "active". Without JS, every step is
 * fully visible and the rail is full. */
function HowItWorks() {
  const list = useRef(null);
  const fill = useRef(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    setLive(true);
    const items = [...ol.querySelectorAll(".lp-step")];
    return onScrollFrame(() => {
      const line = window.innerHeight * 0.55;
      const r = ol.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (line - r.top) / r.height));
      if (fill.current) fill.current.style.transform = `scaleY(${p.toFixed(4)})`;
      let a = 0;
      items.forEach((el, i) => { if (el.getBoundingClientRect().top < line) a = i; });
      setActive((prev) => (prev === a ? prev : a));
    });
  }, []);

  const Big = STEPS[active].icon;
  return (
    <section id="process" className={live ? "lp-sec lp-how is-live" : "lp-sec lp-how"}>
      <div className="wrap lp-how-grid">
        <div className="lp-how-side">
          <div data-reveal="up">
            <SpecimenLabel id="process" />
            <h2 className="lp-h2" data-reveal="words"><SplitWords text="Four steps. One report." /></h2>
          </div>
          <div className="lp-how-stage" aria-hidden="true" style={{ "--tint": CAP[STEPS[active].tint] }}>
            <span className="lp-how-num" key={`n${active}`}>{STEPS[active].n}</span>
            <span className="lp-how-big" key={`i${active}`}><Big /></span>
            <span className="lp-mono lp-how-of">Step {active + 1} of {STEPS.length}</span>
          </div>
        </div>

        <ol className="lp-how-steps" ref={list}>
          <span className="lp-how-rail" aria-hidden="true"><span ref={fill} /></span>
          {STEPS.map((s, i) => {
            const I = s.icon;
            return (
              <li key={s.n} className={i <= active ? "lp-step is-on" : "lp-step"}
                  data-current={i === active ? "" : undefined} style={{ "--tint": CAP[s.tint] }}>
                <span className="lp-step-dot" aria-hidden="true" />
                <span className="lp-step-ico" aria-hidden="true"><I /></span>
                <span className="lp-step-n lp-mono">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ── Dark band with count-ups of real numbers only ─────────────── */
function Stat({ value, label }) {
  const ref = useRef(null);
  useCountUp(ref, value);
  return (
    <div className="lp-stat">
      <span className="lp-stat-v" ref={ref}>{value}</span>
      <span className="lp-stat-l lp-mono">{label}</span>
    </div>
  );
}

function Band() {
  const img = useRef(null);
  useParallax(img, 60);
  return (
    <section className="lp-band" aria-labelledby="band-h">
      <div className="lp-band-bg">
        <img ref={img} src="/images/image%202.jpg" alt="" loading="lazy" decoding="async" />
      </div>
      <div className="lp-band-veil" aria-hidden="true" />
      <div className="wrap lp-band-in">
        <h2 id="band-h" className="lp-h2" data-reveal="words">
          <SplitWords text="Collected at home. Processed in a laboratory." accentFrom={3} />
        </h2>
        <p className="lp-body" data-reveal="up" style={{ "--i": 2 }}>
          Your sample is taken at your address and sent to a laboratory for
          analysis. You can follow each stage from your account.
        </p>
        <div className="lp-stats" data-reveal="up" style={{ "--i": 3 }}>
          <Stat value={TEST_PANEL_COUNT} label="test panels in the catalogue" />
          <Stat value={BOOKING_STAGES.length} label="booking stages, tracked" />
          <Stat value={ROLE_COUNT} label="roles, one system" />
        </div>
      </div>
    </section>
  );
}

/* ── Roles: tabbed product preview ─────────────────────────────────
 * Styled mock cards built from the real screens' structure. Sample rows
 * only, labelled as such: no live data, no figures. */
const Row = ({ a, b, chip, tint }) => (
  <div className="mk-row">
    <span className="mk-a">{a}</span>
    <span className="mk-b">{b}</span>
    {chip && <span className="mk-chip" style={{ "--tint": tint }}>{chip}</span>}
  </div>
);

function Mock({ role }) {
  if (role === "patient") return (
    <>
      <div className="mk-title">My booking <span className="mk-ref">BKM9Q2T4A1X</span></div>
      <div className="mk-sub">Full blood count · Lipid profile</div>
      <div className="mk-steps">
        {BOOKING_STAGES.map((s, i) => (
          <span key={s.key} className={i <= 2 ? "on" : ""}><i />{s.title}</span>
        ))}
      </div>
      <div className="mk-btns"><span className="mk-btn">Download report (PDF)</span><span className="mk-btn ghost">Reschedule</span></div>
    </>
  );
  if (role === "phleb") return (
    <>
      <div className="mk-title">Assigned visits <span className="mk-toggle on">Available</span></div>
      <Row a="CF10" b="09:30 · Full blood count" chip="Confirmed" tint={CAP.teal} />
      <Row a="CF14" b="11:00 · Thyroid function" chip="Confirmed" tint={CAP.teal} />
      <Row a="CF24" b="14:15 · HbA1c" chip="Collected" tint={CAP.lavender} />
      <div className="mk-btns"><span className="mk-btn">Mark sample collected</span></div>
    </>
  );
  if (role === "lab") return (
    <>
      <div className="mk-title">Samples received</div>
      {["BKM9Q2T4A1X", "BKM9Q3B8K2D", "BKM9Q4C1R7P"].map((ref, i) => (
        <div className="mk-row" key={ref}>
          <span className="mk-code" aria-hidden="true">{Array.from({ length: 18 }).map((_, j) => <i key={j} style={{ width: (j * 7 + i * 3) % 3 + 1 }} />)}</span>
          <span className="mk-b">{ref}</span>
          <span className="mk-chip" style={{ "--tint": i ? CAP.gold : CAP.crimson }}>{i ? "Processing" : "Results entered"}</span>
        </div>
      ))}
      <div className="mk-btns"><span className="mk-btn">Upload report (PDF)</span></div>
    </>
  );
  return (
    <>
      <div className="mk-tabs"><span className="on">Bookings</span><span>Tests</span><span>Plans</span><span>Email log</span></div>
      <Row a="BKM9Q5D2" b="Pending · CF11" chip="Assign ▾" tint={CAP.crimson} />
      <Row a="BKM9Q5F7" b="Pending · CF5" chip="Assign ▾" tint={CAP.crimson} />
      <Row a="BKM9Q2T4" b="Confirmed · CF10" chip="Assigned" tint={CAP.teal} />
    </>
  );
}

function Roles() {
  const [tab, setTab] = useState(0);
  const tabs = useRef([]);
  const onKey = (e) => {
    const last = ROLES.length - 1;
    const next = { ArrowRight: tab === last ? 0 : tab + 1, ArrowLeft: tab === 0 ? last : tab - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(next);
    tabs.current[next]?.focus();
  };
  return (
    <section id="roles" className="wrap lp-sec">
      <div className="lp-head" data-reveal="up">
        <SpecimenLabel id="roles" />
        <h2 className="lp-h2" data-reveal="words"><SplitWords text="Four roles, one system." /></h2>
        <p className="lp-body">Each role sees only what it needs. Pick one to preview its screen.</p>
      </div>

      <div className="lp-roles" data-reveal="up" style={{ "--i": 1 }}>
        <div className="lp-tabs" role="tablist" aria-label="Roles" onKeyDown={onKey}>
          {ROLES.map((r, i) => (
            <button key={r.key} ref={(el) => (tabs.current[i] = el)} type="button" role="tab"
                    id={`role-tab-${r.key}`} aria-controls={`role-panel-${r.key}`}
                    aria-selected={tab === i} tabIndex={tab === i ? 0 : -1}
                    className={tab === i ? "lp-tab on" : "lp-tab"} style={{ "--tint": CAP[r.tint] }}
                    onClick={() => setTab(i)}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="lp-panels">
          {ROLES.map((r, i) => (
            <div key={r.key} role="tabpanel" id={`role-panel-${r.key}`} aria-labelledby={`role-tab-${r.key}`}
                 className={tab === i ? "lp-panel on" : "lp-panel"}
                 aria-hidden={tab !== i} inert={tab !== i ? "" : undefined} style={{ "--tint": CAP[r.tint] }}>
              <div className="lp-panel-copy">
                <h3>{r.label}</h3>
                <p>{r.desc}</p>
                <ul>{r.can.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              <figure className="lp-mock">
                <div className="mk-bar" aria-hidden="true"><i /><i /><i /><span>HemoVisit · {r.label}</span></div>
                <div className="mk-body"><Mock role={r.key} /></div>
                <figcaption className="lp-mono">Illustrative preview · sample data</figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How a booking moves: timeline with a travelling marker ────────
 * The marker's position is measured from the real dots, so it lines up
 * horizontally on desktop and vertically on a phone. It walks through the
 * five stages while the section is on screen. */
function Timeline() {
  const box = useRef(null);
  const marker = useRef(null);
  const fill = useRef(null);
  const track = useRef(null);
  const inView = useInView(box, "0px 0px -20% 0px");
  const [step, setStep] = useState(BOOKING_STAGES.length - 1);
  const [live, setLive] = useState(false);

  // Start from the first stage only once JS is running (no-JS shows all done).
  useEffect(() => { if (!prefersReducedMotion()) { setLive(true); setStep(0); } }, []);

  useEffect(() => {
    if (!live || !inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (BOOKING_STAGES.length + 2)), 1100);
    return () => clearInterval(id);
  }, [live, inView]);

  const shown = Math.min(step, BOOKING_STAGES.length - 1);

  const place = useCallback(() => {
    const root = box.current;
    if (!root || !marker.current) return;
    const dots = root.querySelectorAll(".lp-tl-dot");
    const first = dots[0], cur = dots[shown], last = dots[dots.length - 1];
    if (!first || !cur) return;
    // Offsets, not getBoundingClientRect: they ignore the reveal's
    // in-flight transform. Each dot sits in a positioned <li>, whose
    // offsetParent is this container.
    const at = (d) => ({
      x: d.parentElement.offsetLeft + d.offsetLeft + d.offsetWidth / 2,
      y: d.parentElement.offsetTop + d.offsetTop + d.offsetHeight / 2,
    });
    const a = at(first), c = at(cur), z = at(last);
    marker.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
    const horizontal = Math.abs(z.x - a.x) > Math.abs(z.y - a.y);
    const span = horizontal ? z.x - a.x : z.y - a.y;
    const done = horizontal ? c.x - a.x : c.y - a.y;
    // The track runs exactly from the first dot to the last.
    const t = track.current;
    if (t) Object.assign(t.style, horizontal
      ? { left: `${a.x}px`, top: `${a.y - 1}px`, width: `${span}px`, height: "2px" }
      : { left: `${a.x - 1}px`, top: `${a.y}px`, width: "2px", height: `${span}px` });
    if (fill.current) {
      const k = span ? done / span : 1;
      fill.current.style.transformOrigin = horizontal ? "0 50%" : "50% 0";
      fill.current.style.transform = horizontal ? `scaleX(${k})` : `scaleY(${k})`;
    }
  }, [shown]);

  useIsoLayoutEffect(() => { place(); }, [place]);
  useEffect(() => {
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  return (
    <section id="booking" className="wrap lp-sec">
      <div className="lp-head" data-reveal="up">
        <SpecimenLabel id="booking" />
        <h2 className="lp-h2" data-reveal="words"><SplitWords text="How a booking moves." /></h2>
        <p className="lp-body">The five states the software tracks, start to finish.</p>
      </div>
      <div className={live ? "lp-tl is-live" : "lp-tl"} ref={box} data-reveal="up" style={{ "--i": 1 }}>
        <span className="lp-tl-track" ref={track} aria-hidden="true"><span ref={fill} /></span>
        <span className="lp-tl-marker" ref={marker} aria-hidden="true" />
        <ol>
          {BOOKING_STAGES.map((s, i) => (
            <li key={s.key} className={i <= shown ? "on" : ""} aria-current={i === shown ? "step" : undefined}>
              <span className="lp-tl-dot" aria-hidden="true" />
              <span className="lp-mono lp-tl-n">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── FAQ: height-animated accordion ────────────────────────────────
 * Height is the second deliberate exception to transform/opacity: an
 * accordion that does not change height is not an accordion. CSS animates
 * grid-template-rows 0fr -> 1fr. Server HTML has every answer open, so
 * the content is readable without JS; hydration then collapses them. */
function Faq() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(null);
  useEffect(() => setReady(true), []);
  return (
    <section id="faq" className="wrap lp-sec">
      <div className="lp-head" data-reveal="up">
        <SpecimenLabel id="faq" />
        <h2 className="lp-h2" data-reveal="words"><SplitWords text="Common questions." /></h2>
      </div>
      <div className={ready ? "lp-faqs is-ready" : "lp-faqs"}>
        {FAQS.map((f, i) => {
          const isOpen = !ready || open === i;
          return (
            <div key={f.q} className={isOpen ? "lp-faq open" : "lp-faq"} data-reveal="up" style={{ "--i": i }}>
              <h3>
                <button type="button" id={`faq-q-${i}`} aria-controls={`faq-a-${i}`} aria-expanded={isOpen}
                        onClick={() => setOpen(open === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className="lp-plus" aria-hidden="true" />
                </button>
              </h3>
              <div className="lp-faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                <div><p>{f.a}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Final call to action ──────────────────────────────────────── */
function Cta() {
  // The spinning border and floating shapes loop forever; run them only
  // while the card is on screen. Off-screen they were measurable main-
  // thread work on a throttled phone for something nobody could see.
  const ref = useRef(null);
  const onScreen = useInView(ref, "100px");
  return (
    <section id="contact" className="wrap lp-sec">
      <div className={onScreen ? "lp-cta is-on" : "lp-cta"} ref={ref} data-reveal="scale">
        <div className="lp-cta-in">
          <div className="lp-shapes" aria-hidden="true">
            <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" />
          </div>
          <SpecimenLabel id="contact" dark />
          <h2 className="lp-h2"><SplitWords text="Ready when you are." accentFrom={2} /></h2>
          <p className="lp-body">
            Create an account, choose your tests and pick a time. We will tell
            you straight away whether we cover your postcode.
          </p>
          <div className="lp-cta-row lp-cta-center">
            <Link to="/login" className="b b-pri">Book a test <span aria-hidden="true">→</span></Link>
            <a href="#faq" className="b b-ghost" onClick={(e) => {
              const el = document.getElementById("faq");
              if (!el) return;
              e.preventDefault();
              el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
            }}>Read the FAQ</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BelowFold() {
  const scope = useRef(null);
  useReveal(scope);
  return (
    <div ref={scope}>
      <About />
      <Services />
      <HowItWorks />
      <Band />
      <Roles />
      <Timeline />
      <Faq />
      <Cta />
    </div>
  );
}
