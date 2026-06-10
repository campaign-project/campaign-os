/**
 * Gather — the per-campaign voter index (device-side consumer of the loader output).
 *
 * Each campaign validates against ITS OWN geography's voters. The index artifacts in ./indexes/
 * are produced by the build-time loader (scripts/build-indexes.mts), which runs the validation-
 * engine's real per-state adapters over a (currently synthetic) voter file, SCOPED to the
 * campaign's zips, and emits only the canonical fields the matcher needs — so DOB/phone/etc. never
 * leave the server (minimization is inherent to the adapter, see build-indexes.mts + the lawful-
 * basis memo). This module just loads an artifact and builds the engine index from it.
 *
 * To regenerate artifacts:  node --experimental-strip-types scripts/build-indexes.mts
 * To go from synthetic → real voter data: point build-indexes.mts at the real (lawful-basis-gated)
 * state file. Nothing here changes — the artifact shape is identical.
 */
import { buildIndex, type VoterIndex, type VoterRecord } from "@campaign-os/engine";
import ohArtifact from "./indexes/oh-minwage.json";
import okArtifact from "./indexes/ok-sick-leave.json";
import waArtifact from "./indexes/wa-housing.json";
import ncArtifact from "./indexes/nc-independent.json";

export interface Example { label: string; name: string; address: string }

export interface IndexSource {
  adapter: string;
  format: string;
  layoutDocUrl?: string;
  downloadUrl?: string;
  verifiedAsOf?: string;
  confidence?: string;
}
interface IndexArtifact {
  campaignId: string;
  jurisdiction: string;
  scopedZips: string[];
  builtAt: string;
  version: string;
  source: IndexSource;
  voterCount: number;
  voters: VoterRecord[];
}

// JSON imports widen status to string; the loader already constrained it to the VoterRecord union.
const ARTIFACTS: Record<string, IndexArtifact> = {
  "oh-minwage": ohArtifact as unknown as IndexArtifact,
  "ok-sick-leave": okArtifact as unknown as IndexArtifact,
  "wa-housing": waArtifact as unknown as IndexArtifact,
  "nc-independent": ncArtifact as unknown as IndexArtifact,
};

// Quick-fill examples — reproduce the five verdict bands per campaign (clean nickname, surname-typo
// fuzzy, gray-band wrong first name, inactive voter, off-file). Addresses match each artifact above.
const EXAMPLES_BY_CAMPAIGN: Record<string, Example[]> = {
  "oh-minwage": [
    { label: "Clean match", name: "Bob Smith", address: "42 Main Street, Columbus 43210" },
    { label: "Fuzzy → counts", name: "Maria Gonzales", address: "5 Sunset Blvd #4, Columbus 43210" },
    { label: "Gray band", name: "Katy Carter", address: "17 Elm Lane, Columbus 43210" },
    { label: "Inactive voter", name: "James O'Brien", address: "230 North High St, Columbus 43201" },
    { label: "Not on file", name: "Jordan Avery", address: "9 Unknown Way, Columbus 43210" },
  ],
  "ok-sick-leave": [
    { label: "Clean match", name: "Bob Smith", address: "120 Robinson Avenue, Oklahoma City 73102" },
    { label: "Fuzzy → counts", name: "Maria Gonzales", address: "5 Sheridan Ave #4, Oklahoma City 73102" },
    { label: "Gray band", name: "Katy Carter", address: "17 Walnut Ave, Oklahoma City 73104" },
    { label: "Inactive voter", name: "James O'Brien", address: "230 North Broadway Ave, Oklahoma City 73102" },
    { label: "Not on file", name: "Jordan Avery", address: "9 Unknown Way, Oklahoma City 73104" },
  ],
  "wa-housing": [
    { label: "Clean match", name: "Bob Smith", address: "4500 University Way Northeast, Seattle 98105" },
    { label: "Fuzzy → counts", name: "Maria Gonzales", address: "5 Ravenna Blvd #4, Seattle 98115" },
    { label: "Gray band", name: "Katy Carter", address: "17 Brooklyn Ave NE, Seattle 98105" },
    { label: "Inactive voter", name: "James O'Brien", address: "230 Northeast 45th St, Seattle 98105" },
    { label: "Not on file", name: "Jordan Avery", address: "9 Unknown Way, Seattle 98115" },
  ],
  "nc-independent": [
    { label: "Clean match", name: "Bob Smith", address: "100 North Tryon Street, Charlotte 28202" },
    { label: "Fuzzy → counts", name: "Maria Gonzales", address: "5 W Trade St #4, Charlotte 28202" },
    { label: "Gray band", name: "Katy Carter", address: "17 S College St, Charlotte 28202" },
    { label: "Inactive voter", name: "James O'Brien", address: "230 E 7th St, Charlotte 28204" },
    { label: "Not on file", name: "Jordan Avery", address: "9 Unknown Way, Charlotte 28202" },
  ],
};

export interface CampaignIndex {
  index: VoterIndex;
  voters: VoterRecord[]; // raw records — the delta base the device applies upserts/removals against
  voterCount: number;
  jurisdiction: string;
  builtAt: string;
  version: string;
  source: IndexSource;
}

const cache = new Map<string, CampaignIndex>();

/** Load the campaign's index artifact and build the on-device matcher index from it (memoized). */
export function buildCampaignIndex(campaignId: string): CampaignIndex {
  const cached = cache.get(campaignId);
  if (cached) return cached;
  const a = ARTIFACTS[campaignId] ?? ARTIFACTS["oh-minwage"];
  const built: CampaignIndex = {
    index: buildIndex(a.voters),
    voters: a.voters,
    voterCount: a.voterCount,
    jurisdiction: a.jurisdiction,
    builtAt: a.builtAt,
    version: a.version,
    source: a.source,
  };
  cache.set(campaignId, built);
  return built;
}

export function getExamples(campaignId: string): Example[] {
  return EXAMPLES_BY_CAMPAIGN[campaignId] ?? EXAMPLES_BY_CAMPAIGN["oh-minwage"];
}
