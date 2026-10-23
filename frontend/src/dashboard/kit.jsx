import { useEffect, useId, useRef, useState, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence, CountUp, Skeleton } from "../motion";
import { useRichMotion } from "../hooks/useRichMotion";
import { BOOKING_STAGES, BOOKING_STATUS, ACTIVE_BOOKING, SAMPLE_STATUS, stageIndex } from "./status";
import { I } from "./icons";
import "./dashboard.css";

/**
 * Dashboard kit: the shared shell and the pieces every dashboard is made
 * of. Imported only by the lazy dashboard chunks, never by the landing.
 *
 * Motion comes from ../motion (framer-motion), which gates everything on
 * useRichMotion(): with prefers-reduced-motion, a coarse pointer or a
 * narrow screen it collapses to instant opacity changes. Small CSS
 * motion (pill pulse, progress fill, press feedback) lives in
 * dashboard.css under (prefers-reduced-motion: no-preference).
 */

const EASE = [0.22, 1, 0.36, 1];
const COLLAPSE_KEY = "hv-sidebar-collapsed";

const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
};
const writeCollapsed = (v) => {
  try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch { /* not persistable */ }
};

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/* ── App shell ─────────────────────────────────────────────────────
 * Desktop: collapsible sidebar + sticky topbar. Phones (<860px): sticky
 * topbar + bottom navigation; items beyond the first four, and sign-out,
 * live in a "More" sheet. Every target is at least 44px tall on touch. */
