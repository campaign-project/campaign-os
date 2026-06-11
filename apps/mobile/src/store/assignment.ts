/**
 * Gather — the active-assignment store.
 *
 * Which turf the circulator is working (the optimizer's allocation). A module singleton +
 * useSyncExternalStore, same shape as the active-campaign store. The active assignment drives which
 * tiles the device loads (voterIndexStore.turfOf reads it). Set on the briefing; defaults to the
 * campaign's first assignment so consumers never handle null mid-flow.
 */
import { useSyncExternalStore } from "react";
import { ASSIGNMENTS, defaultAssignment, type Assignment } from "../data/assignments";

let activeId: string | null = null;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; }
const resolve = (id: string | null): Assignment | null => ASSIGNMENTS.find((a) => a.id === id) ?? null;

export function setActiveAssignment(id: string): void { activeId = id; emit(); }
export function getActiveAssignment(): Assignment | null { return resolve(activeId); }

/** Ensure an assignment is active for this campaign (default to the optimizer's first); returns it. */
export function ensureAssignment(campaignId: string): Assignment | null {
  const cur = resolve(activeId);
  if (cur && cur.campaignId === campaignId) return cur;
  const d = defaultAssignment(campaignId);
  activeId = d?.id ?? null;
  emit();
  return d;
}

export function useActiveAssignment(): Assignment | null {
  return resolve(useSyncExternalStore(subscribe, () => activeId));
}
