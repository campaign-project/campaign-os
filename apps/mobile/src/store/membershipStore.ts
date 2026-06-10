/**
 * Gather — the membership-filter store (RFC-002-A1 Tier 1b, "the ballpark case").
 *
 * For a venue/booth assignment (dispersed crowd, no signal), the device prefetches the campaign's
 * eligible-set Bloom filter (~10MB of hashed bits) so a signer who's in NO loaded turf tile can still
 * be confirmed OFFLINE: "appears registered — we'll verify on sync." Fetched once, decoded, held in
 * memory (no records, so a lost phone leaks nothing browsable). Null until loaded / if the backend
 * has none — the caller simply doesn't show the Tier-1b hint.
 */
import { useEffect, useState } from "react";
import { getMembership } from "../net/sync";
import { loadFilter, type LoadedFilter } from "@campaign-os/engine";

const cache = new Map<string, LoadedFilter>();
const pulling = new Set<string>();

export function useMembershipFilter(campaignId: string, enabled: boolean): LoadedFilter | null {
  const [filter, setFilter] = useState<LoadedFilter | null>(() => cache.get(campaignId) ?? null);
  useEffect(() => {
    if (!enabled || cache.has(campaignId)) { setFilter(cache.get(campaignId) ?? null); return; }
    if (pulling.has(campaignId)) return;
    pulling.add(campaignId);
    let alive = true;
    getMembership(campaignId)
      .then((f) => { if (f) { const loaded = loadFilter(f); cache.set(campaignId, loaded); if (alive) setFilter(loaded); } })
      .finally(() => pulling.delete(campaignId));
    return () => { alive = false; };
  }, [campaignId, enabled]);
  return filter;
}
