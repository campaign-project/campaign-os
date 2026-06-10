/**
 * @campaign-os/engine — USPS address standardization tables (Publication 28).
 *
 * Folding the cosmetic ways the SAME address is written ("Street/St", "Boulevard/Blvd",
 * "North/N", "Apartment/Apt/#") to one canonical form so a petition signer's typed address and the
 * voter-file record collapse to the same tokens. Used by normalize.ts for BOTH sides of every match
 * (and applied to every voter record at buildIndex), so standardization is consistent end to end.
 *
 * This is DETERMINISTIC standardization — it cannot do what a CASS-certified service does (ZIP+4,
 * delivery-point validation, spelling/alias correction, completing partial addresses). For that,
 * implement `AddressStandardizer` with a certified provider (Smarty, USPS Web Tools, Lob) and run it
 * server-side at ingest; the device still only receives standardized canonical records.
 */

// Canonical USPS suffix abbreviation → every spelling that maps to it (incl. the abbreviation).
// Lowercased (normalize lowercases before lookup). Covers the overwhelming majority of US addresses.
const SUFFIX_GROUPS: Record<string, string[]> = {
  st: ["st", "street", "str", "strt"],
  ave: ["ave", "avenue", "av", "aven", "avenu", "avn", "avnue"],
  blvd: ["blvd", "boulevard", "boul", "boulv", "blv"],
  rd: ["rd", "road"],
  dr: ["dr", "drive", "drv", "driv"],
  ln: ["ln", "lane", "la"],
  ct: ["ct", "court", "crt"],
  cir: ["cir", "circle", "circ", "circl", "crcl"],
  pl: ["pl", "place"],
  ter: ["ter", "terrace", "terr"],
  hwy: ["hwy", "highway", "hiway", "hiwy", "hway", "highwy"],
  pkwy: ["pkwy", "parkway", "pky", "parkwy", "pkway"],
  trl: ["trl", "trail", "trails", "trls"],
  way: ["way", "wy"],
  loop: ["loop"],
  sq: ["sq", "square", "sqr", "squ"],
  plz: ["plz", "plaza", "plza"],
  pt: ["pt", "point", "pte"],
  pts: ["pts", "points"],
  trce: ["trce", "trace"],
  xing: ["xing", "crossing", "crssng"],
  cv: ["cv", "cove"],
  crk: ["crk", "creek"],
  bnd: ["bnd", "bend"],
  blf: ["blf", "bluff"],
  br: ["br", "branch"],
  brg: ["brg", "bridge"],
  brk: ["brk", "brook"],
  byp: ["byp", "bypass"],
  ctr: ["ctr", "center", "cen", "cent", "centre", "cnter", "cntr"],
  cyn: ["cyn", "canyon", "canyn", "cnyn"],
  cres: ["cres", "crescent", "crsent", "crsnt"],
  est: ["est", "estate"],
  ests: ["ests", "estates"],
  expy: ["expy", "expressway", "exp", "expr", "express", "expw"],
  ext: ["ext", "extension", "extn", "extnsn"],
  fld: ["fld", "field"],
  flds: ["flds", "fields"],
  frst: ["frst", "forest", "forests"],
  fwy: ["fwy", "freeway", "freewy", "frway", "frwy"],
  gdn: ["gdn", "garden", "gardn", "grden", "grdn"],
  gdns: ["gdns", "gardens", "grdns"],
  grn: ["grn", "green"],
  grv: ["grv", "grove", "grov"],
  hbr: ["hbr", "harbor", "harb", "harbr", "hrbor"],
  hl: ["hl", "hill"],
  hls: ["hls", "hills"],
  holw: ["holw", "hollow", "hllw", "hollows", "holws"],
  hts: ["hts", "heights", "ht"],
  is: ["is", "island", "islnd"],
  jct: ["jct", "junction", "jction", "jctn", "junctn", "juncton"],
  knl: ["knl", "knoll", "knol"],
  lk: ["lk", "lake"],
  lks: ["lks", "lakes"],
  lndg: ["lndg", "landing", "lndng"],
  ldg: ["ldg", "lodge", "ldge", "lodg"],
  mdw: ["mdw", "meadow"],
  mdws: ["mdws", "meadows", "medows"],
  ml: ["ml", "mill"],
  mls: ["mls", "mills"],
  mnr: ["mnr", "manor"],
  mt: ["mt", "mount", "mnt"],
  mtn: ["mtn", "mountain", "mntain", "mntn", "mountin", "mtin"],
  orch: ["orch", "orchard", "orchrd"],
  oval: ["oval", "ovl"],
  park: ["park", "prk", "parks"],
  pass: ["pass"],
  path: ["path", "paths"],
  pike: ["pike", "pikes"],
  pln: ["pln", "plain"],
  prt: ["prt", "port"],
  rdg: ["rdg", "ridge", "rdge"],
  riv: ["riv", "river", "rvr", "rivr"],
  rte: ["rte", "route"],
  row: ["row"],
  run: ["run"],
  shr: ["shr", "shore", "shoar"],
  spg: ["spg", "spring", "spng", "sprng"],
  sta: ["sta", "station", "statn", "stn"],
  smt: ["smt", "summit", "sumit", "sumitt"],
  vly: ["vly", "valley", "vally", "vlly"],
  vw: ["vw", "view"],
  vlg: ["vlg", "village", "vill", "villag", "villg", "villiage"],
  vis: ["vis", "vista", "vist", "vst", "vsta"],
  walk: ["walk", "walks"],
};

/** Flat alias → canonical USPS abbreviation. */
export const STREET_SUFFIXES: Record<string, string> = {};
for (const [canon, aliases] of Object.entries(SUFFIX_GROUPS)) {
  for (const a of aliases) STREET_SUFFIXES[a] = canon;
}

/** Directionals → canonical abbreviation (pre/post-directional). */
export const DIRECTIONALS: Record<string, string> = {
  north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w",
  northeast: "ne", ne: "ne", northwest: "nw", nw: "nw",
  southeast: "se", se: "se", southwest: "sw", sw: "sw",
};

/** Secondary-unit designators (USPS Pub 28 C2) the parser recognizes before a unit number. */
export const SECONDARY_UNITS: string[] = [
  "apt", "apartment", "unit", "ste", "suite", "bldg", "building", "fl", "floor",
  "rm", "room", "no", "num", "dept", "department", "spc", "space", "stop", "trlr",
  "trailer", "lot", "slip", "pier", "hngr", "hangar", "key", "ph",
];

/**
 * A pluggable address standardizer. The default folds USPS Pub 28 abbreviations offline (see
 * normalize.ts `standardizeAddress` / `deterministicStandardizer`). A CASS-certified provider
 * implements this same shape to ADD ZIP+4, deliverability validation, and spelling/alias correction
 * — drop it in at ingest server-side; the device still only sees standardized records.
 */
export interface StandardizedAddress { line: string; number: string; street: string; unit: string; zip5: string }
export interface AddressStandardizer { standardize(raw: string): StandardizedAddress }
