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
import type { VoterRecord } from "./match";

interface Entry { rec: VoterRecord; tokens: string[]; number: string }

const corpusCache = new WeakMap<VoterRecord[], Entry[]>();

function corpusFor(voters: VoterRecord[]): Entry[] {
  let c = corpusCache.get(voters);
  if (c) return c;
  c = voters.map((rec) => {
    const n = normName(rec.name);
    const a = normAddress(rec.address);
    // The searchable token set: name parts + street words + ZIP. (City is dropped by normAddress;
    // unmatched query words simply don't score, so typing a city doesn't hurt.)
    const tokens = [n.first, n.middle, n.last, ...a.street.split(" "), a.zip5].filter(Boolean);
    return { rec, tokens, number: a.number };
  });
  corpusCache.set(voters, c);
  return c;
}

/**
 * Rank the turf's voters against a free-text query (name and/or address, in any order).
 * Additive scoring — exact token = 3, prefix = 2, exact house number = 4 — so more matching
 * tokens float the right voter up; unmatched tokens are ignored (not disqualifying). Returns the
 * top `limit` records with score ≥ 2 (one decent match), so junk input yields nothing.
 */
export function suggestVoters(query: string, voters: VoterRecord[], limit = 6): VoterRecord[] {
  const qtoks = basic(query).split(" ").filter((t) => t.length >= 2);
  if (qtoks.length === 0 || voters.length === 0) return [];

  const entries = corpusFor(voters);
  const hits: Array<{ rec: VoterRecord; score: number }> = [];
  for (const e of entries) {
    let score = 0;
    for (const q of qtoks) {
      let best = 0;
      if (/^\d+$/.test(q) && e.number === q) best = 4;
      else {
        for (const t of e.tokens) {
          if (t === q) { best = 3; break; }
          if (t.startsWith(q)) best = best < 2 ? 2 : best;
        }
      }
      score += best;
    }
    if (score >= 2) {
      if (e.rec.status === "active") score += 0.5; // gentle nudge for active registrations
      hits.push({ rec: e.rec, score });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.rec);
}
