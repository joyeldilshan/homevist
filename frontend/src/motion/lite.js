/**
 * Lightweight motion primitives for pages that must paint before JS runs.
 *
 * The framer-motion primitives in ./index.jsx render their hidden state
 * (opacity 0) into the markup, so a pre-rendered page would arrive blank
 * and stay blank until the bundle executed. These go the other way:
 *
 *   PROGRESSIVE ENHANCEMENT. Content is visible in the HTML. JavaScript
 *   only ever hides something that is below the fold at mount time, and
 *   only to reveal it again. If any of this fails to run, the page is
 *   simply static and complete.
 *
 *   TRANSFORM AND OPACITY ONLY, written straight to the element in one
 *   shared requestAnimationFrame loop. No React re-render per frame.
 *
 *   GATES. prefers-reduced-motion turns parallax, tilt, magnetism and
 *   count-ups off (reveals fall back to a plain fade in CSS). Cursor
 *   effects need a fine pointer that can hover, so touch never sees them.
 *   Narrow screens are NOT excluded: everything here is cheap enough
 *   for a phone.
 *
 * No dependency: this file is in the landing page's first chunk.
 */
import { useEffect, useState } from "react";

const REDUCED_Q = "(prefers-reduced-motion: reduce)";
const FINE_Q    = "(hover: hover) and (pointer: fine)";

const media = (q) =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q) : null;

export const prefersReducedMotion = () => !!media(REDUCED_Q)?.matches;
export const hasFinePointer       = () => !!media(FINE_Q)?.matches;

/** Live media-query value. false on the server and on the first render. */
function useMedia(q) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = media(q);
    if (!m) return;
    const update = () => setOn(m.matches);
    update();
    m.addEventListener?.("change", update);
    return () => m.removeEventListener?.("change", update);
  }, [q]);
  return on;
}
export const useReducedMotion = () => useMedia(REDUCED_Q);
export const useFinePointer   = () => useMedia(FINE_Q);

/* ── One scroll/resize loop for every subscriber ─────────────────── */
const subscribers = new Set();
let queued = false;
let bound  = false;

function runFrame() {
  queued = false;
  for (const fn of subscribers) fn();
}
function queueFrame() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(runFrame);
}

/** Call fn once per animation frame in which the page scrolled or resized. */
export function onScrollFrame(fn) {
  if (typeof window === "undefined") return () => {};
  subscribers.add(fn);
  if (!bound) {
    bound = true;
    window.addEventListener("scroll", queueFrame, { passive: true });
    window.addEventListener("resize", queueFrame, { passive: true });
  }
  queueFrame();
  return () => subscribers.delete(fn);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Page scroll progress 0..1 as scaleX on the element. */
export function useScrollProgress(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return onScrollFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    });
  }, [ref]);
}

/**
 * Vertical parallax: the element drifts against the scroll while its
 * container crosses the viewport. `strength` is the travel in px either
 * side of rest. The container must clip (overflow: hidden).
 */
export function useParallax(ref, strength = 40) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const box = el.parentElement;
    return onScrollFrame(() => {
      const r  = box.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -100 || r.top > vh + 100) return;
      // -1 when the box is entering at the bottom, +1 when leaving at the top.
      const t = clamp((vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2), -1, 1);
      el.style.transform = `translate3d(0, ${(t * strength).toFixed(1)}px, 0)`;
    });
  }, [ref, strength]);
}

/**
 * Scroll reveals for every [data-reveal] inside the scope.
 *
 * At mount, anything already on screen is left alone (it has painted;
 * hiding it would flash). Anything below the fold gets .rv-wait, and
 * gains .rv-in once it comes into view. CSS owns the actual motion, so
 * the variant (data-reveal="up|left|right|scale|words") and stagger
 * (--i) live in the stylesheet.
 *
 * An IntersectionObserver is the fast path. It can miss an element that
 * a jump (anchor link, fast fling) carries straight past without it ever
 * intersecting in a rendered frame, so a cheap poll also reveals any
 * pending element that is in view or already above the viewport. The
 * poll stops as soon as nothing is pending: late, never lost.
 */
export function useReveal(scopeRef) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const vh = window.innerHeight;
    const pending = new Set();

    // Read every position first, then write every class. Interleaving a
    // read with a class change forced a full layout per element (~30 of
    // them on the landing page) during hydration.
    const all = [...scope.querySelectorAll("[data-reveal]")];
    const below = all.filter((el) => el.getBoundingClientRect().top > vh * 0.92);
    for (const el of below) {
      el.classList.add("rv-wait");
      pending.add(el);
    }
    if (!pending.size) return;

    const show = (el) => {
      if (!pending.delete(el)) return;
      el.classList.add("rv-in");
      io?.unobserve(el);
    };

    const io = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => entries.forEach((e) => e.isIntersecting && show(e.target)),
          { rootMargin: "0px 0px -8% 0px" }
        )
      : null;
    pending.forEach((el) => io?.observe(el));

    const poll = setInterval(() => {
      const h = window.innerHeight;
      for (const el of [...pending]) {
        if (el.getBoundingClientRect().top < h * 0.95) show(el);
      }
      if (!pending.size) clearInterval(poll);
    }, 250);

    // No observer at all: show everything rather than risk hidden content.
    if (!io) pending.forEach(show);

    return () => { io?.disconnect(); clearInterval(poll); };
  }, [scopeRef]);
}

/** true once the element has been in view (never flips back). */
export function useInViewOnce(ref, rootMargin = "0px 0px -15% 0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver !== "function") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/** true while the element is in (or near) the viewport. */
export function useInView(ref, rootMargin = "0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/**
 * Magnetic hover: the element leans toward the cursor. Fine pointer and
 * full motion only. The CSS gives it a transform transition.
 */
export function useMagnetic(ref, pull = 0.28) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * pull;
      const y = (e.clientY - (r.top + r.height / 2)) * pull * 1.3;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    const leave = () => { el.style.transform = ""; };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, pull]);
}

/**
 * Card tilt plus a cursor-following spotlight. The spotlight is a child
 * (.lp-glow) moved by transform, not a background repainted on every move.
 */
export function useTilt(ref, max = 6) {
  useEffect(() => {
    const card = ref.current;
    if (!card || !hasFinePointer() || prefersReducedMotion()) return;
    const glow = card.querySelector(".lp-glow");
    let frame = 0;
    const move = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform =
          `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg)`;
        if (glow) {
          const s = glow.offsetWidth / 2;
          glow.style.transform = `translate3d(${(e.clientX - r.left - s).toFixed(0)}px, ${(e.clientY - r.top - s).toFixed(0)}px, 0)`;
        }
      });
    };
    const leave = () => { cancelAnimationFrame(frame); card.style.transform = ""; };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, [ref, max]);
}

/**
 * Counts up to the number already in the element once it scrolls into
 * view. The markup holds the final value, so no-JS, reduced motion and
 * a missed observer all show the real number.
 */
export function useCountUp(ref, value, duration = 1400) {
  const seen = useInViewOnce(ref);
  useEffect(() => {
    const el = ref.current;
    if (!el || !seen || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      el.textContent = String(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = "0";
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); el.textContent = String(value); };
  }, [ref, seen, value, duration]);
}
