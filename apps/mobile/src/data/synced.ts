/**
 * Gather — shared synced types + the movement rollup.
 *
 * The shapes the server ships to the device. Two related concerns moved out as they grew:
 *   • the campaign directory  → ./campaigns.ts (self-serve picker)
 *   • the per-geography voter index pipeline → ./voterIndex.ts (per-campaign, minimized)
 * This module keeps the cross-cutting types (Destination / Compensation / PetitionForm) and the
 * MOVEMENT rollup (synthetic here; a live server aggregate in production).
 */

/** Where to send the volunteer — the routable point the maps hand-off navigates to. */
export interface Destination {
  label: string; // shown on the button + dropped as the pin name
  lat: number;
  lng: number;
}

/**
 * How the circulator is compensated — driven per-state by BallotAccessDB, NOT hardcoded.
 * Per-signature pay is BANNED in several states; where it is, `basis` must be "hourly" (or
 * "volunteer") and the UI renders accordingly. This is the compliance bright line, as data.
 */
export type CompBasis = "per-valid-signature" | "hourly" | "volunteer";
export interface Compensation {
  basis: CompBasis;
  rate: number;       // $/valid signature, or $/hour, or (volunteer) notional value per valid
  currency: string;
  note: string;       // the legal basis, shown to the circulator
}

/** An official petition sheet the circulator must print and collect wet-ink signatures on. */
export interface PetitionForm {
  name: string;
  url: string;        // official SoS/state source (from BallotAccessDB official-source links)
  note?: string;
}

/**
 * The movement — the collective effort this circulator is part of. Synthetic here; in production
 * a live rollup the server pushes (this week's totals across all circulators/states), the
 * "you are not alone" signal that turns a shift into a cause.
 */
export const MOVEMENT = {
  tagline: "A movement to make democracy thrive.",
  circulators: 1240,
  validThisWeek: 38902,
  states: 7,
};
