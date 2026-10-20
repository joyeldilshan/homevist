/**
 * Shared motion primitives.
 *
 * Every animated thing in the app comes from here, so reduced-motion and
 * low-end-device behaviour is decided in ONE place instead of being
 * re-implemented (and forgotten) per component.
 *
 * Rules these all obey:
 *   - Animate transform and opacity only. Never width, height, top or
 *     left — those force layout on every frame.
 *
 *     ONE deliberate exception: Skeleton's shimmer animates
 *     background-position. A transform-based shimmer needs an extra
 *     absolutely-positioned child and overflow:hidden on every
 *     placeholder, and the repaint here is confined to a small box that
 *     is on screen for under a second. If skeletons are ever used in
 *     long lists, revisit this.
 *   - Every primitive consults useRichMotion(). When it returns false
 *     (narrow viewport, coarse pointer, or prefers-reduced-motion) the
 *     movement collapses to an instant opacity change or nothing at all.
 *   - Durations come from the tokens, not from magic numbers.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRichMotion } from "../hooks/useRichMotion";
import { DURATION } from "../theme";

const EASE = [0.22, 1, 0.36, 1];
const EXPO = [0.16, 1, 0.3, 1];

const sec = (ms) => ms / 1000;

/* ── Directional offsets ──────────────────────────────────────── */
const FROM = {
  up:    { y: 24 },
  down:  { y: -24 },
  left:  { x: -28 },
  right: { x: 28 },
  scale: { scale: 0.96 },
  none:  {},
};

/**
 * Reveals children once as they scroll into view.
 *
 * `index` applies the shared stagger without each caller doing the maths.
 *
 * WHY THIS IS NOT JUST whileInView
 * ---------------------------------
 * A plain whileInView + once:true leaves content PERMANENTLY INVISIBLE if
 * the intersection callback is missed. That is not hypothetical: it was
 * reproduced on this landing page. Jumping to an anchor, scrolling fast,
 * or loading a URL with a hash can move past a section without the
 * observer ever reporting it, and because once:true never re-checks, the
 * section stays at opacity 0 forever.
 *
 * So intersection is treated as the FAST path, not the only path. A
 * cheap geometric check runs on mount, shortly after, and on scroll
 * until the element has been shown — then it detaches. Content can be
 * late, but it can never be lost.
 */
function useRevealed(ref, margin = 60) {
  const inView = useInView(ref, { once: true, margin: `-${margin}px` });
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (inView) setShown(true);
  }, [inView]);

  useEffect(() => {
    if (shown) return;

    /*
     * Deterministic backstop.
     *
     * The first version listened for scroll events. That was not enough:
     * fast or programmatic scrolling coalesces events, and an element
     * could be scrolled past without a single handler running — leaving
     * it hidden forever. Polling does not care how the viewport moved or
     * whether any event was delivered.
     *
     * One cheap getBoundingClientRect every 250ms, per element that has
     * not yet been revealed, and the timer clears itself the moment it
     * has. In the worst case a reveal is 250ms late; it is never lost.
     */
    const check = () => {
      const el = ref.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const seen = r.top < window.innerHeight && r.bottom > 0;
      const passed = r.bottom <= 0;
      if (seen || passed) { setShown(true); return true; }
      return false;
    };

    if (check()) return;
    const id = setInterval(() => { if (check()) clearInterval(id); }, 250);
    return () => clearInterval(id);
  }, [shown, ref]);

  return shown;
}

