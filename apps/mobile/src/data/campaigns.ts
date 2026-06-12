/**
 * Gather — campaign directory (self-serve).
 *
 * Instead of being routed by a partner, a circulator picks an ACTIVE campaign that's gathering near
 * them and starts — of their own free will (the PLG / bottom-up GTM). Each campaign carries
 * everything the briefing + engine need: jurisdiction (drives the verification mode), the measure,
 * turf, target, deadline, compensation (compliance-driven), and the official forms.
 *
 * ⚠️ SEED DATA — ILLUSTRATIVE. These three are realistic stand-ins for the live free-file-state
 * initiative sandbox (see GATHER_SELF_SERVE_GTM.md): of the 7 free-voter-file states, only OH/OK/WA
 * have a usable citizen-initiative process still collecting for Nov 2026 (NC/VT have none; MS's was
 * struck down 2021; FL's window closed ~Feb 1). Titles/orgs/numbers/deadlines MUST be verified
 * against Ballotpedia + each Secretary of State before going live. The voter index is shared
 * synthetic Ohio data for now — production ships a per-campaign per-geography index.
 */
import type { Destination, Compensation, PetitionForm } from "./synced";

export interface Campaign {
  id: string;
  title: string;                 // the measure, in plain language
  org: string;                   // the committee running it
  status: string;                // e.g. "Gathering now"
  jurisdiction: string;          // engine context key (drives verificationMode)
  petition: string;              // petition-type description
  petitionType: string;          // BallotAccessDB petitionType
  freeFile: boolean;             // free-voter-file state (the lawful-basis sandbox)
  area: string;                  // human-readable turf
  areaShort: string;             // compact turf label for the working top bar
  zips: string[];
  turf?: string[];               // RFC-002-A1: tile cells this assignment covers. Present → the device
                                 //   loads just these turf tiles (~1MB) instead of the whole-campaign
                                 //   index; absent → the monolithic index (graceful fallback).
  venue?: boolean;               // RFC-002-A1 Tier 1b: venue/booth assignment (dispersed crowd) → also
                                 //   prefetch the eligible-set membership filter for offline "appears
                                 //   registered" on out-of-turf signers.
  destination: Destination;      // navigable meeting point
  shiftTargetValid: number;      // valid signatures to gather THIS shift
  statewideRequired: number;     // valid signatures to make the ballot (verify w/ BallotAccessDB)
  deadline: string;              // ISO filing deadline
  expectedValidity: number;      // prior from the yield store (0–1)
  compensation: Compensation;    // how this pays (per-state, compliance-driven)
  forms: PetitionForm[];         // official sheets to print
  directive: string;             // the "next best move" one-liner
  indexAsOf: string;             // freshness of the synced voter slice
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "oh-minwage",
    title: "Ohio Minimum Wage Increase",
    org: "Raise the Wage Ohio",
    status: "Gathering now",
    jurisdiction: "Ohio",
    petition: "Initiated constitutional amendment · $15 minimum wage",
    petitionType: "initiated-constitutional-amendment",
    freeFile: true,
    // RFC-002-A1 turf = OSU campus-core precincts (ZIP 43210 — the "dorm gates" the directive targets),
    // from the real Franklin County tile build (build-tiles.mts manifest). ~3.6k voters / 8 precinct tiles.
    turf: ["25__25-blk", "25__25-bkv", "25__25-bll", "25__25-aif", "25__25-aih", "25__25-ahz", "25__25-bku", "25__25-ade"],
    venue: true, // statewide initiative + dense campus crowd → also carry the eligible-set membership filter (Tier 1b)
    area: "Franklin County — OSU campus district",
    areaShort: "OSU campus · 43210",
    zips: ["43201", "43210"],
    destination: { label: "OSU campus — 43210 dorm gates", lat: 40.0017, lng: -83.0197 },
    shiftTargetValid: 35,
    statewideRequired: 413000,
    deadline: "2026-07-01",
    expectedValidity: 0.74,
    compensation: {
      basis: "per-valid-signature",
      rate: 2.0,
      currency: "USD",
      note: "Paid per VALID signature — review and duplicate lines don't pay.",
    },
    forms: [
      { name: "Initiative petition part-petition", url: "https://www.ohiosos.gov/elections/elections-officials/forms-petitions/", note: "Statewide initiative sheet" },
      { name: "Circulator statement & instructions", url: "https://www.ohiosos.gov/elections/elections-officials/forms-petitions/", note: "Read before circulating" },
    ],
    directive: "Work the 43210 dorm gates 4–7pm — highest valid-per-hour in the model.",
    indexAsOf: "2026-06-07",
  },
  {
    id: "ok-sick-leave",
    title: "Oklahoma Paid Sick Leave",
    org: "Oklahomans for a Healthy Economy",
    status: "Gathering now",
    jurisdiction: "Oklahoma",
    petition: "Initiated state statute · earned paid sick leave",
    petitionType: "initiated-statute",
    freeFile: true,
    area: "Oklahoma County — downtown OKC & Bricktown",
    areaShort: "Downtown OKC · 73102",
    zips: ["73102", "73104"],
    destination: { label: "Bricktown — Oklahoma City", lat: 35.4676, lng: -97.5164 },
    shiftTargetValid: 30,
    statewideRequired: 92000,
    deadline: "2026-08-15",
    expectedValidity: 0.7,
    compensation: {
      basis: "hourly",
      rate: 20.0,
      currency: "USD",
      note: "Per-signature pay is restricted here — circulators are paid hourly.",
    },
    forms: [
      { name: "Initiative petition (State Question)", url: "https://oklahoma.gov/elections.html", note: "OK SoS initiative pamphlet" },
      { name: "Circulator affidavit", url: "https://oklahoma.gov/elections.html", note: "Notarized per sheet" },
    ],
    directive: "Bricktown foot traffic peaks Fri/Sat evenings — highest yield window.",
    indexAsOf: "2026-06-06",
  },
  {
    id: "wa-housing",
    title: "Washington Housing Affordability Act",
    org: "Home WA",
    status: "Gathering now",
    jurisdiction: "Washington",
    petition: "Initiative to the People · housing & rent stabilization",
    petitionType: "initiated-statute",
    freeFile: true,
    area: "King County — UW U-District",
    areaShort: "U-District · 98105",
    zips: ["98105", "98115"],
    destination: { label: "UW — University District, Seattle", lat: 47.6553, lng: -122.3035 },
    shiftTargetValid: 40,
    statewideRequired: 325000,
    deadline: "2026-07-02",
    expectedValidity: 0.77,
    compensation: {
      basis: "volunteer",
      rate: 2.0,
      currency: "USD",
      note: "Volunteer drive — every valid signature is impact, not a paycheck.",
    },
    forms: [
      { name: "Initiative petition sheet", url: "https://www.sos.wa.gov/elections/initiatives-and-referenda", note: "WA SoS initiative form" },
      { name: "Circulator instructions", url: "https://www.sos.wa.gov/elections/initiatives-and-referenda", note: "Read before circulating" },
    ],
    directive: "The Ave (University Way) midday — students register here, high valid rate.",
    indexAsOf: "2026-06-07",
  },
  {
    id: "nc-independent",
    title: "Independent U.S. Senate — North Carolina",
    org: "Carolina Independents",
    status: "Gathering now",
    jurisdiction: "North Carolina",
    petition: "Unaffiliated candidate · statewide ballot-access petition",
    petitionType: "candidate-statewide",
    freeFile: true,
    area: "Mecklenburg County — Charlotte",
    areaShort: "Charlotte · 28202",
    zips: ["28202", "28203", "28204", "28205", "28211"],
    turf: ["mecklenburg__074"], // RFC-002-A1 demo: this assignment's turf = Kirk's precinct (~688KB tile)
    venue: true,                // statewide petition → also carry the eligible-set membership filter (Tier 1b)

    destination: { label: "Uptown Charlotte — Tryon St", lat: 35.2271, lng: -80.8431 },
    shiftTargetValid: 40,
    statewideRequired: 85000, // NC unaffiliated statewide ≈ 1.5% of last gov vote — verify vs NCSBE/BallotAccessDB
    deadline: "2026-06-26",
    expectedValidity: 0.72,
    compensation: {
      basis: "per-valid-signature",
      rate: 2.5,
      currency: "USD",
      note: "Paid per VALID signature — review and duplicate lines don't pay.",
    },
    forms: [
      { name: "Unaffiliated candidate petition", url: "https://www.ncsbe.gov/candidates", note: "NCSBE candidate ballot-access" },
      { name: "Circulation instructions", url: "https://www.ncsbe.gov/candidates", note: "Read before circulating" },
    ],
    directive: "Uptown lunch crowds on Tryon St 11–2 — dense active registrations.",
    indexAsOf: "2026-06-09",
  },
];
