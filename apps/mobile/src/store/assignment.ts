/**
 * Gather — the active-assignment store.
 *
 * Which turf the circulator is working. The assignments themselves come from the OPTIMIZER
 * (GET /assignments — turfs ranked by expected valid = density × yield); the bundled static list is
 * the offline fallback. The active assignment drives which tiles the device loads
 * (voterIndexStore.turfOf reads it). Set on the briefing; defaults to the optimizer's #1 turf (or the
 * static first until the optimizer fetch lands), so consumers never handle null mid-flow.
 */
import { useSyncExternalStore } from "react";
import { ASSIGNMENTS, assignmentsFor, type Assignment } from "../data/assignments";
import { getAssignments } from "../net/sync";

let activeId: string | null = null;
const optimizer = new Map<string, Assignment[]>(); // campaign → optimizer-ranked turfs (server)
const loading = new Set<string>();
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; }

/** Optimizer-ranked turfs if loaded, else the bundled static list (offline fallback). */
const listFor = (campaignId: string): Assignment[] => optimizer.get(campaignId) ?? assignmentsFor(campaignId);

function resolve(id: string | null): Assignment | null {
  if (!id) return null;
  for (const list of optimizer.values()) { const a = list.find((x) => x.id === id); if (a) return a; }
  return ASSIGNMENTS.find((a) => a.id === id) ?? null;
}

/** Fetch the optimizer's ranking once per campaign; promote to its #1 turf when it lands. */
async function loadOptimizer(campaignId: string): Promise<void> {
  if (optimizer.has(campaignId) || loading.has(campaignId)) return;
  loading.add(campaignId);
  try {
    const res = await getAssignments(campaignId);
    if (res?.assignments?.length) {
      optimizer.set(campaignId, res.assignments);
      const cur = resolve(activeId);
      if (!cur || cur.campaignId === campaignId) activeId = res.assignments[0].id; // optimizer's best turf
      emit();
    }
  } finally { loading.delete(campaignId); }
}

export function setActiveAssignment(id: string): void { activeId = id; emit(); }
export function getActiveAssignment(): Assignment | null { return resolve(activeId); }

/** Ensure an assignment is active for this campaign; kick the optimizer fetch; default to the
 *  current best (static until the optimizer lands). */
export function ensureAssignment(campaignId: string): Assignment | null {
  void loadOptimizer(campaignId);
  const cur = resolve(activeId);
  if (cur && cur.campaignId === campaignId) return cur;
  const d = listFor(campaignId)[0] ?? null;
  activeId = d?.id ?? null;
  emit();
  return d;
}

export function useActiveAssignment(): Assignment | null {
  return resolve(useSyncExternalStore(subscribe, () => activeId));
}
