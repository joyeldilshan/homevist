import { Fragment } from "react";

/**
 * Small pieces shared by the landing page's first and lazy chunks.
 */

/*
 * Section labels. Looked up by id, never by position: positional lookups
 * broke once already when sections were removed (see Home.test.jsx).
 */
export const SECTIONS = [
  { id: "hero",     code: "HV-01", name: "Home",     cap: "crimson"  },
  { id: "about",    code: "HV-02", name: "About",    cap: "lavender" },
  { id: "features", code: "HV-03", name: "Services", cap: "teal"     },
  { id: "process",  code: "HV-04", name: "Process",  cap: "gold"     },
  { id: "roles",    code: "HV-05", name: "Roles",    cap: "crimson"  },
  { id: "booking",  code: "HV-06", name: "Booking",  cap: "lavender" },
  { id: "faq",      code: "HV-07", name: "FAQ",      cap: "gold"     },
  { id: "contact",  code: "HV-08", name: "Contact",  cap: "crimson"  },
];

export const CAP = { crimson: "#C9603A", lavender: "#6E6AA8", gold: "#B8862E", teal: "#0F6E62" };

export const section = (id) => SECTIONS.find((s) => s.id === id);

export function SpecimenLabel({ id, dark = false }) {
  const s = section(id);
  if (!s) return null;
  return (
    <div className={dark ? "label label-dark" : "label"}>
      <span className="label-cap" style={{ background: CAP[s.cap] || CAP.teal }} />
      <span className="label-code">{s.code}</span>
      <span className="label-name">{s.name}</span>
    </div>
  );
}

/**
 * A heading whose words rise out of a mask, one after another.
 *
 * Screen readers and text search get the plain sentence (visually
 * hidden); the split, animated copy is aria-hidden. `accentFrom` colours
 * the words from that index on. `start` offsets the stagger index.
 */
export function SplitWords({ text, accentFrom = Infinity, start = 0 }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="lp-split" aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className={i >= accentFrom ? "lp-w lp-w-accent" : "lp-w"}>
              <span style={{ "--i": start + i }}>{w}</span>
            </span>
            {/* outside the inline-block: trailing space inside one collapses */}
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </>
  );
}

/* ── Icons: 24px line icons, currentColor, each with parts that animate ── */
const Svg = ({ children, className = "" }) => (
  <svg className={`ico ${className}`} viewBox="0 0 24 24" width="24" height="24" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  drop: () => (
    <Svg className="ico-drop">
      <path className="i-a" d="M12 3.5c3.2 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.3-6 5.5-10Z" />
      <path className="i-b" d="M9.6 14.2a2.6 2.6 0 0 0 2.4 2.4" />
    </Svg>
  ),
  report: () => (
    <Svg className="ico-report">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 3.5V8h4" />
      <path className="i-a" d="M9 12h6" /><path className="i-b" d="M9 15h6" /><path className="i-c" d="M9 18h3.5" />
    </Svg>
  ),
  lock: () => (
    <Svg className="ico-lock">
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path className="i-a" d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <path d="M12 14.5v2.5" />
    </Svg>
  ),
  track: () => (
    <Svg className="ico-track">
      <path d="M12 20.5s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
      <circle className="i-a" cx="12" cy="10.5" r="2.2" />
    </Svg>
  ),
  panels: () => (
    <Svg className="ico-panels">
      <path className="i-a" d="M8 3.5v13a3 3 0 0 0 6 0v-13" />
      <path d="M7 3.5h8" />
      <path className="i-b" d="M8 11h6" />
      <path className="i-c" d="M17.5 8.5v8a2 2 0 0 0 4 0v-8M17 8.5h5" />
    </Svg>
  ),
  lab: () => (
    <Svg className="ico-lab">
      <path d="M9.5 3.5h5M10.5 3.5v5.2L5.4 18a1.7 1.7 0 0 0 1.5 2.5h10.2a1.7 1.7 0 0 0 1.5-2.5l-5.1-9.3V3.5" />
      <path className="i-a" d="M7.6 14.5h8.8" />
      <circle className="i-b" cx="10.5" cy="17.2" r=".6" /><circle className="i-c" cx="13.5" cy="16.4" r=".6" />
    </Svg>
  ),
  calendar: () => (
    <Svg className="ico-calendar">
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <path className="i-a" d="m9.5 15 1.8 1.8 3.5-3.6" />
    </Svg>
  ),
  home: () => (
    <Svg className="ico-home">
      <path d="M4 11.2 12 4.5l8 6.7" />
      <path d="M6 10v10.5h12V10" />
      <path className="i-a" d="M10 20.5v-5h4v5" />
    </Svg>
  ),
  tube: () => (
    <Svg className="ico-tube">
      <g className="i-a">
        <path d="M9.5 3.5h5M10.5 3.5v14a1.5 1.5 0 0 0 3 0v-14" />
        <path className="i-b" d="M10.5 12h3" />
      </g>
    </Svg>
  ),
};
