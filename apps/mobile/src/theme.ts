/**
 * Gather — "Daybreak" design tokens.
 *
 * The dawn of democracy: a deep-midnight ground that warms toward a golden horizon. THRIVE-GREEN
 * carries growth and the VALID verdict; DAWN-GOLD carries action, earnings, and milestones. The
 * three verdict bands (green / amber / rose) stay distinct for function. Fraunces — a warm,
 * humane serif — sets display headlines; Menlo marks machine data; the system sans carries body.
 */
import type { Verdict } from "@campaign-os/engine";

export const C = {
  bg: "#0a0f1c",       // deep midnight
  bgElev: "#111829",
  bgElev2: "#18223a",
  line: "#23304a",
  lineSoft: "#1a2336",
  ink: "#f2f5fa",
  inkDim: "#b9c2d0",
  inkFaint: "#8b96a8",
  inkGhost: "#5a6678",
  mint: "#5be39a",     // thriving green — growth + VALID (key kept for compatibility)
  mintDeep: "#0e3a2c",
  gold: "#ffd27d",     // dawn gold — CTA, money, milestones
  goldDeep: "#352713",
  rose: "#ff6f7d",
  amber: "#f6a93b",
  accent: "#74b3ff",   // sky / horizon blue
  ctaInk: "#241a05",   // dark text on gold
  growInk: "#03130d",  // dark text on green
} as const;

export const MONO = "Menlo";

// Fraunces display weights (loaded in App via expo-font). fontFamily encodes weight — don't pair
// these with a fontWeight.
export const DISPLAY = "Fraunces_700Bold";
export const DISPLAY_BLACK = "Fraunces_900Black";
export const DISPLAY_SEMI = "Fraunces_600SemiBold";

/** The verdict band → color, shared by every surface that renders a verdict. */
export const VERDICT_COLOR: Record<Verdict, string> = {
  VALID: C.mint,
  INVALID: C.rose,
  NEEDS_REVIEW: C.amber,
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  VALID: "✓ COUNTS",
  INVALID: "✗ WON'T COUNT",
  NEEDS_REVIEW: "⚠ NEEDS REVIEW",
};

/** Short tag for dense lists. */
export const VERDICT_TAG: Record<Verdict, string> = {
  VALID: "✓ COUNTS",
  INVALID: "✗ NO",
  NEEDS_REVIEW: "⚠ REVIEW",
};
