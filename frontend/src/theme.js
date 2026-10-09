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
export const TEXT_MUTED     = INK_300;
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

export const RADIUS = { sm: 4, md: 6, lg: 10, full: 999 };
export const DURATION = { instant: 120, fast: 180, base: 200, stagger: 40 };
export const EASE = "cubic-bezier(.22, 1, .36, 1)";
