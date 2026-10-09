import { useState, useEffect } from "react";

/**
 * Should this device run the rich, scroll-driven motion?
 *
 * One place decides, so the JS parallax and the CSS guards can never drift
 * apart. Returns false when ANY of these is true:
 *
 *   - the viewport is narrow (<= 780px)
 *   - the pointer is coarse (touch), regardless of width
 *   - the user asked for reduced motion
 *
 * Why this exists: Home.jsx already hid the blob and cell layers on mobile
 * with a CSS media query, but the framer-motion useTransform subscriptions
 * kept running and recomputing transforms for elements that were
 * display:none. Gating in JS as well as CSS stops that wasted work on
 * exactly the devices that could least afford it — which is what commit
 * 53f99e8 ("drop heavy blur effects on mobile") was fixing.
 *
 * The thresholds here mirror the media query in Home.jsx. Change both.
 */

const QUERY = "(max-width: 780px), (hover: none) and (pointer: coarse)";
const REDUCED = "(prefers-reduced-motion: reduce)";

export function useRichMotion() {
  // Start false so the first paint is the cheap path; the effect upgrades
  // it on capable devices. Avoids a heavy first frame on phones.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const small   = window.matchMedia(QUERY);
    const reduced = window.matchMedia(REDUCED);

    const update = () => setEnabled(!small.matches && !reduced.matches);
    update();

    // Safari < 14 only has the deprecated addListener.
    const add = (mq, fn) =>
      mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
    const remove = (mq, fn) =>
      mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn);

    add(small, update);
    add(reduced, update);
    return () => { remove(small, update); remove(reduced, update); };
  }, []);

  return enabled;
}
