import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../utils/api";

/**
 * Pings GET /api/health on load and reports whether the backend is up.
 *
 * Why this exists: on Render's free tier the backend sleeps after ~15
 * minutes of inactivity, and the next request takes 30-50 seconds while
 * the instance boots. Without this the app just looks dead — the single
 * worst first impression for anyone opening a demo link.
 *
 * States:
 *   "checking" - first ping in flight, say nothing yet
 *   "waking"   - still no answer after SLOW_AFTER_MS, tell the user
 *   "awake"    - backend answered
 *   "down"     - gave up after GIVE_UP_MS
 *
 * Deliberately uses plain fetch rather than the axios instance: /api/health
 * is public, and the instance's 401 interceptor would clear the session.
 * No existing API call or auth behaviour is touched by this.
 */

const SLOW_AFTER_MS = 3000;    // when to admit something is slow
const GIVE_UP_MS    = 90000;   // Render cold starts are well under this
const BACKOFF_MS    = [1000, 2000, 4000, 8000, 12000, 15000];

export function useServerHealth() {
  const [status, setStatus]   = useState("checking");
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const startedAt = Date.now();
    let slowTimer = null;
    let retryTimer = null;

    // Only admit slowness after 3s — a healthy server answers long before.
    slowTimer = setTimeout(() => {
      if (!cancelled.current) setStatus((s) => (s === "checking" ? "waking" : s));
    }, SLOW_AFTER_MS);

    const ping = async (n) => {
      if (cancelled.current) return;
      setAttempt(n);

      try {
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          cache: "no-store",
        });
        if (cancelled.current) return;
        if (res.ok) {
          clearTimeout(slowTimer);
          setStatus("awake");
          return;
        }
        throw new Error(`health returned ${res.status}`);
      } catch {
        if (cancelled.current) return;

        if (Date.now() - startedAt > GIVE_UP_MS) {
          clearTimeout(slowTimer);
          setStatus("down");
          return;
        }
        const wait = BACKOFF_MS[Math.min(n, BACKOFF_MS.length - 1)];
        retryTimer = setTimeout(() => ping(n + 1), wait);
      }
    };

    ping(0);

    return () => {
      cancelled.current = true;
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, []);

  return { status, attempt };
}
