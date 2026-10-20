import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BOOKING_STAGES, TEST_PANEL_COUNT } from "../config/product";
import { onScrollFrame, useMagnetic, useParallax, useScrollProgress, useInView, prefersReducedMotion } from "../motion/lite";
import { SECTIONS, SpecimenLabel, SplitWords } from "./landing/parts";
import "./landing/landing.css";

/**
 * HemoVisit — landing page (v2: motion).
 *
 * LOADING. This file is the first chunk: nav, hero and footer. At build
 * time it is pre-rendered (scripts/prerender.mjs), so the hero headline
 * and photo are in the HTML and paint before any JavaScript runs. The
 * client then hydrates the same markup rather than replacing it, which is
 * why nothing here may read window, storage or the clock during render.
 *
 * Everything below the fold is ./landing/BelowFold: a lazy chunk mounted
 * only after hydration. Pre-rendering it too was measured and rejected:
 * it roughly quadrupled the markup the browser must lay out before first
 * paint and the work hydration must do, which cost more mobile LCP than
 * it saved. The trade-off: without JavaScript, only the hero and footer
 * show.
 *
 * MOTION. CSS owns the hero intro (it runs from the HTML, no JS needed).
 * ../motion/lite owns scroll-linked effects. Everything animates transform
 * or opacity, with two deliberate exceptions noted where they occur: the
 * ECG line (stroke-dashoffset, a 600x80 SVG) and the FAQ (height).
 * prefers-reduced-motion keeps simple fades and drops the rest.
 *
 * COPY RULES — non-negotiable. Nothing asserts that this service, any
 * laboratory or any person is accredited, registered, certified or
 * compliant. A fact that is not confirmed is left out entirely, never
 * shown as a placeholder. No statistics, ratings, testimonials, logos or
 * customer names. Numbers come from ../config/product.js only.
 *
 * PHOTOS live in frontend/public/images/.
 *   image1.jpg   phlebotomist with a patient at home  -> hero
 *                (+ image1.avif / image1.webp, same image, re-encoded)
 *   image 2.jpg  laboratory technician                -> band
 *   image 4.jpg  gloved hand with a sample tube       -> about
 *   image 5.png  old logo, "HOME VISIT MOBILE LAB" baked in -> unused
 */

const BelowFold = lazy(() => import("./landing/BelowFold"));

const NAV = SECTIONS.filter((s) => ["features", "process", "roles", "faq"].includes(s.id));

/** Smooth in-page jump that still works as a plain anchor without JS. */
export function jumpTo(e, id) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

/* ── The ECG line under the hero copy ──────────────────────────────
 * One beat, drawn once by stroke-dashoffset: the requested effect, and a
 * deliberate exception to transform/opacity, kept to a single 1.8 s run
 * on a small SVG. A looping pulse along the line was tried and measured:
 * animating stroke-dashoffset forever repaints on the main thread every
 * frame (~0.9 s of work per 6 s on a throttled phone). The "live" signal
 * is instead a dot at the end of the trace that beats with transform and
 * opacity only, which the compositor handles off the main thread. */
const BEAT =
  "M0 52 H150 l10 -6 l10 6 H210 l7 10 l12 -54 l12 72 l9 -28 H290 l14 -12 l16 12 H600";

function Ecg() {
  return (
    <div className="lp-ecg" aria-hidden="true">
      <svg viewBox="0 0 600 80" preserveAspectRatio="none">
        <path className="lp-ecg-base" d={BEAT} pathLength="1" />
      </svg>
      <span className="lp-ecg-dot" />
    </div>
  );
}

/* ── Glass "booking status" card over the hero photo ────────────────
 * Walks through the real booking stages (config/product.js). It is an
 * example, says so, and claims no live tracking or ETA: the product
 * reports stage changes, it does not track a phlebotomist's position. */
function LiveCard() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const [stage, setStage] = useState(1);

  useEffect(() => {
    if (!visible || prefersReducedMotion()) return;
    const id = setInterval(() => setStage((s) => (s + 1) % BOOKING_STAGES.length), 2600);
    return () => clearInterval(id);
  }, [visible]);

  const total = BOOKING_STAGES.length;
  return (
    <div className="lp-live" ref={ref} aria-hidden="true">
      <div className="lp-live-top">
        <span className="lp-pulse" />
        <span className="lp-mono">Booking status · example</span>
      </div>
      <div className="lp-live-titles">
        {BOOKING_STAGES.map((s, i) => (
          <span key={s.key} className={i === stage ? "on" : ""}>{s.title}</span>
        ))}
      </div>
      <div className="lp-live-bar">
        <span style={{ transform: `scaleX(${(stage + 1) / total})` }} />
      </div>
      <div className="lp-live-foot lp-mono">
        <span>Stage {stage + 1} of {total}</span>
        <span>BK·M9Q2T4</span>
      </div>
    </div>
  );
}

