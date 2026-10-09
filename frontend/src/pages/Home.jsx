import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRichMotion } from "../hooks/useRichMotion";
import {
  motion, AnimatePresence, useScroll, useSpring, useTransform,
} from "framer-motion";

/**
 * Home Visit — landing page (colour + parallax edition).
 *
 * PHOTOS live in  frontend/public/images/  as:
 *   image1.jpg   → hero (right column)
 *   image 2.jpg  → about section
 *   image 3.jpg  → full-width band above the stats
 *   image 4.jpg  → contact card background
 * A missing file falls back to a labelled placeholder.
 */

const SECTIONS = [
  { id: "hero",     code: "HV-01", name: "Home",     cap: "crimson"  },
  { id: "about",    code: "HV-02", name: "About",    cap: "lavender" },
  { id: "features", code: "HV-03", name: "Services", cap: "teal"     },
  { id: "process",  code: "HV-04", name: "Process",  cap: "gold"     },
  { id: "stats",    code: "HV-05", name: "Numbers",  cap: "crimson"  },
  { id: "reviews",  code: "HV-06", name: "Reviews",  cap: "lavender" },
  { id: "team",     code: "HV-07", name: "Team",     cap: "teal"     },
  { id: "faq",      code: "HV-08", name: "FAQ",      cap: "gold"     },
  { id: "contact",  code: "HV-09", name: "Contact",  cap: "crimson"  },
];

const CAP = { crimson: "#C9603A", lavender: "#6E6AA8", gold: "#B8862E", teal: "#0F6E62" };

