/**
 * Gather — assignments (the optimizer's allocation of a circulator to a turf).
 *
 * RFC-002-A1: a circulator doesn't load a whole campaign — they're ASSIGNED a turf (a set of tile
 * cells the optimizer carved from yield + routing). The active assignment is what drives which tiles
 * the device loads (see voterIndexStore.turfOf). Here we model the optimizer's output as data; a real
 * deployment fetches assignments from the optimizer service per circulator. A campaign can have many
 * assignments; a circulator works one at a time (and can be re-assigned).
 */
export interface Assignment {
  id: string;
  campaignId: string;
  label: string;        // the turf, named (what the optimizer allocated)
  areaShort: string;    // compact label for the working top bar / briefing
  turf: string[];       // tile cells (RFC-002-A1) this assignment covers → the device loads exactly these
  expectedValid: number; // the optimizer's yield prior for this turf (0–1)
  directive: string;     // the "next best move" for this turf
  voterCount?: number;   // turf density (optimizer-supplied)
  rank?: number;         // optimizer rank (1 = best turf right now)
}

export const ASSIGNMENTS: Assignment[] = [
  {
    id: "nc-uptown-tryon", campaignId: "nc-independent",
    label: "Uptown — Tryon St corridor", areaShort: "Uptown · Prec 074",
    turf: ["mecklenburg__074"], expectedValid: 0.72,
    directive: "Uptown lunch crowds on Tryon St 11–2 — dense active registrations.",
  },
  {
    id: "nc-plaza-midwood", campaignId: "nc-independent",
    label: "Plaza Midwood — Central Ave", areaShort: "Plaza Midwood · Prec 015",
    turf: ["mecklenburg__015__b0"], expectedValid: 0.69,
    directive: "Central Ave foot traffic, early evening — high unaffiliated share.",
  },
];

export const assignmentsFor = (campaignId: string): Assignment[] => ASSIGNMENTS.filter((a) => a.campaignId === campaignId);
export const defaultAssignment = (campaignId: string): Assignment | null => assignmentsFor(campaignId)[0] ?? null;