function Hero() {
  const photo = useRef(null);
  const cta = useRef(null);
  useParallax(photo, 34);
  useMagnetic(cta);

  return (
    <header id="hero" className="lp-hero">
      <div className="lp-mesh" aria-hidden="true">
        <span className="lp-blob lp-blob-a" />
        <span className="lp-blob lp-blob-b" />
        <span className="lp-blob lp-blob-c" />
      </div>

      <div className="wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <div className="lp-intro" style={{ "--i": 0 }}><SpecimenLabel id="hero" /></div>
          <h1 className="lp-h1">
            <SplitWords text="Blood tests, at your door." accentFrom={2} start={1} />
          </h1>
          <p className="lp-lede lp-intro" style={{ "--i": 6 }}>
            A phlebotomist visits your home, takes the sample, and your report
            arrives digitally. No clinic, no waiting room.
          </p>
          <div className="lp-cta-row lp-intro" style={{ "--i": 7 }}>
            <Link ref={cta} to="/login" className="b b-pri lp-magnetic">
              Book a test <span aria-hidden="true">→</span>
            </Link>
            <a href="#process" className="b b-sec" onClick={(e) => jumpTo(e, "process")}>See how it works</a>
          </div>
          <Ecg />
          <dl className="lp-meta lp-intro" style={{ "--i": 8 }}>
            <div><dt>Cardiff</dt><dd>&amp; South Wales</dd></div>
            <div><dt>CF</dt><dd>postcodes covered</dd></div>
            <div><dt>{TEST_PANEL_COUNT}</dt><dd>test panels</dd></div>
          </dl>
        </div>

        <div className="lp-hero-visual lp-intro-photo">
          <div className="lp-photo lp-photo-hero">
            {/* AVIF 65 kB / WebP 91 kB / JPEG 174 kB, same 1400px image. The
                photo is cropped by object-fit: cover into a near-square box on
                phones, so phones need the full width; the saving is the format. */}
            <picture>
              <source type="image/avif" srcSet="/images/image1.avif" />
              <source type="image/webp" srcSet="/images/image1.webp" />
              <img
                ref={photo}
                src="/images/image1.jpg"
                alt="A phlebotomist taking a blood sample from a seated patient in her own living room"
                width="1400" height="764"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
          </div>
          <LiveCard />
        </div>
      </div>
    </header>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => onScrollFrame(() => {
    const on = window.scrollY > 24;
    setScrolled((s) => (s === on ? s : on));
  }), []);

  return (
    <nav className={scrolled ? "lp-nav on" : "lp-nav"} aria-label="Main">
      <a href="#hero" className="brand" onClick={(e) => jumpTo(e, "hero")}>
        <span className="brand-dot" />HemoVisit
      </a>
      <div id="lp-menu" className={open ? "lp-links open" : "lp-links"}>
        {NAV.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => { jumpTo(e, s.id); setOpen(false); }}>{s.name}</a>
        ))}
      </div>
      <div className="lp-nav-end">
        <Link to="/login" className="b b-pri b-sm">Book a test</Link>
        <button type="button" className="lp-burger" onClick={() => setOpen(!open)}
                aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="lp-menu">
          <span /><span />
        </button>
      </div>
    </nav>
  );
}

export default function Home() {
  const bar = useRef(null);
  useScrollProgress(bar);

  // false on the server and in the hydration pass (so they match), true
  // straight after: the lazy chunk then loads and renders.
  const [rest, setRest] = useState(false);
  useEffect(() => setRest(true), []);

  return (
    <div className="lp">
      <div className="lp-progress" ref={bar} aria-hidden="true" />
      <Nav />

      {/* One <main> landmark: everything between the nav and the footer. */}
      <main>
        <Hero />
        {/* min-height keeps the footer below the fold until the chunk renders */}
        <Suspense fallback={<div className="lp-fold-wait" />}>
          {rest ? <BelowFold /> : <div className="lp-fold-wait" />}
        </Suspense>
      </main>

      <footer className="lp-foot">
        <div className="wrap lp-foot-row">
          <span className="brand"><span className="brand-dot" />HemoVisit</span>
          <div className="lp-foot-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
          <small>© 2026 HemoVisit · Cardiff, Wales</small>
        </div>
      </footer>
    </div>
  );
}