export default function Home() {
  const navigate = useNavigate();
  const [active, setActive] = useState("hero");
  const [open, setOpen] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Single gate for the rich motion. False on narrow viewports, touch
  // devices and when reduced motion is requested — see useRichMotion.
  const rich = useRichMotion();

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  /*
   * Global parallax layers.
   *
   * Hooks must run unconditionally, so the transforms are always created;
   * `depth` collapses their range to zero when rich motion is off. That
   * keeps the subscription cheap instead of animating elements the CSS has
   * already hidden on mobile.
   */
  const depth  = rich ? 1 : 0;
  const blobA  = useTransform(scrollY, [0, 4000], [0,  620 * depth]);
  const blobB  = useTransform(scrollY, [0, 4000], [0, -480 * depth]);
  const blobC  = useTransform(scrollY, [0, 4000], [0,  300 * depth]);
  const cellsY = useTransform(scrollY, [0, 4000], [0, -900 * depth]);

  // Hero parallax — text sinks, image rises, both fade out on scroll.
  const heroTextY = useTransform(scrollY, [0, 700], [0,  110 * depth]);
  const heroImgY  = useTransform(scrollY, [0, 700], [0,  -70 * depth]);
  const heroFade  = useTransform(scrollY, [0, 560], [1, 0]);

  // Desktop-only extras: the hero image settles back as you scroll past,
  // and the backdrop drifts sideways so the depth reads on a wide screen.
  const heroScale = useTransform(scrollY, [0, 700], [1, rich ? 1.06 : 1]);
  const driftX    = useTransform(scrollY, [0, 4000], [0, rich ? 160 : 0]);

  useEffect(() => {
    let ticking = false;
    const checkSections = () => {
      ticking = false;
      SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight / 2 && r.bottom > window.innerHeight / 2) setActive(id);
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(checkSections);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    checkSections();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMove = (e) =>
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  // ============== CONTENT ==============
  /*
   * COPY RULES FOR THIS PAGE
   * Do not state or imply that this service, any laboratory or any member
   * of staff is accredited, registered, certified or compliant with any
   * standard or regulation. Those are claims only the business can make,
   * and only once they are true and evidenced.
   *
   * Anything that cannot be verified from the codebase is marked
   * [PLACEHOLDER - add only if true] and must be either substantiated or
   * deleted before this page goes live.
   */
  const PH = "[PLACEHOLDER - add only if true]";

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

  // Figures must come from real data before this block is shown publicly.
  const stats = [
    { value: PH, tint: "crimson",  label: "Patients served"   },
    { value: PH, tint: "gold",     label: "Average rating"    },
    { value: PH, tint: "teal",     label: "Report turnaround" },
    { value: "6", tint: "lavender", label: "Test panels"      },
  ];

  // Illustrative sample content only — not real patient feedback.
  // Replace with genuine, consented testimonials or delete this section.
  const reviews = [
    { name: `Sample review ${PH}`, role: "Patient, Cardiff",  text: "Example testimonial text. Replace with a genuine, consented review before launch.", stars: 5, tint: "crimson"  },
    { name: `Sample review ${PH}`, role: "Patient, Newport",  text: "Example testimonial text. Replace with a genuine, consented review before launch.", stars: 5, tint: "teal"     },
    { name: `Sample review ${PH}`, role: "Patient, Barry",    text: "Example testimonial text. Replace with a genuine, consented review before launch.", stars: 5, tint: "lavender" },
  ];

  // Illustrative placeholders — replace with real, named staff or delete.
  const team = [
    { name: PH, role: "Lead Pathologist",     initials: "—", tint: "crimson"  },
    { name: PH, role: "Head of Phlebotomy",   initials: "—", tint: "lavender" },
    { name: PH, role: "Technology Lead",      initials: "—", tint: "teal"     },
    { name: PH, role: "Quality Assurance",    initials: "—", tint: "gold"     },
  ];

  const faqs = [
    { q: "How early can I book a slot?",       a: "You can book up to 7 days in advance. Same-day slots may be available depending on phlebotomist availability." },
    { q: "What are the phlebotomists' qualifications?", a: `Details of our phlebotomists' training and registration: ${PH}` },
    { q: "How long will my report take?",      a: `Expected turnaround for each test is shown when you book. Service-level commitments: ${PH}` },
    { q: "Do you cover my area?",              a: "We currently visit postcodes starting CF, covering Cardiff and the surrounding South Wales area. Enter your postcode when booking and we will tell you straight away if we can reach you." },
    { q: "How is my health information handled?", a: "We handle your health information in line with our Privacy Policy, which explains what we collect, why, and how long we keep it." },
  ];

  const ticker = [
    "Home collection", "Digital reports", "Barcode reference", "Cardiff & South Wales",
    "CF postcodes", "Routine blood panels", "Track your booking",
  ];

  return (
    <div className="hv">
      <motion.div className="hv-progress" style={{ scaleX: progress }} />

      {/* ============ FIXED PARALLAX BACKDROP ============ */}
      <motion.div className="blob blob-a" style={{ y: blobA, x: driftX }} />
      <motion.div className="blob blob-b" style={{ y: blobB }} />
      <motion.div className="blob blob-c" style={{ y: blobC, x: driftX }} />
      <motion.div className="cells" style={{ y: cellsY }} aria-hidden="true">
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="cell-dot"
            style={{
              left: `${(i * 61) % 97}%`,
              top: `${(i * 137) % 100 + 8}%`,
              width: 8 + (i % 4) * 5,
              height: 8 + (i % 4) * 5,
              animationDelay: `${(i % 6) * 0.8}s`,
              opacity: 0.15 + (i % 3) * 0.08,
            }}
          />
        ))}
      </motion.div>
      <div
        className="cursor-glow"
        style={{ transform: `translate(${mouse.x * 40}px, ${mouse.y * 40}px)` }}
      />

      <style>{`
        .hv {
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

          --display: "Playfair Display", Georgia, serif;
          --sans:    "DM Sans", system-ui, -apple-system, sans-serif;
          --mono:    "DM Mono", ui-monospace, "SF Mono", monospace;

          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
          overflow-x: hidden;
          position: relative;
        }

        .hv *, .hv *::before, .hv *::after { margin:0; padding:0; box-sizing:border-box; }
        .hv :focus-visible { outline: 2px solid var(--crimson); outline-offset: 3px; }

        .hv .hv-progress {
          position: fixed; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--crimson), var(--gold), var(--teal), var(--lavender));
          transform-origin: 0 50%; z-index: 300;
        }

        /* ---------- parallax backdrop ---------- */
        .hv .blob {
          position: fixed; border-radius: 50%; filter: blur(90px);
          pointer-events: none; z-index: 0;
        }
        .hv .blob-a {
          width: 640px; height: 640px; top: -180px; right: -160px;
          background: radial-gradient(circle, rgba(201,96,58,0.22), transparent 65%);
        }
        .hv .blob-b {
          width: 560px; height: 560px; top: 45%; left: -200px;
          background: radial-gradient(circle, rgba(28,122,107,0.20), transparent 65%);
        }
        .hv .blob-c {
          width: 520px; height: 520px; bottom: -220px; right: 10%;
          background: radial-gradient(circle, rgba(124,107,174,0.20), transparent 65%);
        }
        .hv .cells { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .hv .cell-dot {
          position: absolute; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #D47A58, var(--crimson));
          animation: bob 7s ease-in-out infinite alternate;
        }
        @keyframes bob {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-26px) scale(1.08); }
        }
        .hv .cursor-glow {
          position: fixed; top: 50%; left: 50%;
          width: 700px; height: 700px; margin: -350px 0 0 -350px;
          background: radial-gradient(circle, rgba(184,137,46,0.10), transparent 65%);
          border-radius: 50%; pointer-events: none; z-index: 0;
          transition: transform .2s var(--ease);
        }

        /* ---------- type ---------- */
        .hv h1 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(48px, 7.4vw, 100px);
          line-height: 0.93; letter-spacing: -0.02em;
        }
        .hv h2 {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(31px, 4.6vw, 58px);
          line-height: 1.04; letter-spacing: -0.015em;
        }
        .hv h3 { font-family: var(--sans); font-weight: 700; font-size: 17px; letter-spacing: -0.01em; }
        .hv p { color: var(--ink-60); font-size: 15px; line-height: 1.7; }
        .hv .lead { font-size: clamp(16px, 1.6vw, 19px); line-height: 1.65; color: var(--ink-60); }

        /* ---------- layout ---------- */
        .hv .wrap { max-width: 1180px; margin: 0 auto; position: relative; }
        .hv .sec  { padding: clamp(84px, 11vw, 156px) 6vw; position: relative; z-index: 1; }
        .hv .sec + .sec { border-top: 1px solid var(--rule); }

        /* section colour washes */
        .hv .wash-lavender { background: linear-gradient(180deg, rgba(124,107,174,0.09), transparent 55%); }
        .hv .wash-teal     { background: linear-gradient(180deg, rgba(28,122,107,0.09), transparent 55%); }
        .hv .wash-gold     { background: linear-gradient(180deg, rgba(184,137,46,0.10), transparent 55%); }
        .hv .wash-crimson  { background: linear-gradient(180deg, rgba(201,96,58,0.07), transparent 55%); }

        /* ghost watermark behind each section */
        .hv .ghost {
          position: absolute; top: 26px; right: 0;
          font-family: var(--display); font-weight: 900;
          font-size: clamp(70px, 12vw, 170px); line-height: 1;
          color: transparent;
          -webkit-text-stroke: 1px rgba(22,33,31,0.10);
          user-select: none; pointer-events: none; white-space: nowrap;
        }

        /* ---------- specimen label ---------- */
        .hv .label {
          display: inline-flex; align-items: stretch;
          border: 1px solid var(--rule); border-radius: 3px;
          background: var(--card); overflow: hidden; margin-bottom: 26px;
          box-shadow: 0 2px 10px rgba(22,33,31,0.05);
        }
        .hv .label-cap  { width: 9px; }
        .hv .cap-crimson  { background: var(--crimson); }
        .hv .cap-lavender { background: var(--lavender); }
        .hv .cap-gold     { background: var(--gold); }
        .hv .cap-teal     { background: var(--teal); }
        .hv .label-body { padding: 7px 12px 7px 11px; display: flex; align-items: center; gap: 12px; }
        .hv .label-code {
          font-family: var(--mono); font-size: 11px; font-weight: 500;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink);
        }
        .hv .label-name {
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40);
        }
        .hv .barcode {
          width: 46px; align-self: stretch; min-height: 16px; opacity: .75;
          background-image: repeating-linear-gradient(90deg,
            var(--ink) 0 1px, transparent 1px 3px,
            var(--ink) 3px 5px, transparent 5px 6px,
            var(--ink) 6px 7px, transparent 7px 10px);
        }

        /* ---------- buttons ---------- */
        .hv .btn {
          font-family: var(--sans); font-size: 14px; font-weight: 700;
          padding: 13px 26px; border-radius: var(--radius-md); cursor: pointer;
          border: 1px solid transparent;
          transition: background var(--dur-instant) var(--ease),
                      border-color var(--dur-instant) var(--ease),
                      color var(--dur-instant) var(--ease);
        }
        /* Hover changes colour only — no lift. */
        .hv .btn-primary {
          background: var(--color-bg-primary); color: var(--color-text-on-primary);
        }
        .hv .btn-primary:hover { background: var(--color-bg-primary-hover); }
        .hv .btn-ghost { background: transparent; color: var(--color-text-primary); border-color: var(--color-border-strong); }
        .hv .btn-ghost:hover { background: var(--color-bg-subtle); border-color: var(--color-border-focus); }

        /* ---------- nav ---------- */
        .hv .nav {
          position: fixed; top: 0; left: 0; right: 0; height: 66px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 6vw; z-index: 200;
          background: rgba(243,240,234,0.86);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--rule);
        }
        .hv .brand {
          display: flex; align-items: center; gap: 9px;
          font-family: var(--mono); font-weight: 500; font-size: 13px;
          letter-spacing: 0.22em; text-transform: uppercase;
        }
        .hv .brand-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #D47A58, var(--crimson));
          flex-shrink: 0; animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,96,58,0.35); }
          50%      { box-shadow: 0 0 0 7px rgba(201,96,58,0); }
        }
        .hv .nav-links { display: flex; gap: 26px; }
        .hv .nav-link {
          background: none; border: none; cursor: pointer;
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--ink-40); padding: 4px 0;
          border-bottom: 1px solid transparent; transition: color .2s, border-color .2s;
        }
        .hv .nav-link:hover { color: var(--ink); }
        .hv .nav-link.on { color: var(--ink); border-bottom-color: var(--crimson); }
        .hv .burger { display: none; background: none; border: none; font-size: 19px; cursor: pointer; color: var(--ink); }

        .hv .overlay { position: fixed; inset: 0; background: rgba(22,33,31,0.45); z-index: 240; }
        .hv .drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 285px; z-index: 250;
          background: var(--paper); border-right: 1px solid var(--rule);
          padding: 26px 22px; display: flex; flex-direction: column; gap: 4px;
        }
        .hv .drawer-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 13px 4px; border: none; border-bottom: 1px solid var(--rule);
          font-family: var(--mono); font-size: 12px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-60);
          background: none; width: 100%; cursor: pointer; text-align: left;
        }
        .hv .drawer-item.on { color: var(--crimson); }

        /* ---------- ticker ---------- */
        .hv .ticker {
          border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
          background: var(--ink); overflow: hidden; position: relative; z-index: 1;
        }
        .hv .ticker-track {
          display: flex; gap: 0; width: max-content;
          animation: slide 26s linear infinite;
        }
        @keyframes slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .hv .ticker-item {
          display: flex; align-items: center; gap: 18px;
          padding: 13px 26px;
          font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(243,240,234,0.85); white-space: nowrap;
        }
        .hv .ticker-item::after { content: "·"; color: var(--gold); font-size: 16px; }

        /* ---------- photo plates ---------- */
        .hv .plate { position: relative; }
        .hv .plate-frame {
          position: relative; overflow: hidden;
          border: 1px solid var(--rule); border-radius: 4px;
          box-shadow: 0 22px 50px rgba(22,33,31,0.16);
        }
        .hv .plate-img {
          width: 100%; height: 100%; display: block; object-fit: cover;
          transform: scale(1.12); /* headroom for parallax drift */
        }
        .hv .plate-tape {
          position: absolute; top: -1px; left: 18px;
          padding: 5px 12px; z-index: 2;
          font-family: var(--mono); font-size: 10px; letter-spacing: .14em;
          text-transform: uppercase; color: #fff;
          border-radius: 0 0 3px 3px;
        }
        .hv .plate-cap {
          display: flex; align-items: center; gap: 8px; margin-top: 12px;
          font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--ink-40);
        }
        .hv .plate-cap::before { content: ""; width: 16px; height: 1px; background: var(--ink-40); }
        .hv .ph {
          width: 100%; height: 100%; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
          border: 1px dashed var(--ink-40); border-radius: 4px;
          background: var(--card); color: var(--ink-40);
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
          text-align: center; padding: 20px;
        }

        /* ---------- hero ---------- */
        .hv .hero { padding-top: clamp(122px, 15vw, 190px); }
        .hv .hero-grid {
          display: grid; grid-template-columns: 1.05fr 0.95fr;
          gap: clamp(30px, 5vw, 70px); align-items: center;
        }
        .hv .hero-frame { height: clamp(350px, 47vw, 540px); }
        .hv .hero-word { position: relative; display: inline-block; }
        .hv .hero-word::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: 7%;
          height: 0.28em; background: rgba(201,96,58,0.18); z-index: -1;
          transform: skewX(-8deg);
        }
        .hv .hero-meta {
          display: flex; gap: 30px; margin-top: 42px;
          padding-top: 22px; border-top: 1px solid var(--rule); flex-wrap: wrap;
        }
        .hv .hero-meta-item { display: flex; flex-direction: column; gap: 3px; }
        .hv .hero-meta-v { font-family: var(--display); font-size: 27px; font-weight: 900; }
        .hv .hero-meta-l {
          font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--ink-40);
        }

        /* ---------- about ---------- */
        .hv .about-grid {
          display: grid; grid-template-columns: 0.95fr 1.05fr;
          gap: clamp(30px, 5vw, 70px); align-items: center;
        }
        .hv .about-frame { height: clamp(310px, 41vw, 470px); }

        /* ---------- features ---------- */
        .hv .grid-3 {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: var(--rule);
          border: 1px solid var(--rule); border-radius: 4px;
          margin-top: 52px; overflow: hidden;
        }
        .hv .cell {
          background: var(--card); padding: 34px 28px; position: relative;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .hv .cell::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--tint, var(--crimson));
          transform: scaleX(0); transform-origin: 0 50%;
          transition: transform .18s var(--ease);
        }
        .hv .cell:hover { box-shadow: 0 16px 34px rgba(22,33,31,0.12); z-index: 2; }
        .hv .cell:hover::before { transform: scaleX(1); }
        .hv .cell-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 21px; margin-bottom: 16px;
          background: color-mix(in srgb, var(--tint, var(--crimson)) 14%, transparent);
        }
        .hv .cell h3 { margin-bottom: 8px; }

        /* ---------- process ---------- */
        .hv .steps { margin-top: 52px; counter-reset: step; }
        .hv .step {
          display: grid; grid-template-columns: 92px 1fr; gap: 24px;
          padding: 30px 22px; align-items: start; border-radius: 4px;
          border: 1px solid transparent; border-bottom-color: var(--rule);
          transition: background .25s ease, border-color .25s ease, transform .25s ease;
        }
        .hv .step:hover {
          background: var(--card); border-color: var(--rule);
          transform: translateX(6px);
        }
        .hv .step-n {
          font-family: var(--display); font-weight: 900; font-size: 40px;
          line-height: 1; color: var(--tint, var(--crimson)); opacity: .85;
        }
        .hv .step h3 { margin-bottom: 6px; font-size: 19px; }

        /* ---------- band ---------- */
        .hv .band {
          position: relative; height: clamp(300px, 42vw, 480px);
          overflow: hidden; border-top: 1px solid var(--rule); z-index: 1;
        }
        .hv .band-img {
          position: absolute; inset: -18% 0; width: 100%; height: 136%;
          object-fit: cover; display: block;
        }
        .hv .band-veil {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(22,33,31,0.85), rgba(201,96,58,0.45));
          display: flex; align-items: center; padding: 0 6vw;
        }
        .hv .band-veil h2 { color: #fff; max-width: 640px; }
        .hv .band-veil p  { color: rgba(255,255,255,0.75); max-width: 480px; margin-top: 14px; }

        /* ---------- stats ---------- */
        .hv .stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 22px; margin-top: 52px;
        }
        .hv .stat {
          background: var(--card); padding: 36px 26px;
          border: 1px solid var(--rule); border-radius: 4px;
          border-top: 4px solid var(--tint, var(--crimson));
          box-shadow: 0 10px 26px rgba(22,33,31,0.07);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .hv .stat:hover { box-shadow: 0 18px 38px rgba(22,33,31,0.13); }
        .hv .stat-v {
          font-family: var(--display); font-weight: 900;
          font-size: clamp(40px, 5vw, 62px); line-height: 1; letter-spacing: -0.02em;
          color: var(--tint, var(--ink));
        }
        .hv .stat-l {
          font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--ink-40); margin-top: 10px;
        }

        /* ---------- reviews ---------- */
        .hv .quotes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 52px; }
        .hv .quote {
          background: var(--card); border: 1px solid var(--rule);
          border-left: 4px solid var(--tint, var(--crimson));
          border-radius: 4px; padding: 30px 26px;
          display: flex; flex-direction: column; justify-content: space-between; gap: 22px;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .hv .quote:hover { box-shadow: 0 18px 38px rgba(22,33,31,0.12); }
        .hv .quote-text {
          font-family: var(--display); font-size: 19px; line-height: 1.45;
          color: var(--ink); font-weight: 700;
        }
        .hv .quote-who { display: flex; align-items: center; gap: 11px; }
        .hv .quote-badge {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          background: var(--tint, var(--ink)); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 12px;
        }
        .hv .quote-stars { color: var(--gold); font-size: 12px; letter-spacing: 2px; }

        /* ---------- team ---------- */
        .hv .team-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 52px; }
        .hv .member {
          border-top: 3px solid var(--tint, var(--ink)); padding: 20px 18px;
          background: var(--card); border-radius: 0 0 4px 4px;
          border-left: 1px solid var(--rule); border-right: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .hv .member:hover { box-shadow: 0 16px 34px rgba(22,33,31,0.11); }
        .hv .member-in {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 13px; color: #fff;
          background: var(--tint, var(--ink)); margin-bottom: 14px;
        }
        .hv .member h3 { margin-bottom: 4px; font-size: 15px; }
        .hv .member p { font-size: 13px; }

        /* ---------- faq ---------- */
        .hv .faqs { margin-top: 46px; border-top: 1px solid var(--rule); }
        .hv .faq {
          border: none; border-bottom: 1px solid var(--rule); cursor: pointer;
          padding: 22px 8px; width: 100%; text-align: left; background: none;
          transition: background .2s ease;
        }
        .hv .faq:hover { background: rgba(22,33,31,0.03); }
        .hv .faq-q {
          display: flex; justify-content: space-between; align-items: center; gap: 18px;
          font-family: var(--sans); font-weight: 700; font-size: 16px; color: var(--ink);
        }
        .hv .faq-sign { font-family: var(--mono); font-size: 18px; color: var(--crimson); flex-shrink: 0; }
        .hv .faq-a { overflow: hidden; }
        .hv .faq-a p { padding-top: 12px; max-width: 640px; }

        /* ---------- contact ---------- */
        .hv .contact {
          position: relative; overflow: hidden; border-radius: 6px;
          border: 1px solid var(--rule); margin-top: 46px;
          box-shadow: 0 30px 70px rgba(22,33,31,0.22);
        }
        .hv .contact-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .hv .contact-in {
          position: relative;
          background: linear-gradient(120deg, rgba(22,33,31,0.92), rgba(201,96,58,0.78));
          padding: clamp(48px, 8vw, 92px) 6vw; text-align: center;
        }
        .hv .contact-in h2 { color: #fff; }
        .hv .contact-in p  { color: rgba(255,255,255,0.72); max-width: 520px; margin: 14px auto 0; }
        .hv .contact-row { display: flex; justify-content: center; gap: 34px; flex-wrap: wrap; margin-top: 34px; }
        .hv .contact-item {
          font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em;
          color: rgba(255,255,255,0.88);
        }
        .hv .contact-in .label { background: transparent; border-color: rgba(255,255,255,0.3); box-shadow: none; }
        .hv .contact-in .label-code { color: #fff; }
        .hv .contact-in .label-name { color: rgba(255,255,255,0.55); }
        .hv .contact-in .barcode {
          background-image: repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 3px,
            #fff 3px 5px, transparent 5px 6px, #fff 6px 7px, transparent 7px 10px);
        }
        .hv .contact-in .btn-primary { background: var(--color-bg-surface); color: var(--color-bg-primary); }
        .hv .contact-in .btn-primary:hover { background: var(--paper); }

        /* ---------- footer ---------- */
        .hv .foot {
          padding: 34px 6vw; border-top: 1px solid var(--rule);
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap; position: relative; z-index: 1;
        }
        .hv .foot p { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; }

        /* ---------- responsive ---------- */
        @media (max-width: 1000px) {
          .hv .nav-links { display: none; }
          .hv .burger { display: block; }
          .hv .hero-grid, .hv .about-grid { grid-template-columns: 1fr; }
          .hv .grid-3, .hv .quotes { grid-template-columns: repeat(2, 1fr); }
          .hv .team-row, .hv .stats-row { grid-template-columns: repeat(2, 1fr); }
          .hv .ghost { font-size: clamp(56px, 14vw, 120px); }
        }
        @media (max-width: 640px) {
          .hv .grid-3, .hv .quotes, .hv .team-row, .hv .stats-row { grid-template-columns: 1fr; }
          .hv .step { grid-template-columns: 56px 1fr; padding: 24px 10px; }
          .hv .step-n { font-size: 28px; }
          .hv .band-veil { background: rgba(22,33,31,0.74); }
          .hv .ghost { display: none; }
        }

        /* ---------- mobile perf: drop GPU-heavy fixed blur layers ---------- */
        @media (max-width: 780px), (hover: none) and (pointer: coarse) {
          .hv .blob, .hv .cells, .hv .cursor-glow { display: none; }
          .hv .nav { backdrop-filter: none; background: rgba(243,240,234,0.97); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hv * { animation: none !important; transition: none !important; }
          .hv .btn:hover, .hv .cell:hover, .hv .stat:hover,
          .hv .quote:hover, .hv .member:hover, .hv .step:hover { transform: none; }
          .hv .ticker-track { animation: none !important; }
        }
      `}</style>

      {/* ================= NAV ================= */}
      <nav className="nav">
        <button className="burger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <div className="brand"><span className="brand-dot" />Home Visit</div>
        <div className="nav-links">
          {SECTIONS.slice(1, 6).map((s) => (
            <button key={s.id} className={`nav-link ${active === s.id ? "on" : ""}`} onClick={() => scrollTo(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>Book a test</button>
      </nav>

      {/* ================= DRAWER ================= */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="overlay" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="drawer"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <div className="brand" style={{ marginBottom: 22 }}><span className="brand-dot" />Home Visit</div>
              {SECTIONS.map((s) => (
                <button key={s.id} className={`drawer-item ${active === s.id ? "on" : ""}`} onClick={() => scrollTo(s.id)}>
                  <span>{s.name}</span>
                  <span style={{ fontSize: 10, color: CAP[s.cap] }}>{s.code}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= HERO ================= */}
      <section id="hero" className="sec hero">
        <div className="wrap hero-grid">
          <motion.div style={{ y: heroTextY, opacity: heroFade }}>
            <Reveal>
              <SpecimenLabel section={SECTIONS[0]} />
              <h1>
                Hospital care,<br />drawn at<br />
                <span className="hero-word" style={{ color: "var(--crimson)" }}>your door.</span>
              </h1>
              <p className="lead" style={{ marginTop: 22, maxWidth: 460 }}>
                A certified phlebotomist comes to your home, collects the sample, and your
                verified report lands in the app within hours. No queues, no waiting rooms.
              </p>
              <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={() => navigate("/login")}>Book a test</button>
                <button className="btn btn-ghost" onClick={() => scrollTo("process")}>See how it works</button>
              </div>
              <div className="hero-meta">
                <div className="hero-meta-item"><span className="hero-meta-v">2h</span><span className="hero-meta-l">Report time</span></div>
                <div className="hero-meta-item"><span className="hero-meta-v">200+</span><span className="hero-meta-l">Test panels</span></div>
                <div className="hero-meta-item"><span className="hero-meta-v">Cardiff</span><span className="hero-meta-l">& South Wales</span></div>
              </div>
            </Reveal>
          </motion.div>

          <motion.div style={{ y: heroImgY, scale: heroScale }}>
            <Reveal delay={0.1} from="right">
              <ParallaxPlate
                src="/images/image1.jpg"
                alt="A Home Visit phlebotomist collecting a sample at a patient's home"
                caption="Plate 01 — Home collection"
                frameClass="hero-frame" slot="image1.jpg"
                tape="Specimen 01" tint={CAP.crimson}
                eager
              />
            </Reveal>
          </motion.div>
        </div>
      </section>

      {/* ================= TICKER ================= */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...ticker, ...ticker].map((t, i) => (
            <span className="ticker-item" key={i}>{t}</span>
          ))}
        </div>
      </div>

      {/* ================= ABOUT ================= */}
      <section id="about" className="sec wash-lavender">
        <span className="ghost">About</span>
        <div className="wrap about-grid">
          <Reveal>
            <ParallaxPlate
              src="/images/image 2.jpg"
              alt="Samples being processed in an accredited laboratory"
              caption="Plate 02 — Accredited lab"
              frameClass="about-frame" slot="image 2.jpg"
              tape="Specimen 02" tint={CAP.lavender}
            />
          </Reveal>
          <Reveal delay={0.1} from="right">
            <SpecimenLabel section={SECTIONS[1]} />
            <h2>Every drop tells a story. We make sure it reaches you.</h2>
            <p className="lead" style={{ margin: "20px 0 16px" }}>
              Home Visit brings blood sample collection to your home across Cardiff and South Wales, and sends your sample to a laboratory for processing.
            </p>
            <p>
              From a routine full blood count to advanced hormone profiles, every sample is barcoded at
              your door, tracked through the lab, and verified by a technician before the report is
              released to you. You can follow each stage from your phone.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="sec wash-teal">
        <span className="ghost">Services</span>
        <div className="wrap">
          <Reveal>
            <SpecimenLabel section={SECTIONS[2]} />
            <h2>What you get.</h2>
            <p className="lead" style={{ marginTop: 16, maxWidth: 560 }}>
              Six things we hold ourselves to on every single booking.
            </p>
          </Reveal>
          <div className="grid-3">
            {features.map((f, i) => (
              <Reveal key={f.title} index={i} from="scale">
                <div className="cell" style={{ "--tint": CAP[f.tint] }}>
                  <span className="cell-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROCESS ================= */}
      <section id="process" className="sec wash-gold">
        <span className="ghost">Process</span>
        <div className="wrap">
          <Reveal>
            <SpecimenLabel section={SECTIONS[3]} />
            <h2>Four steps. One report.</h2>
          </Reveal>
          <div className="steps">
            {process.map((p, i) => (
              <Reveal key={p.step} index={i} from="left">
                <div className="step" style={{ "--tint": CAP[p.tint] }}>
                  <div className="step-n">{p.step}</div>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BAND ================= */}
      <ParallaxBand
        src="/images/image 3.jpg"
        alt="Home Visit phlebotomists on a home visit"
        slot="image 3.jpg"
      >
        <h2>Booked at 8am.<br />Results before lunch.</h2>
        <p>Standard panels are guaranteed within four hours — or the test is on us.</p>
      </ParallaxBand>

      {/* ================= STATS ================= */}
      <section id="stats" className="sec wash-crimson">
        <span className="ghost">Numbers</span>
        <div className="wrap">
          <Reveal>
            <SpecimenLabel section={SECTIONS[4]} />
            <h2>Serving Cardiff and South Wales.</h2>
          </Reveal>
          <div className="stats-row">
            {stats.map((s, i) => (
              <Reveal key={s.label} index={i} from="scale">
                <div className="stat" style={{ "--tint": CAP[s.tint] }}>
                  <div className="stat-v">{s.value}</div>
                  <div className="stat-l">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= REVIEWS ================= */}
      <section id="reviews" className="sec wash-lavender">
        <span className="ghost">Reviews</span>
        <div className="wrap">
          <Reveal>
            <SpecimenLabel section={SECTIONS[5]} />
            <h2>What patients say.</h2>
          </Reveal>
          <div className="quotes">
            {reviews.map((r, i) => (
              <Reveal key={r.name} index={i} from="up">
                <div className="quote" style={{ "--tint": CAP[r.tint] }}>
                  <div>
                    <div className="quote-stars">{"★".repeat(r.stars)}</div>
                    <p className="quote-text" style={{ marginTop: 14 }}>{r.text}</p>
                  </div>
                  <div className="quote-who">
                    <div className="quote-badge">{r.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-40)" }}>{r.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TEAM ================= */}
      <section id="team" className="sec wash-teal">
        <span className="ghost">Team</span>
        <div className="wrap">
          <Reveal>
            <SpecimenLabel section={SECTIONS[6]} />
            <h2>Behind every report.</h2>
          </Reveal>
          <div className="team-row">
            {team.map((t, i) => (
              <Reveal key={t.name} index={i} from="scale">
                <div className="member" style={{ "--tint": CAP[t.tint] }}>
                  <div className="member-in">{t.initials}</div>
                  <h3>{t.name}</h3>
                  <p>{t.role}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="sec wash-gold">
        <span className="ghost">FAQ</span>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <Reveal>
            <SpecimenLabel section={SECTIONS[7]} />
            <h2>Common questions.</h2>
          </Reveal>
          <div className="faqs">
            {faqs.map((f, i) => (
              <Faq key={f.q} q={f.q} a={f.a} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section id="contact" className="sec">
        <div className="wrap">
          <div className="contact">
            <BgImage src="/images/image 4.jpg" slot="image 4.jpg" className="contact-bg" />
            <div className="contact-in">
              <SpecimenLabel section={SECTIONS[8]} />
              <h2>Ready when you are.</h2>
              <p>
                Book your first home blood test today, or send us a question.
                We usually reply within the hour.
              </p>
              <div className="contact-row">
                <span className="contact-item">support@homevisit.com</span>
                <span className="contact-item">+44 7565 20619</span>
                <span className="contact-item">Cardiff, Wales</span>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 34, padding: "15px 34px", fontSize: 15 }}
                onClick={() => navigate("/login")}>
                Book a test
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="foot">
        <div className="brand"><span className="brand-dot" />Home Visit</div>
        <p style={{ marginBottom: 10 }}>
          <Link to="/privacy" style={{ color: "inherit", textDecoration: "underline", marginRight: 16 }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms of Service</Link>
        </p>
        <p>© 2026 Home Visit — built with care in Cardiff.</p>
      </footer>
    </div>
  );
}

/* ============== specimen label ============== */
function SpecimenLabel({ section }) {
  return (
    <div className="label">
      <div className={`label-cap cap-${section.cap}`} />
      <div className="label-body">
        <span className="label-code">{section.code}</span>
        <span className="label-name">{section.name}</span>
        <span className="barcode" />
      </div>
    </div>
  );
}

/* ============== photo plate with internal parallax drift ============== */
function ParallaxPlate({ src, alt, caption, frameClass, slot, tape, tint, eager }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <figure className="plate" ref={ref}>
      <div className={`plate-frame ${frameClass}`}>
        {tape && <span className="plate-tape" style={{ background: tint }}>{tape}</span>}
        {failed ? (
          <div className="ph"><span style={{ fontSize: 20 }}>▦</span><span>Add public/images/{slot}</span></div>
        ) : (
          <motion.img
            src={src} alt={alt} className="plate-img" style={{ y }}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "auto"}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {caption && <figcaption className="plate-cap">{caption}</figcaption>}
    </figure>
  );
}

/* ============== full-width parallax band ============== */
function ParallaxBand({ src, alt, slot, children }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <div className="band" ref={ref}>
      {failed ? (
        <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, border: "none" }}>
          <span>Add public/images/{slot}</span>
        </div>
      ) : (
        <motion.img
          src={src} alt={alt} className="band-img" style={{ y }}
          loading="lazy" decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <div className="band-veil"><div>{children}</div></div>
    </div>
  );
}

/* ============== simple background image with fallback ============== */
function BgImage({ src, slot, className }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`ph ${className || ""}`} style={{ borderRadius: 0 }}>
        <span>Add public/images/{slot}</span>
      </div>
    );
  }
  return (
    <img
      src={src} alt="" className={className}
      loading="lazy" decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/* ============== scroll reveal ==============
 * Reveals once as the element enters view.
 *
 * `from` picks the direction it travels in ("up" | "left" | "right" |
 * "scale"), so a row of cards can fan in rather than all sliding the same
 * way. `index` applies the 40ms stagger from the motion spec without each
 * caller having to do the arithmetic.
 *
 * On touch, narrow screens or reduced-motion this collapses to a plain
 * fade with no transform, so nothing moves on the devices where the
 * mobile perf fix matters.
 */
const REVEAL_FROM = {
  up:    { y: 24,  x: 0,   scale: 1    },
  left:  { y: 0,   x: -28, scale: 1    },
  right: { y: 0,   x: 28,  scale: 1    },
  scale: { y: 12,  x: 0,   scale: 0.97 },
};

function Reveal({ children, delay = 0, index = 0, from = "up" }) {
  const rich = useRichMotion();
  const offset = REVEAL_FROM[from] || REVEAL_FROM.up;

  // 40ms stagger per the motion spec, capped so a long list never crawls.
  const wait = delay + Math.min(index, 6) * 0.04;

  const hidden = rich
    ? { opacity: 0, ...offset }
    : { opacity: 0 };
  const shown = rich
    ? { opacity: 1, y: 0, x: 0, scale: 1 }
    : { opacity: 1 };

  return (
    <motion.div
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: rich ? 0.2 : 0.12, delay: wait, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ============== collapsible FAQ ============== */
function Faq({ q, a, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.button
      className="faq" onClick={() => setOpen(!open)}
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.2, delay, ease: [0.22, 1, 0.36, 1] }}
      aria-expanded={open}
    >
      <span className="faq-q">{q}<span className="faq-sign">{open ? "−" : "+"}</span></span>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="faq-a"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}