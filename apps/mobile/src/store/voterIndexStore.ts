/**
 * Gather — the voter-index store (down-sync, persisted, auto-refreshing, DELTA).
 *
 * A device validates against a SERVER-supplied index; once synced, offline too; it AUTO-SYNCS when
 * stale; and it pulls only what CHANGED. `useCampaignIndex(id)` returns an index SYNCHRONOUSLY
 * (no loading) — persisted/synced (real, offline-capable) → bundled artifact.
 *
 * Delta sync: the device tracks its content `version` and sends `?since=<version>`. The server
 * replies with one of:
 *   • current  — same version → nothing transferred (the common case, ~0 bytes)
 *   • delta    — just upserts + removedIds since the device's version
 *   • snapshot — full set (when a delta can't be computed)
 * The device applies delta/snapshot to its raw voters, rebuilds the matcher index, and persists.
 * Freshness-gated (STALE_MS) + triggered on mount and app-foreground. Persisted to SQLite (gather.db).
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import * as SQLite from "expo-sqlite";
import { buildIndex, type VoterIndex, type VoterRecord } from "@campaign-os/engine";
import { buildCampaignIndex } from "../data/voterIndex";
import { pullIndex } from "../net/sync";

export type IndexOrigin = "bundled" | "synced";
export interface EffectiveIndex {
  index: VoterIndex;
  voterCount: number;
  jurisdiction: string;
  builtAt: string;
  version: string;
  origin: IndexOrigin;
}

const STALE_MS = 60 * 60 * 1000; // re-check the server's index hourly

const synced = new Map<string, EffectiveIndex>();
const voters = new Map<string, VoterRecord[]>(); // raw records per campaign — the delta base
const syncedAt = new Map<string, number>();
const pulling = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() { version++; for (const l of listeners) l(); }
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function getSnapshot(): number {
  return version;
}

// --- Persistence (SQLite, same gather.db, own connection) ---------------------------------------

interface Row { campaign_id: string; jurisdiction: string; built_at: string; version: string | null; voters: string; synced_at: number; }

let db: SQLite.SQLiteDatabase | null = null;
try {
  db = SQLite.openDatabaseSync("gather.db");
  db.execSync(
    `CREATE TABLE IF NOT EXISTS voter_index (
       campaign_id TEXT    PRIMARY KEY,
       jurisdiction TEXT   NOT NULL,
       built_at    TEXT    NOT NULL,
       version     TEXT,
       voters      TEXT    NOT NULL,
       synced_at   INTEGER NOT NULL
     );`,
  );
  try { db.runSync("ALTER TABLE voter_index ADD COLUMN version TEXT"); } catch { /* column exists */ }
  const rows = db.getAllSync<Row>("SELECT campaign_id, jurisdiction, built_at, version, voters, synced_at FROM voter_index");
  for (const r of rows) {
    const vs = JSON.parse(r.voters) as VoterRecord[];
    voters.set(r.campaign_id, vs);
    syncedAt.set(r.campaign_id, r.synced_at);
    synced.set(r.campaign_id, { index: buildIndex(vs), voterCount: vs.length, jurisdiction: r.jurisdiction, builtAt: r.built_at, version: r.version ?? "", origin: "synced" });
  }
} catch (e) {
  console.warn("[voterIndex] SQLite unavailable — synced index won't persist this session:", e);
  db = null;
}

function persist(id: string, jurisdiction: string, builtAt: string, ver: string, vs: VoterRecord[], at: number): void {
  if (!db) return;
  try {
    db.runSync(
      `INSERT INTO voter_index (campaign_id, jurisdiction, built_at, version, voters, synced_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(campaign_id) DO UPDATE SET jurisdiction = excluded.jurisdiction, built_at = excluded.built_at, version = excluded.version, voters = excluded.voters, synced_at = excluded.synced_at`,
      [id, jurisdiction, builtAt, ver, JSON.stringify(vs), at],
    );
  } catch (e) {
    console.warn("[voterIndex] persist failed:", e);
  }
}

/** Install a (snapshot- or delta-derived) voter set as the synced index: rebuild, cache, persist, notify. */
function setSynced(id: string, vs: VoterRecord[], ver: string, jurisdiction: string, builtAt: string): void {
  const at = Date.now();
  voters.set(id, vs);
  syncedAt.set(id, at);
  synced.set(id, { index: buildIndex(vs), voterCount: vs.length, jurisdiction, builtAt, version: ver, origin: "synced" });
  persist(id, jurisdiction, builtAt, ver, vs, at);
  emit();
}

function applyDelta(base: VoterRecord[], upserts: VoterRecord[], removedIds: string[]): VoterRecord[] {
  const byId = new Map(base.map((r) => [r.id, r]));
  for (const u of upserts) byId.set(u.id, u);
  for (const rid of removedIds) byId.delete(rid);
  return [...byId.values()];
}

function isStale(id: string): boolean {
  if (!synced.has(id)) return true; // missing → auto-recover when online
  return Date.now() - (syncedAt.get(id) ?? 0) > STALE_MS;
}

/** Pull only what changed since our version (current/delta/snapshot), if stale. No-op offline. */
async function syncIfStale(id: string): Promise<void> {
  if (pulling.has(id) || !isStale(id)) return;
  pulling.add(id);
  try {
    const since = synced.get(id)?.version ?? buildCampaignIndex(id).version;
    const res = await pullIndex(id, since);
    if (!res) return; // offline — keep what we have
    if (res.mode === "current") {
      if (synced.has(id)) {
        // confirmed up to date — just reset staleness
        const s = synced.get(id)!; const at = Date.now();
        syncedAt.set(id, at);
        persist(id, s.jurisdiction, s.builtAt, s.version, voters.get(id) ?? [], at);
      } else {
        // bundled content the server confirms is current → promote to synced
        const b = buildCampaignIndex(id);
        setSynced(id, b.voters, b.version, b.jurisdiction, b.builtAt);
      }
    } else if (res.mode === "snapshot") {
      setSynced(id, res.voters, res.version, res.jurisdiction, res.builtAt);
    } else {
      const base = voters.get(id) ?? buildCampaignIndex(id).voters;
      setSynced(id, applyDelta(base, res.upserts, res.removedIds), res.version, res.jurisdiction, res.builtAt);
    }
  } finally {
    pulling.delete(id);
  }
}

/** The raw voter records backing the effective index — synced set if present, else bundled.
 *  Stable reference between syncs, so the suggester's per-array corpus cache stays warm. */
export function getVoterList(campaignId: string): VoterRecord[] {
  return voters.get(campaignId) ?? buildCampaignIndex(campaignId).voters;
}

/** Effective index: persisted/synced if available, else bundled. Auto-refreshes (delta) on mount + foreground. */
export function useCampaignIndex(campaignId: string): EffectiveIndex {
  useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void syncIfStale(campaignId);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void syncIfStale(campaignId); });
    return () => sub.remove();
  }, [campaignId]);

  const fallback = useMemo<EffectiveIndex>(() => {
    const b = buildCampaignIndex(campaignId);
    return { index: b.index, voterCount: b.voterCount, jurisdiction: b.jurisdiction, builtAt: b.builtAt, version: b.version, origin: "bundled" };
  }, [campaignId]);

  return synced.get(campaignId) ?? fallback;
}
