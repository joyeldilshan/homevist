import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRichMotion } from "../hooks/useRichMotion";
import { Reveal, Stagger, StaggerItem, usePointerParallax } from "../motion";

/**
 * Home Visit — landing page (Phase 2: cinematic).
 *
 * MOTION. Every effect is transform/opacity only and gated behind
 * useRichMotion(), so on a narrow viewport, a coarse pointer or with
 * prefers-reduced-motion the page renders instantly with no movement.
 * The aurora is a CSS gradient moved on the GPU — it never animates
 * background-position, which would repaint the whole layer each frame.
 *
 * COPY RULES — unchanged and non-negotiable. Nothing asserts that this
 * service, any laboratory or any person is accredited, registered,
 * certified or compliant. Anything unverifiable carries
 * [PLACEHOLDER - add only if true]. No statistics, testimonials, team
 * members or customer names appear anywhere on this page.
 *
 * PHOTOS live in frontend/public/images/.
 *   image1.jpg   phlebotomist with a patient at home  -> hero
 *   image 2.jpg  laboratory technician                -> band
 *   image 4.jpg  gloved hand with a sample tube       -> about aside
 *   image 5.png  brand mark                           -> footer
 */

const PH = "[PLACEHOLDER - add only if true]";

const IMG = {
  hero: "/images/image1.jpg",
  lab:  "/images/image%202.jpg",
  tube: "/images/image%204.jpg",
  logo: "/images/image%205.png",
};

const SECTIONS = [
  { id: "hero",     code: "HV-01", name: "Home",     cap: "crimson"  },
  { id: "about",    code: "HV-02", name: "About",    cap: "lavender" },
  { id: "features", code: "HV-03", name: "Services", cap: "teal"     },
  { id: "process",  code: "HV-04", name: "Process",  cap: "gold"     },
  { id: "roles",    code: "HV-05", name: "Roles",    cap: "crimson"  },
  { id: "booking",  code: "HV-06", name: "Booking",  cap: "lavender" },
  { id: "faq",      code: "HV-07", name: "FAQ",      cap: "gold"     },
  { id: "contact",  code: "HV-08", name: "Contact",  cap: "crimson"  },
];

const CAP = { crimson: "#C9603A", lavender: "#6E6AA8", gold: "#B8862E", teal: "#0F6E62" };

/*
 * Look a section up by id, never by position. Positional lookups broke
 * once already: removing three sections shifted every index after them,
 * so one block rendered a neighbouring label and another read past the
 * end of the array and crashed the page.
 */
const section = (id) => SECTIONS.find((s) => s.id === id);

/* ── Section label ─────────────────────────────────────────────── */
function SpecimenLabel({ section }) {
  if (!section) return null;
  const cap = section.cap && CAP[section.cap] ? section.cap : "teal";
  return (
    <div className="label">
      <span className="label-cap" style={{ background: CAP[cap] }} />
      <span className="label-code">{section.code ?? ""}</span>
      <span className="label-name">{section.name ?? ""}</span>
    </div>
  );
}

