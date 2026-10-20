import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Browser-storage notice.
 *
 * Worded to match what this application ACTUALLY does, which was checked
 * against the code rather than assumed:
 *   - No cookies are set anywhere. There is no document.cookie use, and
 *     the backend sends the JWT in the response body, not Set-Cookie.
 *   - The JWT and a copy of the user object are kept in sessionStorage
 *     (see context/AuthContext.jsx and utils/api.js), which the browser
 *     clears when the tab closes.
 *   - There is no analytics, advertising or tracking.
 *
 * Because the only storage is strictly necessary to keep someone signed
 * in, this is an informational notice, not a consent banner — there is
 * nothing optional here to consent to. If analytics or any non-essential
 * storage is ever added, this must become a real consent mechanism with
 * a genuine reject option, and that is a decision for legal review.
 *
 * The dismissal flag itself is kept in localStorage so the notice stays
 * dismissed between visits; it holds no personal data.
 */

const DISMISS_KEY = "hv-storage-notice-dismissed";

/*
 * Starts visible, so it is part of the pre-rendered landing HTML and a
 * first-time visitor sees it at first paint instead of having it pop in
 * once JavaScript runs (when it was also the page's LCP element, delayed
 * by the whole bundle). For a returning visitor, an inline script in
 * index.html sets html[data-notice-off] from the same localStorage flag
 * before first paint, which hides it in CSS; the effect below then
 * unmounts it. Server and first client render agree, so hydration holds.
 */
export default function StorageNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) setVisible(false);
    } catch {
      // Private mode or blocked storage — keep showing it; dismissal just won't persist.
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* not persistable */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Browser storage notice"
      className="hv-storage-notice"
      style={{
        position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 9999,
        maxWidth: 680, margin: "0 auto",
        background: "#16211F", color: "#F4F2ED",
        borderRadius: 10, padding: "16px 18px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap",
        fontSize: 13.5, lineHeight: 1.6,
      }}
    >
      <div style={{ flex: "1 1 320px", minWidth: 240 }}>
        <strong style={{ display: "block", marginBottom: 4 }}>
          This site does not use cookies
        </strong>
        <span style={{ color: "rgba(243,240,234,0.82)" }}>
          When you sign in we keep your sign-in token in your browser&apos;s
          sessionStorage so you stay signed in between pages. Your browser clears
          it when you close the tab. We do not use analytics or tracking.{" "}
          <Link to="/privacy" style={{ color: "#8FD4C4", textDecoration: "underline" }}>
            Read our Privacy Policy
          </Link>.
        </span>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: "#F4F2ED", color: "#16211F", border: "none",
          borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600,
          cursor: "pointer", flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  );
}
