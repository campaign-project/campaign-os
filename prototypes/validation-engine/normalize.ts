/**
 * Normalization — fold the cosmetic differences that make the SAME person look
 * like two different people across a petition line and a voter-file row.
 *
 * Petition signers hand-write their name and address; voter files are keyed by an
 * election official. "Bob Smith / 42 Main St" and "Robert A Smith / 42 Main Street"
 * are the same elector. This module produces canonical forms + a parsed address so
 * the matcher (match.ts) compares apples to apples.
 *
 * NO network, NO LLM — pure string work. Same design as the citation-grounding
 * normalizer: deterministic, auditable, fast.
 */

// Common given-name → canonical-root nicknames. Real systems use a large curated
// table (e.g. the SSA / genealogy nickname corpora); this is a representative slice
// to demonstrate the mechanism. Both directions collapse to the same root.
const NICKNAMES: Record<string, string> = {
  bob: "robert", rob: "robert", bobby: "robert", robbie: "robert",
  bill: "william", billy: "william", will: "william", liam: "william",
  jim: "james", jimmy: "james", jamie: "james",
  joe: "joseph", joey: "joseph",
  mike: "michael", mikey: "michael",
  dave: "david",
  dick: "richard", rick: "richard", ricky: "richard", rich: "richard",
  tom: "thomas", tommy: "thomas",
  steve: "stephen", steven: "stephen",
  chris: "christopher",
  matt: "matthew",
  dan: "daniel", danny: "daniel",
  tony: "anthony",
  ed: "edward", eddie: "edward", ned: "edward",
  ben: "benjamin", benny: "benjamin",
  sam: "samuel", sammy: "samuel",
  beth: "elizabeth", liz: "elizabeth", lizzie: "elizabeth", betty: "elizabeth", eliza: "elizabeth",
  kate: "katherine", katie: "katherine", kathy: "katherine", cathy: "katherine", catherine: "katherine",
  peggy: "margaret", meg: "margaret", maggie: "margaret",
  sue: "susan", suzie: "susan",
  jen: "jennifer", jenny: "jennifer",
  abby: "abigail",
  becky: "rebecca",
  cindy: "cynthia",
  patty: "patricia", pat: "patricia", trish: "patricia",
  sandy: "sandra",
  debbie: "deborah", deb: "deborah",
};

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

// USPS-ish street-type abbreviation fold (both directions → a single token).
const STREET_TYPES: Record<string, string> = {
  street: "st", st: "st",
  avenue: "ave", ave: "ave", av: "ave",
  road: "rd", rd: "rd",
  drive: "dr", dr: "dr",
  lane: "ln", ln: "ln",
  court: "ct", ct: "ct",
  boulevard: "blvd", blvd: "blvd",
  place: "pl", pl: "pl",
  circle: "cir", cir: "cir",
  terrace: "ter", ter: "ter",
  highway: "hwy", hwy: "hwy",
  parkway: "pkwy", pkwy: "pkwy",
  way: "way",
  trail: "trl", trl: "trl",
};

const DIRECTIONALS: Record<string, string> = {
  north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w",
  northeast: "ne", ne: "ne", northwest: "nw", nw: "nw",
  southeast: "se", se: "se", southwest: "sw", sw: "sw",
};

/** Lowercase, strip diacritics/punctuation, collapse whitespace. */
export function basic(s: string): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/[.,'"`]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface NormName {
  first: string; // canonical (nickname-folded) first token
  last: string;
  middle: string; // remaining middle tokens, space-joined
  full: string;
}

/** Parse "Robert A. Smith Jr." or "Smith, Robert" into canonical components. */
export function normName(raw: string): NormName {
  let s = basic(raw);
  // "Last, First Middle" → "First Middle Last"
  if (raw.includes(",")) {
    const [last, rest] = raw.split(",");
    s = basic(`${rest} ${last}`);
  }
  let tokens = s.split(" ").filter(Boolean).filter((t) => !SUFFIXES.has(t));
  if (tokens.length === 0) return { first: "", last: "", middle: "", full: "" };
  const first0 = tokens[0];
  const first = NICKNAMES[first0] ?? first0;
  const last = tokens.length > 1 ? tokens[tokens.length - 1] : "";
  const middle = tokens.slice(1, -1).join(" ");
  return { first, last, middle, full: [first, middle, last].filter(Boolean).join(" ") };
}

export interface NormAddress {
  number: string; // primary house/building number ("" if none parsed)
  street: string; // canonical street name w/ directionals + type folded
  unit: string; // apt/unit/suite ("" if none)
  zip5: string; // 5-digit ZIP ("" if none)
  full: string; // canonical single-line form for display/scoring
}

// Unit designator on the RAW street line (before basic() strips the "#"): a "#" or
// a unit word (apt/suite/...) followed by the unit token.
const UNIT_RE = /(?:#\s*|\b(?:apt|apartment|unit|ste|suite|no|num|bldg|fl|floor|rm|room)\b\.?\s*)([0-9]+[a-z]?|[a-z]\d*)/i;

/** Parse "42 N. Main Street Apt 3, Springfield 62704" into components. */
export function normAddress(raw: string): NormAddress {
  const r = raw ?? "";
  // Pull a 5-digit ZIP if present anywhere.
  const zip5 = r.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? "";

  // Detect + excise the unit from the raw street line BEFORE punctuation-stripping
  // (basic() would otherwise delete the "#" and the unit would fold into the street).
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
    number = toks[0].replace(/[a-z]$/, ""); // 42b -> 42
    i = 1;
  }

  const canonStreet = toks
    .slice(i)
    .map((t) => DIRECTIONALS[t] ?? STREET_TYPES[t] ?? t)
    .join(" ")
    .trim();

  return {
    number,
    street: canonStreet,
    unit: unit.trim(),
    zip5,
    full: [number, canonStreet, unit ? `#${unit}` : "", zip5].filter(Boolean).join(" "),
  };
}