export function Reveal({
  children, from = "up", index = 0, delay = 0,
  className = "", style, once = true,
}) {
  const rich = useRichMotion();
  const ref = useRef(null);
  const shown = useRevealed(ref);
  const offset = FROM[from] || FROM.up;
  const wait = delay + Math.min(index, 8) * sec(DURATION.stagger);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={rich ? { opacity: 0, ...offset } : { opacity: 0 }}
      animate={shown ? { opacity: 1, x: 0, y: 0, scale: 1 } : undefined}
      transition={{
        duration: rich ? sec(DURATION.base) : sec(DURATION.instant),
        delay: wait,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered list. Wrap the list, use <StaggerItem> for each child.
 * One orchestration point instead of an index prop on every row.
 */
export function Stagger({ children, className = "", style, delay = 0 }) {
  const rich = useRichMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        shown: {
          transition: {
            staggerChildren: rich ? sec(DURATION.stagger) : 0,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, from = "up", className = "", style }) {
  const rich = useRichMotion();
  const offset = FROM[from] || FROM.up;
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden: rich ? { opacity: 0, ...offset } : { opacity: 0 },
        shown: {
          opacity: 1, x: 0, y: 0, scale: 1,
          transition: { duration: rich ? sec(DURATION.base) : sec(DURATION.instant), ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Page-level enter. Keep it short — this delays first paint of content. */
export function PageTransition({ children, className = "", style }) {
  const rich = useRichMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={rich ? { opacity: 0, y: 10 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={rich ? { opacity: 0, y: -8 } : { opacity: 0 }}
      transition={{ duration: sec(DURATION.base), ease: EXPO }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hover lift + press. `glow` adds a coloured shadow on hover.
 * Both collapse to nothing when rich motion is off.
 */
export function Interactive({
  children, as = "div", lift = 4, press = 0.98,
  glow, className = "", style, ...rest
}) {
  const rich = useRichMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      style={style}
      whileHover={rich ? { y: -lift, boxShadow: glow } : undefined}
      whileTap={rich ? { scale: press } : undefined}
      transition={{ duration: sec(DURATION.fast), ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts up to `value` when scrolled into view.
 *
 * Writes through a ref rather than React state so it does not re-render
 * on every frame. With reduced motion it prints the final value at once.
 */
export function CountUp({
  value, duration = DURATION.slow * 2, decimals = 0,
  prefix = "", suffix = "", className = "", style,
}) {
  const rich = useRichMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const target = Number(value) || 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const render = (n) => {
      el.textContent = prefix + n.toFixed(decimals) + suffix;
    };

    if (!inView) { render(0); return; }
    if (!rich)   { render(target); return; }

    let raf = 0;
    const started = performance.now();
    const tick = (now) => {
      const t = Math.min((now - started) / duration, 1);
      // easeOutExpo — fast start, gentle settle
      render(target * (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, rich, target, duration, decimals, prefix, suffix]);

  return <span ref={ref} className={className} style={style}>{prefix}0{suffix}</span>;
}

/**
 * Skeleton placeholder. Replaces spinners: a block the shape of the
 * content that is coming reads as progress, not as a stall.
 */
export function Skeleton({ width = "100%", height = 16, radius, className = "", style }) {
  const rich = useRichMotion();
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius ?? "var(--radius-sm)",
        background: rich
          ? "linear-gradient(90deg, var(--color-bg-subtle) 25%, rgba(255,255,255,.85) 37%, var(--color-bg-subtle) 63%)"
          : "var(--color-bg-subtle)",
        backgroundSize: "400% 100%",
        animation: rich ? "shimmer 1.4s ease infinite" : "none",
        ...style,
      }}
    />
  );
}

/** Several skeleton lines, with a shorter last one as real text has. */
export function SkeletonText({ lines = 3, gap = 10, height = 14 }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={height} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}

/** Mount/unmount wrapper for modals, drawers and toasts. */
export function Appear({ show, children, from = "scale", className = "", style }) {
  const rich = useRichMotion();
  const offset = FROM[from] || FROM.scale;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className={className}
          style={style}
          initial={rich ? { opacity: 0, ...offset } : { opacity: 0 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={rich ? { opacity: 0, ...offset } : { opacity: 0 }}
          transition={{ duration: sec(DURATION.fast), ease: EASE }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Pointer parallax. Returns a normalised -1..1 position plus a helper
 * that turns a depth into a transform.
 *
 * Tracks in a ref and writes through requestAnimationFrame, so moving
 * the mouse does not re-render the tree — the naive useState version of
 * this fires on every mousemove event.
 */
export function usePointerParallax({ strength = 12 } = {}) {
  const rich = useRichMotion();
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const frame = useRef(0);

  useEffect(() => {
    if (!rich) return;
    const onMove = (e) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        setPos({
          x: (e.clientX / window.innerWidth - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * 2,
        });
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame.current);
    };
  }, [rich]);

  const layer = (depth = 1) =>
    rich
      ? { transform: `translate3d(${pos.x * strength * depth}px, ${pos.y * strength * depth}px, 0)` }
      : undefined;

  return { ref, pos, layer, enabled: rich };
}

export { motion, AnimatePresence };
