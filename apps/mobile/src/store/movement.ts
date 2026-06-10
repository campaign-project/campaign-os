/**
 * Gather — the live movement store.
 *
 * "The movement" numbers (circulators / valid this week / states) come from the server now, not a
 * constant. Populated by a /movement fetch on launch and updated by every sync response (so a
 * capture you sync visibly bumps the count). Falls back to the static MOVEMENT defaults offline, so
 * the briefing always has something real-feeling to show. The tagline stays local (it's copy).
 */
import { useSyncExternalStore } from "react";
import { MOVEMENT } from "../data/synced";
import type { Movement } from "../net/sync";

let live: Movement | null = null;
const listeners = new Set<() => void>();

function emit() { for (const l of listeners) l(); }
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function getSnapshot(): Movement | null {
  return live;
}

export function setMovement(m: Movement): void {
  live = m;
  emit();
}

export interface FullMovement { tagline: string; circulators: number; validThisWeek: number; states: number }

function merge(l: Movement | null): FullMovement {
  return {
    tagline: MOVEMENT.tagline,
    circulators: l?.circulators ?? MOVEMENT.circulators,
    validThisWeek: l?.validThisWeek ?? MOVEMENT.validThisWeek,
    states: l?.states ?? MOVEMENT.states,
  };
}

/** Live movement (server-driven), falling back to static defaults until the first fetch lands. */
export function useMovement(): FullMovement {
  return merge(useSyncExternalStore(subscribe, getSnapshot));
}