/* ── Photo that drifts against the scroll ──────────────────────── */
function ParallaxPhoto({ src, alt, strength = 10, className = "", priority = false }) {
  const rich = useRichMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const travel = rich ? strength : 0;
  const y = useTransform(scrollYProgress, [0, 1], [`-${travel}%`, `${travel}%`]);
  const [failed, setFailed] = useState(false);

  return (
    <div ref={ref} className={`photo ${className}`}>
      {failed ? (
        <div className="photo-missing">Image not found<br /><code>{decodeURI(src)}</code></div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          className="photo-img"
          style={{ y }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const rich = useRichMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const pointer = usePointerParallax({ strength: 14 });

  // Hero: text sinks and fades while the photo rises — they move apart.
  const d = rich ? 1 : 0;
  const heroTextY  = useTransform(scrollY, [0, 700], [0, 80 * d]);
  const heroFade   = useTransform(scrollY, [0, 520], [1, d ? 0.1 : 1]);
  const heroPhotoY = useTransform(scrollY, [0, 700], [0, -54 * d]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  // ============== CONTENT ==============
  const features = [
    { icon: "🩸", tint: "crimson",  title: "Home Blood Collection", desc: "A phlebotomist comes to your home and collects your sample using sterile, single-use equipment." },
    { icon: "⚡", tint: "gold",     title: "Digital Reports",       desc: `Your report is delivered digitally with a barcode reference. Typical turnaround: ${PH}` },
    { icon: "🔒", tint: "teal",     title: "Your Data",             desc: "We handle your health information in line with our Privacy Policy." },
    { icon: "📱", tint: "lavender", title: "Track Your Booking",    desc: "Follow your booking from request through to report, with status updates at each stage." },
    { icon: "🧬", tint: "crimson",  title: "Blood Test Panels",     desc: "Routine panels including full blood count, lipids, thyroid, liver function and HbA1c." },
    { icon: "🏥", tint: "teal",     title: "Laboratory Processing", desc: `Samples are processed by an external laboratory. Accreditation (for example UKAS): ${PH}` },
  ];

  const process = [
    { step: "01", tint: "crimson",  title: "Book Your Test",   desc: "Choose your tests, a date and a time slot." },
    { step: "02", tint: "gold",     title: "We Arrive",        desc: "Your phlebotomist arrives at the agreed time with sterile equipment." },
    { step: "03", tint: "lavender", title: "Sample Collected", desc: "Collection is quick and done in the comfort of your own home." },
    { step: "04", tint: "teal",     title: "Get Your Report",  desc: "Your digital report arrives by email with a barcode reference." },
  ];

  // The four roles the application actually implements, from the role
  // enum in backend/models/User.js — not marketing invention.
  const roles = [
    { initials: "P",  tint: "crimson",  title: "Patient",        desc: "Books tests, tracks the visit, downloads reports and manages a repeat subscription." },
    { initials: "Ph", tint: "gold",     title: "Phlebotomist",   desc: "Sees assigned visits, sets availability, and updates each booking as the sample is collected." },
    { initials: "L",  tint: "lavender", title: "Lab technician", desc: "Receives samples, records results, and uploads the verified PDF report." },
    { initials: "A",  tint: "teal",     title: "Admin",          desc: "Assigns phlebotomists, manages the test catalogue and plans, and reviews the email audit log." },
  ];

  // The booking lifecycle, from the status enum in backend/models/Booking.js.
  const lifecycle = [
    { step: "01", tint: "gold",     title: "Pending",          desc: "The booking is placed and waiting for a phlebotomist to be assigned." },
    { step: "02", tint: "teal",     title: "Confirmed",        desc: "A phlebotomist is assigned to the visit and the patient is notified." },
    { step: "03", tint: "lavender", title: "Sample collected", desc: "The home visit has happened and the sample is on its way to the laboratory." },
    { step: "04", tint: "crimson",  title: "Processing",       desc: "The laboratory is analysing the sample and entering results." },
    { step: "05", tint: "teal",     title: "Report ready",     desc: "The report is generated with a barcode reference and emailed to the patient." },
  ];

  const faqs = [
    { q: "How early can I book a slot?",       a: "You can choose any date from today onwards when you book. Your booking is confirmed once a phlebotomist has been assigned to it." },
    { q: "What are the phlebotomists' qualifications?", a: `Details of our phlebotomists' training and registration: ${PH}` },
    { q: "How long will my report take?",      a: `Expected turnaround for each test is shown when you book. Service-level commitments: ${PH}` },
    { q: "Do you cover my area?",              a: "We currently visit postcodes starting CF, covering Cardiff and the surrounding South Wales area. Enter your postcode when booking and we will tell you straight away if we can reach you." },
    { q: "How is my health information handled?", a: "We handle your health information in line with our Privacy Policy, which explains what we collect, why, and how long we keep it." },
  ];

  const NAV = SECTIONS.filter((s) => ["about", "features", "process", "faq"].includes(s.id));

  return (
    <div className="hv">
      <style>{`
        .hv { background: var(--color-bg-page); color: var(--color-text-primary); font-family: var(--sansf); overflow-x: hidden; position: relative; }
        .hv .wrap { max-width: var(--maxw); margin: 0 auto; padding-inline: var(--gutter); position: relative; z-index: 1; }
        .hv section { padding-block: clamp(56px, 6.5vw, 104px); position: relative; }
        .hv h1, .hv h2, .hv h3 { font-family: var(--display); font-weight: 800; letter-spacing: var(--tracking-tight); line-height: var(--leading-tight); }
        .hv p { line-height: var(--leading-body); }

        /* ===== Aurora ===== */
        .hv .aurora { position: fixed; inset: -30% -10%; z-index: 0; pointer-events: none;
          background: var(--grad-aurora); filter: blur(44px); opacity: .5; will-change: transform; }
        .hv .grain { position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: .5;
          background-image: radial-gradient(var(--color-border-default) .6px, transparent .6px);
          background-size: 22px 22px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 0%, #000 20%, transparent 72%);
          mask-image: radial-gradient(ellipse at 50% 0%, #000 20%, transparent 72%); }

        .hv .prog { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 100;
          background: var(--grad-accent); transform-origin: 0 50%; }

        /* ===== Nav ===== */
        .hv .nav { position: sticky; top: 0; z-index: 60; display: flex; align-items: center;
          justify-content: space-between; gap: 16px; padding: 15px var(--gutter);
          border-bottom: 1px solid transparent;
          transition: background var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease), padding var(--dur-base) var(--ease); }
        .hv .nav.on { padding-block: 11px; background: rgba(244,242,237,.78);
          backdrop-filter: var(--glass-blur); border-bottom-color: var(--color-border-default); }
        .hv .brand { display: flex; align-items: center; gap: 10px; font-family: var(--display);
          font-weight: 800; font-size: 17px; letter-spacing: var(--tracking-snug); }
        .hv .brand-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--grad-primary); flex-shrink: 0; }
        .hv .nav-links { display: flex; gap: 28px; }
        .hv .nav-links button { background: none; border: none; cursor: pointer; font-family: var(--sansf);
          font-size: var(--fs-small); color: var(--color-text-secondary); padding: 4px 0; position: relative;
          transition: color var(--dur-instant) var(--ease); }
        .hv .nav-links button::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px;
          height: 1.5px; background: var(--color-bg-primary); transform: scaleX(0); transform-origin: 0 50%;
          transition: transform var(--dur-fast) var(--ease); }
        .hv .nav-links button:hover { color: var(--color-text-primary); }
        .hv .nav-links button:hover::after { transform: scaleX(1); }
        .hv .burger { display: none; background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-text-primary); }

        /* ===== Buttons ===== */
        .hv .b { display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          font-family: var(--sansf); font-size: var(--fs-small); font-weight: 600; letter-spacing: .01em;
          padding: 14px 26px; border-radius: var(--radius-md); border: 1px solid transparent;
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: background var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
        .hv .b-pri { background: var(--grad-primary); color: var(--color-text-on-primary); box-shadow: var(--elev-2); }
        .hv .b-pri:hover { box-shadow: var(--glow-primary); transform: translateY(-2px); }
        .hv .b-sec { background: var(--color-bg-surface); color: var(--color-text-primary);
          border-color: var(--color-border-default); box-shadow: var(--elev-1); }
        .hv .b-sec:hover { border-color: var(--color-bg-primary); box-shadow: var(--elev-2); transform: translateY(-2px); }

        /* ===== Label ===== */
        .hv .label { display: inline-flex; align-items: center; gap: 9px; padding: 6px 13px 6px 9px;
          border: 1px solid var(--color-border-default); border-radius: var(--radius-full);
          background: var(--glass-bg); margin-bottom: 20px; }
        .hv .label-cap { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .hv .label-code, .hv .label-name { font-family: var(--monof); font-size: var(--fs-label);
          letter-spacing: var(--tracking-wide); text-transform: uppercase; }
        .hv .label-code { color: var(--color-text-muted); }
        .hv .label-name { color: var(--color-text-primary); font-weight: 500; }

        /* ===== Hero ===== */
        .hv .hero { min-height: calc(100svh - 66px); display: flex; flex-direction: column;
          justify-content: center; padding-block: clamp(28px, 5vh, 64px); }
        .hv .hero-grid { display: grid; grid-template-columns: 1.08fr .92fr; gap: clamp(32px, 5vw, 76px); align-items: center; }
        .hv .hero h1 { font-size: var(--fs-hero); font-weight: 900; max-width: 13ch; margin-bottom: 22px; }
        .hv .hero h1 .accent { background: var(--grad-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .hv .hero-lede { font-size: clamp(16px, 1.3vw, 19px); color: var(--color-text-secondary); max-width: 46ch; margin-bottom: 30px; }
        .hv .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
        .hv .hero-meta { display: grid; grid-template-columns: repeat(3, auto); justify-content: start; gap: 26px; margin-top: 34px; }
        .hv .hero-meta div { display: flex; flex-direction: column; gap: 3px; }
        .hv .hero-meta b { font-family: var(--display); font-size: 19px; font-weight: 800; }
        .hv .hero-meta span { font-family: var(--monof); font-size: var(--fs-label);
          letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-text-muted); }

        /* ===== Photo ===== */
        .hv .photo { position: relative; overflow: hidden; border-radius: var(--radius-xl);
          background: var(--color-bg-subtle); box-shadow: var(--elev-3); }
        .hv .photo-img { position: absolute; inset: -14% 0; width: 100%; height: 128%; object-fit: cover; display: block; }
        .hv .photo-missing { position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px; padding: 16px; text-align: center;
          font-family: var(--monof); font-size: 12px; color: var(--color-text-muted); }
        .hv .photo-hero { aspect-ratio: 4 / 5; }
        .hv .photo-tall { aspect-ratio: 4 / 4.4; }

        /* ===== Section heads ===== */
        /* No max-width on .head itself: a ch value here resolves against
           the container's 16px font, which squeezed 60px headings into a
           ~368px box and broke every section title mid-phrase. Constrain
           the heading and the lede separately, in their own ems. */
        .hv .head { margin-bottom: clamp(32px, 4vw, 52px); }
        .hv .head h2 { font-size: var(--fs-display); margin-bottom: 14px; max-width: 16em; text-wrap: balance; }
        .hv .head p { font-size: var(--fs-body); color: var(--color-text-secondary); max-width: 54ch; }

        /* ===== Cards ===== */
        .hv .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .hv .card { position: relative; padding: 28px; border-radius: var(--radius-lg);
          background: var(--color-bg-surface); border: 1px solid var(--color-border-default);
          box-shadow: var(--elev-1); overflow: hidden; height: 100%;
          transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease); }
        .hv .card:hover { transform: translateY(-5px); box-shadow: var(--elev-3); border-color: var(--tint); }
        .hv .card-icon { font-size: 25px; display: block; margin-bottom: 14px; }
        .hv .card h3 { font-size: var(--fs-h2); margin-bottom: 9px; }
        .hv .card p { font-size: var(--fs-small); color: var(--color-text-secondary); }

        /* ===== Steps ===== */
        .hv .steps { display: flex; flex-direction: column; }
        .hv .step { display: grid; grid-template-columns: 92px 1fr; gap: 26px; align-items: start;
          padding: 26px 0; border-top: 1px solid var(--color-border-default); }
        .hv .steps > div:last-child .step { border-bottom: 1px solid var(--color-border-default); }
        .hv .step-n { font-family: var(--display); font-size: 42px; font-weight: 900; line-height: 1;
          color: transparent; -webkit-text-stroke: 1.5px var(--tint); }
        .hv .step h3 { font-size: var(--fs-h2); margin-bottom: 7px; }
        .hv .step p { font-size: var(--fs-small); color: var(--color-text-secondary); max-width: 62ch; }

        .hv .split { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(30px, 5vw, 72px); align-items: center; }
        .hv .split-top { align-items: start; }

        /* ===== Band ===== */
        .hv .band { position: relative; min-height: clamp(320px, 52vh, 520px); display: flex; align-items: center; overflow: hidden; }
        .hv .band .photo { position: absolute; inset: 0; border-radius: 0; box-shadow: none; }
        .hv .band-veil { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(14,17,22,.88), rgba(15,110,98,.66)); }
        .hv .band-in { position: relative; z-index: 1; }
        .hv .band-in h2 { color: #fff; font-size: var(--fs-display); max-width: 18ch; margin-bottom: 14px; }
        .hv .band-in p { color: rgba(255,255,255,.88); font-size: var(--fs-body); max-width: 52ch; }

        /* ===== Roles ===== */
        .hv .roles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .hv .role { display: flex; gap: 16px; padding: 22px; border-radius: var(--radius-lg); height: 100%;
          background: var(--glass-bg); border: 1px solid var(--color-border-default);
          transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); }
        .hv .role:hover { transform: translateY(-3px); box-shadow: var(--elev-2); }
        .hv .role-badge { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex;
          align-items: center; justify-content: center; font-family: var(--display); font-weight: 800;
          font-size: 15px; color: #fff; background: var(--tint); }
        .hv .role h3 { font-size: var(--fs-h3); margin-bottom: 5px; }
        .hv .role p { font-size: var(--fs-small); color: var(--color-text-secondary); }

        /* ===== Lifecycle ===== */
        .hv .flow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
        .hv .flow-item { padding-top: 20px; border-top: 2px solid var(--tint); height: 100%; }
        .hv .flow-item b { font-family: var(--monof); font-size: var(--fs-label);
          letter-spacing: var(--tracking-wide); color: var(--tint); display: block; margin-bottom: 9px; }
        .hv .flow-item h3 { font-size: var(--fs-h3); margin-bottom: 6px; }
        .hv .flow-item p { font-size: 13px; color: var(--color-text-secondary); line-height: 1.55; }

        /* ===== FAQ ===== */
        .hv .faq { border-top: 1px solid var(--color-border-default); }
        .hv .faq.last { border-bottom: 1px solid var(--color-border-default); }
        .hv .faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 24px;
          background: none; border: none; cursor: pointer; text-align: left; padding: 24px 0;
          font-family: var(--display); font-weight: 700; font-size: var(--fs-h2);
          letter-spacing: var(--tracking-snug); color: var(--color-text-primary);
          transition: color var(--dur-instant) var(--ease); }
        .hv .faq-q:hover { color: var(--color-bg-primary); }
        .hv .faq-sign { font-family: var(--monof); font-size: 22px; color: var(--color-text-accent); flex-shrink: 0;
          transition: transform var(--dur-fast) var(--ease); }
        .hv .faq.open .faq-sign { transform: rotate(45deg); }
        .hv .faq-a { overflow: hidden; }
        .hv .faq-a p { font-size: var(--fs-body); color: var(--color-text-secondary); max-width: 70ch; padding-bottom: 24px; }

        /* ===== CTA ===== */
        .hv .cta { position: relative; overflow: hidden; border-radius: var(--radius-2xl);
          padding: clamp(40px, 6vw, 76px); text-align: center; background: var(--ground-900); box-shadow: var(--elev-4); }
        .hv .cta::before { content: ""; position: absolute; inset: -40%; background: var(--grad-aurora);
          filter: blur(50px); opacity: .62; pointer-events: none; }
        .hv .cta-in { position: relative; z-index: 1; }
        .hv .cta h2 { color: #fff; font-size: var(--fs-display); margin-bottom: 16px; }
        .hv .cta p { color: rgba(255,255,255,.82); font-size: var(--fs-body); max-width: 48ch; margin: 0 auto 30px; }
        .hv .cta .label { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.22); }
        .hv .cta .label-name { color: #fff; }
        .hv .cta .label-code { color: rgba(255,255,255,.6); }
        .hv .cta .b-sec { background: transparent; color: #fff; border-color: rgba(255,255,255,.32); box-shadow: none; }
        .hv .cta .b-sec:hover { background: rgba(255,255,255,.1); border-color: #fff; }

        /* ===== Footer ===== */
        .hv .foot { border-top: 1px solid var(--color-border-default); padding-block: 46px; position: relative; z-index: 1; }
        .hv .foot-row { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .hv .foot-logo { height: 46px; width: auto; opacity: .85; }
        .hv .foot a { color: var(--color-text-secondary); font-size: var(--fs-small); text-decoration: none; margin-right: 22px; }
        .hv .foot a:hover { color: var(--color-text-primary); text-decoration: underline; }
        .hv .foot small { font-size: var(--fs-small); color: var(--color-text-muted); }

        /* ===== Responsive ===== */
        @media (max-width: 980px) {
          .hv .hero-grid, .hv .split { grid-template-columns: 1fr; }
          .hv .cards { grid-template-columns: repeat(2, 1fr); }
          .hv .flow { grid-template-columns: repeat(2, 1fr); }
          .hv .photo-hero { aspect-ratio: 16 / 10; }
        }
        @media (max-width: 640px) {
          .hv .nav-links { display: none; }
          .hv .burger { display: block; }
          .hv .nav-links.open { display: flex; flex-direction: column; position: absolute; top: 100%;
            left: 0; right: 0; background: var(--color-bg-page);
            border-bottom: 1px solid var(--color-border-default); padding: 18px var(--gutter); gap: 16px; }
          .hv .cards, .hv .roles, .hv .flow { grid-template-columns: 1fr; }
          .hv .step { grid-template-columns: 58px 1fr; gap: 16px; }
          .hv .step-n { font-size: 30px; }
          .hv .hero-meta { gap: 14px; }
          .hv .hero-meta b { font-size: 17px; }
        }

        /* Aurora and grain are pure decoration; drop them for reduced motion. */
        @media (prefers-reduced-motion: reduce) {
          .hv .aurora, .hv .grain { display: none; }
          .hv .card:hover, .hv .role:hover, .hv .b:hover { transform: none; }
        }
      `}</style>

      <motion.div
        className="aurora"
        aria-hidden="true"
        style={pointer.layer(0.6)}
        animate={rich ? { scale: [1, 1.07, 1], rotate: [0, 1.5, 0] } : undefined}
        transition={rich ? { duration: 26, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <div className="grain" aria-hidden="true" />
      <motion.div className="prog" style={{ scaleX: progress }} aria-hidden="true" />

      {/* ===== NAV ===== */}
      <nav className={scrolled ? "nav on" : "nav"}>
        <div className="brand"><span className="brand-dot" />Home Visit</div>
        <div className={open ? "nav-links open" : "nav-links"}>
          {NAV.map((s) => <button key={s.id} onClick={() => go(s.id)}>{s.name}</button>)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="b b-pri" onClick={() => navigate("/login")}>Book a test</button>
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* One <main> landmark: everything between the nav and the footer. */}
      <main>

      {/* ===== HERO ===== */}
      <header id="hero" className="wrap hero">
        <div className="hero-grid">
          <motion.div style={{ y: heroTextY, opacity: heroFade }}>
            <Stagger>
              <StaggerItem><SpecimenLabel section={section("hero")} /></StaggerItem>
              <StaggerItem><h1>Blood tests, <span className="accent">at your door.</span></h1></StaggerItem>
              <StaggerItem>
                <p className="hero-lede">
                  A phlebotomist visits your home, takes the sample, and your
                  report arrives digitally. No clinic, no waiting room.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="hero-cta">
                  <button className="b b-pri" onClick={() => navigate("/login")}>Book a test →</button>
                  <button className="b b-sec" onClick={() => go("process")}>See how it works</button>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="hero-meta">
                  <div><b>Cardiff</b><span>&amp; South Wales</span></div>
                  <div><b>CF</b><span>postcodes covered</span></div>
                  <div><b>6</b><span>test panels</span></div>
                </div>
              </StaggerItem>
            </Stagger>
          </motion.div>

          <motion.div style={{ y: heroPhotoY }}>
            <Reveal from="right" index={1}>
              <ParallaxPhoto
                src={IMG.hero}
                alt="A phlebotomist taking a blood sample from a seated patient in her own living room"
                className="photo-hero"
                priority
              />
            </Reveal>
          </motion.div>
        </div>
      </header>

      {/* ===== ABOUT ===== */}
      <section id="about" className="wrap">
        <div className="split split-top">
          <Reveal>
            <div>
              <SpecimenLabel section={section("about")} />
              <h2 style={{ fontSize: "var(--fs-display)", marginBottom: 16, maxWidth: "14em", textWrap: "balance" }}>Every drop tells a story.</h2>
              <p style={{ fontSize: "var(--fs-body)", color: "var(--color-text-secondary)", maxWidth: "52ch" }}>
                Home Visit connects patients in Cardiff and South Wales with a
                phlebotomist who comes to them. The sample goes to a laboratory
                for analysis, and the result comes back as a report you can
                download from your account.
              </p>
            </div>
          </Reveal>
          <Reveal from="left" index={1}>
            <ParallaxPhoto
              src={IMG.tube}
              alt="A gloved hand holding a labelled blood sample tube"
              className="photo-tall"
              strength={12}
            />
          </Reveal>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="wrap">
        <Reveal>
          <div className="head">
            <SpecimenLabel section={section("features")} />
            <h2>What you get.</h2>
            <p>Everything the service does, and nothing it does not.</p>
          </div>
        </Reveal>
        <div className="cards">
          {features.map((f, i) => (
            <Reveal key={f.title} index={i} from="scale">
              <article className="card" style={{ "--tint": CAP[f.tint] }}>
                <span className="card-icon" aria-hidden="true">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section id="process" className="wrap">
        <Reveal>
          <div className="head">
            <SpecimenLabel section={section("process")} />
            <h2>Four steps. One report.</h2>
          </div>
        </Reveal>
        <div className="steps">
          {process.map((p, i) => (
            <Reveal key={p.step} index={i} from="left">
              <div className="step" style={{ "--tint": CAP[p.tint] }}>
                <span className="step-n">{p.step}</span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== BAND ===== */}
      <div className="band">
        <ParallaxPhoto
          src={IMG.lab}
          alt="A laboratory technician preparing blood samples for analysis"
          strength={14}
        />
        <div className="band-veil" />
        <div className="wrap band-in">
          <Reveal>
            <div>
              <h2>Collected at home. Processed in a laboratory.</h2>
              <p>
                Your sample is taken at your address and sent to a laboratory
                for analysis. You can follow each stage from your account.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ===== ROLES ===== */}
      <section id="roles" className="wrap">
        <Reveal>
          <div className="head">
            <SpecimenLabel section={section("roles")} />
            <h2>Four roles, one system.</h2>
            <p>Each role sees only what it needs.</p>
          </div>
        </Reveal>
        <div className="roles">
          {roles.map((r, i) => (
            <Reveal key={r.title} index={i} from="scale">
              <div className="role" style={{ "--tint": CAP[r.tint] }}>
                <span className="role-badge" aria-hidden="true">{r.initials}</span>
                <div>
                  <h3>{r.title}</h3>
                  <p>{r.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== LIFECYCLE ===== */}
      <section id="booking" className="wrap">
        <Reveal>
          <div className="head">
            <SpecimenLabel section={section("booking")} />
            <h2>How a booking moves.</h2>
            <p>The five states the software tracks, start to finish.</p>
          </div>
        </Reveal>
        <div className="flow">
          {lifecycle.map((l, i) => (
            <Reveal key={l.step} index={i} from="up">
              <div className="flow-item" style={{ "--tint": CAP[l.tint] }}>
                <b>{l.step}</b>
                <h3>{l.title}</h3>
                <p>{l.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="wrap">
        <Reveal>
          <div className="head">
            <SpecimenLabel section={section("faq")} />
            <h2>Common questions.</h2>
          </div>
        </Reveal>
        <div>
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            const last = i === faqs.length - 1;
            return (
              <Reveal key={f.q} index={i}>
                <div className={`faq${isOpen ? " open" : ""}${last ? " last" : ""}`}>
                  <button className="faq-q" onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen}>
                    {f.q}<span className="faq-sign" aria-hidden="true">+</span>
                  </button>
                  <motion.div
                    className="faq-a"
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: rich ? 0.24 : 0, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p>{f.a}</p>
                  </motion.div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="contact" className="wrap">
        <Reveal from="scale">
          <div className="cta">
            <div className="cta-in">
              <SpecimenLabel section={section("contact")} />
              <h2>Ready when you are.</h2>
              <p>
                Create an account, choose your tests and pick a time. We will
                tell you straight away whether we cover your postcode.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="b b-pri" onClick={() => navigate("/login")}>Book a test →</button>
                <button className="b b-sec" onClick={() => go("faq")}>Read the FAQ</button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      </main>

      {/* ===== FOOTER ===== */}
      <footer className="foot">
        <div className="wrap foot-row">
          <img className="foot-logo" src={IMG.logo} alt="Home Visit Mobile Lab logo" loading="lazy" decoding="async" />
          <div>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
          <small>© 2026 Home Visit · Cardiff, Wales</small>
        </div>
      </footer>
    </div>
  );
}
