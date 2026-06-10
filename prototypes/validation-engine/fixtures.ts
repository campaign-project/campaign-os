/**
 * Synthetic fixtures — entirely fabricated. NO real voter PII ever lives in this
 * repo (the same rule that governs VOTER_FILE_ACQUISITION.md: map the files, don't
 * download the people). These rows exist only to exercise the engine's code paths.
 *
 * The signer batch is intentionally stuffed with failure modes so a single demo run
 * lights up every branch — real drives run ~80% valid, not the ~42% here.
 */

import type { VoterRecord, SignerInput } from "./match.ts";

// A fictional registered-voter file ("Springfield", invented ZIPs/streets/people).
export const VOTERS: VoterRecord[] = [
  { id: "V001", name: "Robert A. Smith", address: "42 Main St, Springfield 62704", status: "active", registeredOn: "2019-03-01", county: "Sangamon", district: "CD-1" },
  { id: "V002", name: "William Johnson", address: "88 Oak Avenue, Springfield 62704", status: "active", registeredOn: "2018-06-15", county: "Sangamon", district: "CD-1" },
  { id: "V003", name: "Elizabeth Carter", address: "17 Elm Lane, Springfield 62701", status: "active", registeredOn: "2020-01-20", county: "Sangamon", district: "CD-2" },
  { id: "V004", name: "James O'Brien", address: "230 N Park Rd, Springfield 62704", status: "inactive", registeredOn: "2017-09-10", county: "Sangamon", district: "CD-1" },
  { id: "V005", name: "Maria Gonzalez", address: "5 Sunset Blvd Apt 4, Springfield 62705", status: "active", registeredOn: "2021-11-02", county: "Sangamon", district: "CD-1" },
  { id: "V006", name: "Katherine Lee", address: "901 River Dr, Springfield 62704", status: "cancelled", registeredOn: "2016-05-05", county: "Sangamon", district: "CD-1" },
  { id: "V007", name: "Daniel Nguyen", address: "14 Birch Ct, Springfield 62704", status: "active", registeredOn: "2022-02-14", county: "Sangamon", district: "CD-1" },
  { id: "V008", name: "Patricia Williams", address: "360 Cedar Terrace, Springfield 62701", status: "active", registeredOn: "2015-08-30", county: "Sangamon", district: "CD-2" },
  { id: "V009", name: "Thomas Baker", address: "77 Maple St, Springfield 62704", status: "active", registeredOn: "2026-06-01", county: "Sangamon", district: "CD-1" },
  { id: "V010", name: "Linda Martinez", address: "612 Walnut Ave, Springfield 62705", status: "active", registeredOn: "2019-07-22", county: "Sangamon", district: "CD-1" },
  { id: "V011", name: "Charles Davis", address: "29 Pine St, Springfield 62704", status: "active", registeredOn: "2014-04-04", county: "Sangamon", district: "CD-1" },
  { id: "V012", name: "Barbara Wilson", address: "150 Lake Rd, Springfield 62701", status: "active", registeredOn: "2023-09-09", county: "Sangamon", district: "CD-2" },
];

// A petition batch. Each row is annotated with the outcome it is built to produce.
export const SIGNERS: SignerInput[] = [
  // VALID — nickname (Bob→Robert) + street-type fold (Street→St)
  { id: "S01", name: "Bob Smith", address: "42 Main Street, Springfield 62704", signedOn: "2026-05-01", gatherer: "Ava", capture: "wet" },
  // VALID — nickname (Will→William) + abbrev (Ave)
  { id: "S02", name: "Will Johnson", address: "88 Oak Ave, Springfield 62704", signedOn: "2026-05-01", gatherer: "Ben", capture: "digital" },
  // INVALID — matches V004 but that voter is INACTIVE
  { id: "S03", name: "James O'Brien", address: "230 North Park Road, Springfield 62704", signedOn: "2026-05-02", gatherer: "Ben", capture: "wet" },
  // INVALID — matches V006 but that voter is CANCELLED
  { id: "S04", name: "Katherine Lee", address: "901 River Drive, Springfield 62704", signedOn: "2026-05-02", gatherer: "Cara", capture: "wet" },
  // VALID — surname typo (Gonzales vs Gonzalez) caught by Jaro-Winkler + unit fold
  { id: "S05", name: "Maria Gonzales", address: "5 Sunset Blvd #4, Springfield 62705", signedOn: "2026-05-03", gatherer: "Ava", capture: "digital" },
  // INVALID — DUPLICATE of S01 (same voter V001 signs twice)
  { id: "S06", name: "Robert Smith", address: "42 Main St, Springfield 62704", signedOn: "2026-05-10", gatherer: "Cara", capture: "wet" },
  // INVALID — matches V009 but that voter registered AFTER the signing date
  { id: "S07", name: "Tom Baker", address: "77 Maple Street, Springfield 62704", signedOn: "2026-05-01", gatherer: "Cara", capture: "wet" },
  // INVALID — no such voter (not registered)
  { id: "S08", name: "Gregory Fox", address: "1200 Hill Rd, Springfield 62704", signedOn: "2026-05-04", gatherer: "Ava", capture: "wet" },
  // NEEDS_REVIEW — same surname + address as V003 but a different first name (Katy vs
  // Elizabeth) — likely a relative at the same household; below the auto-accept band
  { id: "S09", name: "Katy Carter", address: "17 Elm Lane, Springfield 62701", signedOn: "2026-05-05", gatherer: "Ben", capture: "wet" },
  // VALID — clean match to active voter V007
  { id: "S10", name: "Daniel Nguyen", address: "14 Birch Ct, Springfield 62704", signedOn: "2026-05-05", gatherer: "Ava", capture: "digital" },
  // VALID — clean match to active voter V008
  { id: "S11", name: "Patricia Williams", address: "360 Cedar Ter, Springfield 62701", signedOn: "2026-05-06", gatherer: "Ben", capture: "wet" },
  // INVALID — DUPLICATE of S11 (V008 again, nickname Pat→Patricia)
  { id: "S12", name: "Pat Williams", address: "360 Cedar Terrace, Springfield 62701", signedOn: "2026-05-11", gatherer: "Cara", capture: "wet" },
];

// North Dakota — no voter registration exists; nothing to match against.
export const ND_SIGNERS: SignerInput[] = [
  { id: "N01", name: "Erik Halvorsen", address: "12 Prairie Ave, Bismarck 58501", signedOn: "2026-05-01", gatherer: "Dana", capture: "wet", attestedResident: true },
  { id: "N02", name: "Greta Olson", address: "9 Dakota St, Fargo 58102", signedOn: "2026-05-01", gatherer: "Dana", capture: "wet", attestedResident: false },
];

// New Jersey — assembled county-by-county. We loaded Essex's file but not Bergen's.
export const NJ_VOTERS: VoterRecord[] = [
  { id: "NJ001", name: "Anthony Russo", address: "5 Bloomfield Ave, Newark 07104", status: "active", registeredOn: "2019-01-01", county: "Essex" },
];
export const NJ_SIGNERS: SignerInput[] = [
  // county loaded (Essex) + matches → VALID
  { id: "J01", name: "Tony Russo", address: "5 Bloomfield Avenue, Newark 07104", signedOn: "2026-05-01", county: "Essex", gatherer: "Eli", capture: "wet" },
  // county NOT loaded (Bergen) → can't verify → NEEDS_REVIEW
  { id: "J02", name: "Sofia Marino", address: "20 Main St, Hackensack 07601", signedOn: "2026-05-01", county: "Bergen", gatherer: "Eli", capture: "wet" },
];
