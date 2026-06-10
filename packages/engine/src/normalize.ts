/**
 * @campaign-os/engine — normalization.
 *
 * Fold the cosmetic differences that make the SAME person look different across a
 * petition line and a voter-file row (nickname, USPS street-type, "Last, First", unit/ZIP).
 * Pure: no platform deps — runs identically in Node (server), React Native, and the browser.
 * Ported from prototypes/validation-engine; this package is the single source of truth.
 */

import { STREET_SUFFIXES, DIRECTIONALS, SECONDARY_UNITS, type StandardizedAddress, type AddressStandardizer } from "./standardize";

const NICKNAMES: Record<string, string> = {
  bob: "robert", rob: "robert", bobby: "robert", robbie: "robert",
  bill: "william", billy: "william", will: "william", liam: "william",
  jim: "james", jimmy: "james", jamie: "james", joe: "joseph", joey: "joseph",
  mike: "michael", mikey: "michael", dave: "david",
  dick: "richard", rick: "richard", ricky: "richard", rich: "richard",
  tom: "thomas", tommy: "thomas", steve: "stephen", steven: "stephen",
  chris: "christopher", matt: "matthew", dan: "daniel", danny: "daniel",
  tony: "anthony", ed: "edward", eddie: "edward", ned: "edward",
  ben: "benjamin", benny: "benjamin", sam: "samuel", sammy: "samuel",
  beth: "elizabeth", liz: "elizabeth", lizzie: "elizabeth", betty: "elizabeth", eliza: "elizabeth",
  kate: "katherine", katie: "katherine", kathy: "katherine", cathy: "katherine", catherine: "katherine",
  peggy: "margaret", meg: "margaret", maggie: "margaret", sue: "susan", suzie: "susan",
  jen: "jennifer", jenny: "jennifer", abby: "abigail", becky: "rebecca", cindy: "cynthia",
  patty: "patricia", pat: "patricia", trish: "patricia", sandy: "sandra",
  debbie: "deborah", deb: "deborah",
};

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

// Street suffixes + directionals come from the USPS Pub 28 tables (standardize.ts), so the SAME
// comprehensive standardization applies to every voter record (at buildIndex) and every signer.
const UNIT_RE = new RegExp(`(?:#\\s*|\\b(?:${SECONDARY_UNITS.join("|")})\\b\\.?\\s*)([0-9]+[a-z]?|[a-z]\\d*)`, "i");

/** Lowercase, strip diacritics/punctuation, collapse whitespace. */
export function basic(s: string): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,'"`]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface NormName {
  first: string;
  last: string;
  middle: string;
  full: string;
}

/** Parse "Robert A. Smith Jr." or "Smith, Robert" into canonical components. */
export function normName(raw: string): NormName {
  let s = basic(raw);
  if ((raw ?? "").includes(",")) {
    const [last, rest] = raw.split(",");
    s = basic(`${rest} ${last}`);
  }
  const tokens = s.split(" ").filter(Boolean).filter((t) => !SUFFIXES.has(t));
  if (tokens.length === 0) return { first: "", last: "", middle: "", full: "" };
  const first0 = tokens[0];
  const first = NICKNAMES[first0] ?? first0;
  const last = tokens.length > 1 ? tokens[tokens.length - 1] : "";
  const middle = tokens.slice(1, -1).join(" ");
  return { first, last, middle, full: [first, middle, last].filter(Boolean).join(" ") };
}

export interface NormAddress {
  number: string;
  street: string;
  unit: string;
  zip5: string;
}

/** Parse "42 N. Main Street Apt 3, Springfield 62704" into components. */
export function normAddress(raw: string): NormAddress {
  const r = raw ?? "";
  const zip5 = r.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? "";
  let streetLine = r.split(",")[0];
  let unit = "";
  const um = streetLine.match(UNIT_RE);
  if (um) {
    unit = um[1];
    streetLine = streetLine.slice(0, um.index) + " " + streetLine.slice(um.index! + um[0].length);
  }
  const toks = basic(streetLine).split(" ").filter(Boolean);
  let number = "";
  let i = 0;
  if (toks.length && /^\d+[a-z]?$/.test(toks[0])) {
    number = toks[0].replace(/[a-z]$/, "");
    i = 1;
  }
  const street = toks.slice(i).map((t) => DIRECTIONALS[t] ?? STREET_SUFFIXES[t] ?? t).join(" ").trim();
  return { number, street, unit: unit.trim(), zip5 };
}

/** USPS-standardized address — canonical uppercase line + parsed parts. The DETERMINISTIC default
 *  (offline Pub 28 folding). For ZIP+4 / deliverability / spelling correction, implement
 *  AddressStandardizer with a CASS-certified provider and run it server-side at ingest. */
export function standardizeAddress(raw: string): StandardizedAddress {
  const a = normAddress(raw);
  const line = [a.number, a.street, a.unit ? `# ${a.unit}` : "", a.zip5].filter(Boolean).join(" ").toUpperCase();
  return { line, number: a.number, street: a.street, unit: a.unit, zip5: a.zip5 };
}

export const deterministicStandardizer: AddressStandardizer = { standardize: standardizeAddress };
