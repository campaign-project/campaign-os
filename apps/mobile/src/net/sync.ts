/**
 * Gather — the sync client (the device half of RFC-002 sync).
 *
 * Real HTTP to the reference server (server/sync-server.mjs). Every call is offline-safe: on
 * timeout / no server / non-2xx it returns null, and the caller treats null as "stay queued" — the
 * device never loses a capture because the network was down. fetch + AbortController are both
 * available in React Native.
 */
import type { VoterRecord } from "@campaign-os/engine";

// Simulator reaches the host here; point at the deployed Worker URL for staging/prod. The Node dev
// reference ignores the token; the Cloudflare Worker (server/worker) requires it (device-scoped).
export const SYNC_BASE_URL = "https://gather-sync.gotaylorfamilygo.workers.dev";
export const SYNC_TOKEN = "33f82b946c2b0b6a89dcf7f3f3dbffaf218177ce3f8c4a0e"; // prod device token (read-only, campaign-unscoped); admin token stays operator-only
const TIMEOUT_MS = 6000;

export interface Movement { circulators: number; validThisWeek: number; states: number }

export interface CaptureWire {
  seq: number; name: string; address: string; verdict: string; matchedVoterId?: string; score: number; capturedAt: number;
}
export interface PushPayload { campaignId: string; gathererId: string; captures: CaptureWire[] }
export interface CaptureResult { seq: number; status: "accepted" | "duplicate" | "recorded"; reason?: string }
export interface PushResult { results: CaptureResult[]; accepted: number; duplicates: number; recorded: number; movement: Movement }

/** Down-sync is conditional: the device sends its version, the server replies with only what changed. */
export type IndexResponse =
  | { mode: "current"; version: string } // device is up to date — no records transferred
  | { mode: "snapshot"; version: string; jurisdiction: string; builtAt: string; voterCount: number; voters: VoterRecord[] }
  | { mode: "delta"; version: string; jurisdiction: string; builtAt: string; upserts: VoterRecord[]; removedIds: string[] };

async function req<T>(path: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${SYNC_BASE_URL}${path}`, {
      ...init,
      headers: { ...(init?.headers as Record<string, string> | undefined), authorization: `Bearer ${SYNC_TOKEN}` },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null; // offline / no server / timeout — caller keeps the queue and retries later
  } finally {
    clearTimeout(t);
  }
}

/** Up-sync: push the pending queue; the server dedups across volunteers and returns per-capture status. */
export function pushCaptures(payload: PushPayload): Promise<PushResult | null> {
  return req<PushResult>("/captures", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** The live collective rollup ("the movement"). */
export function getMovement(): Promise<Movement | null> {
  return req<Movement>("/movement");
}

export interface YieldSlice { zip: string; valid: number; total: number; rate: number }
export interface YieldResult { overall: { valid: number; total: number; rate: number }; byZip: YieldSlice[] }

/** Moat B: validity-by-location for a campaign, aggregated across all volunteers (Beta-Binomial smoothed). */
export function getYield(campaignId: string): Promise<YieldResult | null> {
  return req<YieldResult>(`/yield/${encodeURIComponent(campaignId)}`);
}

/** Down-sync: ask for changes to a campaign's index since `since`; server returns current/delta/snapshot. */
export function pullIndex(campaignId: string, since?: string): Promise<IndexResponse | null> {
  const q = since ? `?since=${encodeURIComponent(since)}` : "";
  return req<IndexResponse>(`/index/${encodeURIComponent(campaignId)}${q}`);
}
