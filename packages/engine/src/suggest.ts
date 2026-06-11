/**
 * @campaign-os/engine — typeahead suggestions over the bounded local voter index.
 *
 * Powers in-app address/name autocomplete: as the circulator types (or dictates) a signer, surface
 * the registered voters in the synced turf so a tap fills name+address AND pre-resolves the match
 * (→ instant VALID). Same normalization as the matcher, so it's robust to the messy, unpunctuated,
 * run-on text that voice dictation produces — extra/garbled tokens just don't score; the name +
 * street still narrow to the right person. Pure + framework-agnostic (server, RN, browser).
 *
 * Corpus is memoized per voter-array reference (WeakMap) so the per-voter normalization runs once,
 * not on every keystroke — the array ref is stable between syncs.
 */
import { basic, normName, normAddress } from "./normalize";
import { STREET_SUFFIXES, DIRECTIONALS } from "./standardize";
import type { VoterRecord } from "./match";

// Generic street-type / directional words ("st", "rd", "ave", "n"…) — too common to be a real match
// signal on their own, so they don't qualify a voter; a street match must hit a distinctive word.
const STOP = new Set<string>(
  [...Object.keys(STREET_SUFFIXES), ...Object.values(STREET_SUFFIXES), ...Object.keys(DIRECTIONALS), ...Object.values(DIRECTIONALS)]
    .map((s) => String(s).toLowerCase()),
);

interface Entry { rec: VoterRecord; name: string[]; street: string[]; number: string }

const corpusCache = new WeakMap<VoterRecord[], Entry[]>();

function corpusFor(voters: VoterRecord[]): Entry[] {
  let c = corpusCache.get(voters);
  if (c) return c;
  c = voters.map((rec) => {
    const n = normName(rec.name);
    const a = normAddress(rec.address);
    const name = [n.first, n.middle, n.last].filter(Boolean);
    const street = a.street.split(" ").filter((w) => w && !STOP.has(w)); // distinctive street words only
    return { rec, name, street, number: a.number };
  });
  corpusCache.set(voters, c);
  return c;
}

/**
 * Rank the turf's voters against a free-text query (name and/or address, in any order). A voter only
 * qualifies on a REAL match — a name hit, OR a genuine address hit (house number + a distinctive
 * street word) — so a lone street-type word ("st") or a bare house number never floods the list, and
 * an out-of-turf address correctly returns nothing (the caller then falls back to global address
 * autocomplete). Additive scoring (exact word = 3, prefix = 2, house number = +4) ranks the rest.
 */
export function suggestVoters(query: string, voters: VoterRecord[], limit = 6): VoterRecord[] {
  const qtoks = basic(query).split(" ").filter((t) => t.length >= 2);
  if (qtoks.length === 0 || voters.length === 0) return [];

  const entries = corpusFor(voters);
  const hits: Array<{ rec: VoterRecord; score: number }> = [];
  for (const e of entries) {
    let nameScore = 0, streetScore = 0, numHit = false;
    for (const q of qtoks) {
      if (/^\d+$/.test(q)) { if (e.number === q) numHit = true; continue; }
      let nb = 0;
      for (const t of e.name) { if (t === q) { nb = 3; break; } if (t.startsWith(q)) nb = Math.max(nb, 2); }
      let sb = 0;
      for (const t of e.street) { if (t === q) { sb = 3; break; } if (t.startsWith(q)) sb = Math.max(sb, 2); }
      nameScore += nb; streetScore += sb;
    }
    if (!(nameScore > 0 || (numHit && streetScore > 0))) continue; // real match required
    let score = nameScore + streetScore + (numHit ? 4 : 0);
    if (e.rec.status === "active") score += 0.5; // gentle nudge for active registrations
    hits.push({ rec: e.rec, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.rec);
}