export function Shell({
  role, items, active, onNavigate, user, onSignOut, live = false,
  sideExtra = null, topActions = null, children,
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const current = items.find((i) => i.id === active);
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);

  const toggle = () => setCollapsed((c) => { writeCollapsed(!c); return !c; });
  const go = (id) => { onNavigate(id); setMoreOpen(false); };

  // A render function, not a component: declared inside Shell, a
  // component would be a new type every render and remount the buttons,
  // dropping keyboard focus.
  const navItem = (item, compact = false) => {
    const Ico = I[item.icon] || I.grid;
    const on = item.id === active;
    return (
      <button key={item.id} type="button" className={on ? "db-nav-item on" : "db-nav-item"} aria-current={on ? "page" : undefined}
              onClick={() => go(item.id)} title={collapsed && !compact ? item.label : undefined}
              aria-label={compact && item.short ? item.label : undefined}>
        <Ico size={compact ? 22 : 20} />
        <span className="db-nav-label">{compact && item.short ? item.short : item.label}</span>
        {item.badge > 0 && <span className="db-nav-badge" aria-label={`${item.badge} waiting`}>{item.badge}</span>}
      </button>
    );
  };

  return (
    <div className={collapsed ? "db is-collapsed" : "db"}>
      <a href="#db-main" className="db-skip">Skip to content</a>

      <aside className="db-side" aria-label={`${role} navigation`}>
        <div className="db-side-head">
          <span className="db-brand"><span className="db-brand-dot" aria-hidden="true" /><span className="db-brand-text">HemoVisit</span></span>
          <button type="button" className="db-icon-btn" onClick={toggle}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>
            <I.collapse />
          </button>
        </div>
        <div className="db-role"><span className="db-mono">{role}</span></div>
        <nav className="db-nav">
          {items.map((it) => navItem(it))}
        </nav>
        {sideExtra && <div className="db-side-extra">{sideExtra}</div>}
        <div className="db-side-foot">
          <div className="db-user">
            <span className="db-avatar" aria-hidden="true">{initials(user?.name)}</span>
            <span className="db-user-text">
              <span className="db-user-name">{user?.name || role}</span>
              <span className="db-user-mail">{user?.email}</span>
            </span>
          </div>
          <button type="button" className="db-nav-item db-signout" onClick={onSignOut}>
            <I.logout /><span className="db-nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="db-body">
        <header className="db-top">
          <span className="db-brand db-top-brand"><span className="db-brand-dot" aria-hidden="true" />HemoVisit</span>
          <span className="db-top-title">{current?.label}</span>
          <span className="db-top-end">
            {live && <span className="db-live" title="Live updates connected"><span className="db-live-dot" aria-hidden="true" />Live</span>}
            {topActions}
            <span className="db-avatar db-top-avatar" aria-hidden="true">{initials(user?.name)}</span>
          </span>
        </header>

        <main id="db-main" className="db-main" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <PageFade key={active}>{children}</PageFade>
          </AnimatePresence>
        </main>
      </div>

      <nav className="db-bottom" aria-label={`${role} navigation`} style={{ "--n": primary.length + 1 }}>
        {primary.map((it) => navItem(it, true))}
        <button type="button" className={overflow.some((o) => o.id === active) ? "db-nav-item on" : "db-nav-item"}
                onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <I.more size={22} /><span className="db-nav-label">More</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" sheet>
        <div className="db-more">
          {overflow.map((it) => navItem(it, true))}
          {sideExtra}
          <button type="button" className="db-nav-item db-signout" onClick={onSignOut}>
            <I.logout size={22} /><span className="db-nav-label">Sign out</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}

/** Page-to-page transition inside the shell. */
function PageFade({ children }) {
  const rich = useRichMotion();
  return (
    <motion.div
      initial={rich ? { opacity: 0, y: 10 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={rich ? { opacity: 0, y: -6 } : { opacity: 0 }}
      transition={{ duration: rich ? 0.26 : 0.12, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Page header ───────────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="db-head">
      <div>
        {eyebrow && <div className="db-eyebrow"><span className="db-eyebrow-dot" aria-hidden="true" />{eyebrow}</div>}
        <h1 className="db-h1">{title}</h1>
        {sub && <p className="db-sub">{sub}</p>}
      </div>
      {actions && <div className="db-head-actions">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }) {
  return (
    <div className="db-section-title">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}

/* ── Staggered list: children rise in one after another ─────────── */
export function Rise({ children, as = "div", className = "", i = 0 }) {
  const rich = useRichMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={rich ? { opacity: 0, y: 14 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: rich ? 0.34 : 0.12, delay: rich ? Math.min(i, 8) * 0.045 : 0, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/* ── Stats: real counts only, counted up ───────────────────────── */
export function Stats({ items }) {
  return (
    <div className="db-stats">
      {items.map((s, i) => (
        <Rise key={s.label} i={i} className="db-stat" >
          <span className={`db-stat-ico tone-${s.tone || "teal"}`}>{s.icon && (I[s.icon] || I.grid)({ size: 18 })}</span>
          <span className="db-stat-v">
            {typeof s.value === "number" ? <CountUp value={s.value} /> : (s.value ?? "—")}
          </span>
          <span className="db-stat-l">{s.label}</span>
        </Rise>
      ))}
    </div>
  );
}

/* ── Status pill ───────────────────────────────────────────────────
 * Keyed by status, so a change (e.g. from a live socket update) pops the
 * new pill in. Active states carry a pulsing dot. */
export function StatusPill({ status, kind = "booking" }) {
  const map = kind === "sample" ? SAMPLE_STATUS : BOOKING_STATUS;
  const c = map[status] || { label: status || "—", tone: "grey" };
  const live = kind === "booking" && ACTIVE_BOOKING.includes(status);
  const rich = useRichMotion();
  return (
    <motion.span
      key={status}
      className={`db-pill tone-${c.tone}${live ? " is-live" : ""}`}
      initial={rich ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <span className="db-pill-dot" aria-hidden="true" />
      {c.label}
    </motion.span>
  );
}

/* ── Booking stage progress ────────────────────────────────────────
 * compact: a bar with five ticks. full: the vertical tracker with the
 * current step's description. Cancelled/rejected bookings have no
 * progress to show, so they render nothing. */
export function StageProgress({ status, full = false }) {
  const idx = stageIndex(status);
  if (idx < 0) return null;
  const pct = (idx / (BOOKING_STAGES.length - 1)) * 100;

  if (!full) {
    return (
      <div className="db-progress" role="img" aria-label={`Stage ${idx + 1} of ${BOOKING_STAGES.length}: ${BOOKING_STAGES[idx].label}`}>
        <span className="db-progress-track"><span className="db-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} /></span>
        <span className="db-progress-ticks" aria-hidden="true">
          {BOOKING_STAGES.map((s, i) => <span key={s.key} className={i <= idx ? "on" : ""} />)}
        </span>
      </div>
    );
  }

  return (
    <ol className="db-tracker">
      {BOOKING_STAGES.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.key} className={`db-tracker-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="db-tracker-dot" aria-hidden="true">{state === "done" ? <I.check size={14} /> : i + 1}</span>
            <span className="db-tracker-text">
              <span className="db-tracker-label">{s.label}{state === "current" && <span className="sr-only"> (current)</span>}</span>
              {state === "current" && <span className="db-tracker-desc">{s.desc}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Loading, empty and error states ───────────────────────────── */
export function LoadingCards({ count = 3, label = "Loading" }) {
  return (
    <div className="db-stack" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="db-card db-skel-card" aria-hidden="true">
          <Skeleton width="42%" height={16} />
          <Skeleton width="68%" height={12} style={{ marginTop: 12 }} />
          <Skeleton width="30%" height={12} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children, action }) {
  const Ico = I[icon] || I.inbox;
  return (
    <Rise className="db-card db-empty">
      <span className="db-empty-ico"><Ico size={26} /></span>
      <h2 className="db-empty-title">{title}</h2>
      {children && <p className="db-empty-text">{children}</p>}
      {action}
    </Rise>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="db-card db-error" role="alert">
      <I.alert size={20} />
      <span className="db-error-text">{message || "Something went wrong loading this page."}</span>
      {onRetry && <Button variant="ghost" size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ── Buttons ───────────────────────────────────────────────────── */
export function Button({ variant = "primary", size = "md", icon, children, className = "", busy = false, ...rest }) {
  const Ico = icon ? I[icon] : null;
  return (
    <button type="button" className={`db-btn db-btn-${variant} db-btn-${size} ${className}`} aria-busy={busy || undefined}
            disabled={busy || rest.disabled} {...rest}>
      {Ico && <Ico size={size === "sm" ? 16 : 18} />}
      <span>{children}</span>
    </button>
  );
}

/* ── Form field: label always wired to its control ─────────────── */
export function Field({ label, hint, error, children }) {
  const id = useId();
  const hintId = hint || error ? `${id}-note` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        className: `db-input ${children.props.className || ""}`,
        "aria-describedby": hintId,
        "aria-invalid": error ? true : undefined,
      })
    : children;
  return (
    <div className="db-field">
      <label htmlFor={id} className="db-label">{label}</label>
      {control}
      {(hint || error) && <span id={hintId} className={error ? "db-note is-error" : "db-note"}>{error || hint}</span>}
    </div>
  );
}

/* ── Table: a real <table> on desktop, labelled cards on phones ─── */
export function DataTable({ caption, columns, rows, rowKey = (r) => r._id, empty }) {
  if (!rows.length) return empty || null;
  return (
    <div className="db-card db-table-wrap">
      <table className="db-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Rise as="tr" key={rowKey(r)} i={i}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.header} className={c.className}>
                  {/* one wrapper, so on phones the label/value grid gets exactly two items */}
                  <span className="db-td">{c.render ? c.render(r) : r[c.key] ?? "—"}</span>
                </td>
              ))}
            </Rise>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Modal / sheet ─────────────────────────────────────────────────
 * role="dialog", labelled by its title, focus moved in on open and back
 * to the opener on close, Tab kept inside, Escape and backdrop close.
 * `sheet` docks it to the bottom (used for the mobile "More" menu). */
export function Modal({ open, onClose, title, children, sheet = false, wide = false }) {
  const rich = useRichMotion();
  const panel = useRef(null);
  const titleId = useId();

  // Callers pass onClose as an inline arrow, a new function on every
  // render. It used to be a dependency of the effect below, so every
  // keystroke in a dialog's form (state change -> parent re-render -> new
  // onClose) re-ran the effect: focus jumped back to the first field after
  // one character, and the "opener" to return to was re-captured as that
  // field. The latest onClose is read from a ref instead, so the effect
  // runs once per opening.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;   // the trigger; focus returns here on close
    const el = panel.current;
    const focusables = () => [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((n) => !n.disabled && n.offsetParent !== null);
    (focusables()[1] || focusables()[0] || el)?.focus();   // [0] is the close button
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={sheet ? "db-overlay is-sheet" : "db-overlay"} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <motion.div ref={panel} className={`db-modal${sheet ? " is-sheet" : ""}${wide ? " is-wide" : ""}`}
                      role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                      initial={rich ? (sheet ? { y: 40, opacity: 0 } : { y: 16, scale: 0.97, opacity: 0 }) : { opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={rich ? (sheet ? { y: 40, opacity: 0 } : { y: 10, scale: 0.98, opacity: 0 }) : { opacity: 0 }}
                      transition={{ duration: 0.26, ease: EASE }}>
            <div className="db-modal-head">
              <h2 id={titleId}>{title}</h2>
              <button type="button" className="db-icon-btn" onClick={onClose} aria-label="Close"><I.x /></button>
            </div>
            <div className="db-modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Small helpers ─────────────────────────────────────────────── */
export function Meta({ icon, children }) {
  const Ico = I[icon] || I.tag;
  return <span className="db-meta"><Ico size={15} />{children}</span>;
}

export function Card({ children, className = "", tone, i = 0, as }) {
  return (
    <Rise i={i} as={as} className={`db-card ${tone ? `db-card-tone tone-${tone}` : ""} ${className}`}>
      {children}
    </Rise>
  );
}

export { I };
