/**
 * Gather — the active-campaign store.
 *
 * Which campaign the circulator picked in the directory. A module singleton + useSyncExternalStore
 * (same shape as the session store) so every screen — briefing, collect, impact, map — reads the
 * chosen campaign without prop-drilling. Selected in CampaignPicker before the briefing renders;
 * falls back to the first campaign defensively so consumers never handle null.
 */
import { useSyncExternalStore } from "react";
import { CAMPAIGNS, type Campaign } from "../data/campaigns";

let activeId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function getSnapshot(): string | null {
  return activeId;
}

function resolve(id: string | null): Campaign {
  return CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0];
}

export function setActiveCampaign(id: string): void {
  activeId = id;
  emit();
}

export function getActiveCampaign(): Campaign {
  return resolve(activeId);
}

/** Subscribe a component to the active campaign. */
export function useActiveCampaign(): Campaign {
  return resolve(useSyncExternalStore(subscribe, getSnapshot));
}
