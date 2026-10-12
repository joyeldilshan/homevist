/**
 * Design tokens for inline style objects.
 *
 * Mirrors theme.css and the Figma library "Home Visit — Design System".
 * The dashboards build a lot of their styling as inline objects, which
 * cannot read CSS custom properties, so the same values live here.
 *
 * If you change a colour, change it in BOTH this file and theme.css.
 */

// ── Primitives ───────────────────────────────────────────────
export const TEAL_900       = "#0A4A42";
export const TEAL_800       = "#0C5B51";
export const TEAL_700       = "#0F6E62";
export const TEAL_600       = "#138275";
export const TEAL_50        = "#EDF6F4";
export const TERRACOTTA_600 = "#C9603A";
export const INK_900        = "#16211F";
export const INK_500        = "#55635F";
export const INK_300        = "#8A9794";
export const INK_400        = "#626E6B";  // muted TEXT, 4.74:1 on paper
export const INK_100        = "#D4DBD9";
export const PAPER          = "#F4F2ED";
export const WHITE          = "#FFFFFF";

// ── Semantic ─────────────────────────────────────────────────
export const PRIMARY        = TEAL_700;
export const PRIMARY_HOVER  = TEAL_800;
export const ACCENT         = TERRACOTTA_600;
export const SURFACE        = WHITE;
export const TEXT_PRIMARY   = INK_900;
export const TEXT_SECONDARY = INK_500;
export const TEXT_MUTED     = INK_400;
export const BORDER         = INK_100;

// ── Status ───────────────────────────────────────────────────
// Kept visually distinct because they carry meaning in the booking
// pipeline, but re-tuned to sit with the teal palette.
export const SUCCESS = "#2E7D57";
export const WARNING = "#B8862E";
export const DANGER  = "#B3261E";
export const INFO    = "#3E6C9E";
export const VIOLET  = "#6E6AA8";

/*
 * Legacy names.
 *
 * The dashboards were written against the old lab-label palette
 * (CRIMSON/TEAL/GOLD/LAVENDER). Rather than rename several hundred
 * usages, those names are re-pointed at the new palette here.
 *
 * They keep their SEMANTIC ROLE, not their old hue:
 *   CRIMSON  was the brand/processing accent -> terracotta
 *   TEAL     was a secondary accent          -> the new primary
 * Prefer the semantic names above in new code.
 */
export const INK      = TEXT_PRIMARY;
export const CRIMSON  = ACCENT;
export const TEAL     = PRIMARY;
export const GOLD     = WARNING;
export const LAVENDER = VIOLET;
export const GREEN    = SUCCESS;
export const BLUE     = INFO;

export const RADIUS   = { sm: 4, md: 8, lg: 14, xl: 20, "2xl": 28, full: 999 };
export const DURATION = { instant: 120, fast: 180, base: 240, slow: 420, stagger: 40 };
export const EASE     = "cubic-bezier(.22, 1, .36, 1)";

/*
 * Premium layer — mirrors theme.css. Inline style objects cannot read
 * CSS custom properties, so the same values live here too.
 * Change one, change the other.
 */
export const ELEVATION = {
  0: "none",
  1: "0 1px 2px rgba(22,33,31,.06), 0 1px 3px rgba(22,33,31,.04)",
  2: "0 2px 4px rgba(22,33,31,.06), 0 6px 16px rgba(22,33,31,.07)",
  3: "0 4px 8px rgba(22,33,31,.07), 0 14px 32px rgba(22,33,31,.09)",
  4: "0 8px 16px rgba(22,33,31,.08), 0 28px 64px rgba(22,33,31,.12)",
};

export const GLOW = {
  primary: "0 0 0 1px rgba(15,110,98,.18), 0 8px 28px rgba(15,110,98,.22)",
  accent:  "0 0 0 1px rgba(201,96,58,.20), 0 8px 28px rgba(201,96,58,.24)",
  focus:   "0 0 0 4px rgba(15,110,98,.18)",
};

export const GLASS = {
  bg:     "rgba(255,255,255,.72)",
  dark:   "rgba(22,33,31,.62)",
  border: "rgba(255,255,255,.55)",
  blur:   "blur(14px) saturate(1.3)",
};

export const GROUND = { 900: "#0A100F", 800: "#111A18", 700: "#1A2624" };

export const EASINGS = {
  ease:    "cubic-bezier(.22, 1, .36, 1)",
  outExpo: "cubic-bezier(.16, 1, .3, 1)",
  spring:  "cubic-bezier(.34, 1.56, .64, 1)",
};

/*
 * Terracotta at 3.1:1 on paper fails 4.5:1 for small text. Use ACCENT
 * for large text, icons, borders and fills with dark text; use
 * ACCENT_TEXT when terracotta must carry small body copy.
 */
export const ACCENT_TEXT = "#A84A2C";

export const FONTS = {
  display: '"Archivo", system-ui, -apple-system, sans-serif',
  body:    '"Inter", system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
};
