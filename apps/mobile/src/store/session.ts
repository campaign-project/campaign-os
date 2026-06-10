/**
 * Gather — the on-device capture session store (SQLite-backed).
 *
 * The "device = cache, never source of truth" layer (RFC-002). Every signature a volunteer logs
 * lands here with the engine's verdict and a SYNC STATE (pending → synced). The server owns the
 * canonical record and does cross-volunteer dedup at sync time; this store is the durable local
 * queue that survives app reloads and makes the sync state visible.
 *
 * Architecture: an in-memory snapshot (read model) backed by a SQLite write-through log.
 *   • React subscribes via useSyncExternalStore, which requires a SYNCHRONOUS getSnapshot — so the
 *     in-memory `state` is the source the UI reads, refreshed only on mutation (immutable snapshots
 *     give correct re-render bailout).
 *   • SQLite (expo-sqlite, sync API) is the durability layer: hydrated ONCE at module load, then
 *     write-through on every mutation. Persisting touched ONLY this file — the screens never change.
 *   • If SQLite is unavailable (or a query throws), `db` degrades to null and the store keeps working
 *     in pure memory. A storage fault must never lose an in-progress capture.
 */
import { useSyncExternalStore } from "react";
import * as SQLite from "expo-sqlite";
import type { SignerVerdict, SignerInput } from "@campaign-os/engine";
import { pushCaptures } from "../net/sync";
import { setMovement } from "./movement";

export type SyncState = "pending" | "synced";
const GATHERER = "g-device"; // stable circulator id for this device (metadata for server-side yield)

export interface Capture {
  seq: number;
  signer: SignerInput;
  result: SignerVerdict;
  capturedAt: number;
  sync: SyncState;
  serverNote?: string; // e.g. "server: duplicate" — what the server said at sync
}

interface SessionState {
  captures: Capture[]; // newest first
  seq: number;
}

// --- Durability layer (SQLite write-through) ----------------------------------------------------

interface Row { seq: number; signer: string; result: string; captured_at: number; sync: string; server_note: string | null; }

let db: SQLite.SQLiteDatabase | null = null;
try {
  db = SQLite.openDatabaseSync("gather.db");
  db.execSync(
    `PRAGMA journal_mode = WAL;
     CREATE TABLE IF NOT EXISTS captures (
       seq         INTEGER PRIMARY KEY,
       signer      TEXT    NOT NULL,
       result      TEXT    NOT NULL,
       captured_at INTEGER NOT NULL,
       sync        TEXT    NOT NULL,
       server_note TEXT
     );`,
  );
  // Migration for installs created before server_note existed (throws if the column is already there).
  try { db.runSync("ALTER TABLE captures ADD COLUMN server_note TEXT"); } catch { /* column exists */ }
} catch (e) {
  console.warn("[session] SQLite unavailable — running in-memory only:", e);
  db = null;
}

/** Read the durable log back into an in-memory snapshot. Runs once, synchronously, at load. */
function hydrate(): SessionState {
  if (!db) return { captures: [], seq: 0 };
  try {
    const rows = db.getAllSync<Row>(
      "SELECT seq, signer, result, captured_at, sync, server_note FROM captures ORDER BY seq DESC",
    );
    const captures: Capture[] = rows.map((r) => ({
      seq: r.seq,
      signer: JSON.parse(r.signer) as SignerInput,
      result: JSON.parse(r.result) as SignerVerdict,
      capturedAt: r.captured_at,
      sync: r.sync === "synced" ? "synced" : "pending",
      serverNote: r.server_note ?? undefined,
    }));
    const seq = captures.reduce((m, c) => Math.max(m, c.seq), 0);
    return { captures, seq };
  } catch (e) {
    console.warn("[session] hydrate failed — starting empty:", e);
    return { captures: [], seq: 0 };
  }
}

// --- Store --------------------------------------------------------------------------------------

let state: SessionState = hydrate();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function getSnapshot(): SessionState {
  return state;
}

/** Log a freshly-captured (paper) signature plus the engine verdict computed at capture time. */
export function addCapture(signer: SignerInput, result: SignerVerdict): Capture {
  const seq = state.seq + 1;
  const capture: Capture = { seq, signer: { ...signer, id: `c${seq}` }, result, capturedAt: Date.now(), sync: "pending" };
  if (db) {
    try {
      db.runSync(
        "INSERT INTO captures (seq, signer, result, captured_at, sync, server_note) VALUES (?, ?, ?, ?, ?, ?)",
        [seq, JSON.stringify(capture.signer), JSON.stringify(result), capture.capturedAt, capture.sync, null],
      );
    } catch (e) {
      console.warn("[session] persist insert failed (kept in memory):", e);
    }
  }
  state = { captures: [capture, ...state.captures], seq };
  emit();
  return capture;
}

export interface SyncOutcome { synced: number; duplicates: number; offline: boolean }

/**
 * Flush the pending queue to the server (REAL HTTP). The server dedups across all volunteers and
 * returns per-capture status; we mark synced ONLY on its ack (so the device reflects the server's
 * truth, incl. duplicates it caught), and bump the live movement from its rollup. If the server is
 * unreachable, nothing is marked — the queue stays pending in SQLite and retries next time.
 */
export async function syncPending(campaignId: string): Promise<SyncOutcome> {
  const pending = state.captures.filter((c) => c.sync === "pending");
  if (pending.length === 0) return { synced: 0, duplicates: 0, offline: false };

  const res = await pushCaptures({
    campaignId,
    gathererId: GATHERER,
    captures: pending.map((c) => ({
      seq: c.seq, name: c.signer.name, address: c.signer.address,
      verdict: c.result.verdict, matchedVoterId: c.result.matchedVoterId, score: c.result.score, capturedAt: c.capturedAt,
    })),
  });
  if (!res) return { synced: 0, duplicates: 0, offline: true }; // offline — keep the queue, retry later

  const noteFor = (seq: number): string | undefined => {
    const r = res.results.find((x) => x.seq === seq);
    return r?.status === "duplicate" ? "server: duplicate" : undefined;
  };

  if (db) {
    try {
      for (const c of pending) {
        db.runSync("UPDATE captures SET sync = 'synced', server_note = ? WHERE seq = ?", [noteFor(c.seq) ?? null, c.seq]);
      }
    } catch (e) {
      console.warn("[session] persist sync-update failed:", e);
    }
  }
  state = {
    ...state,
    captures: state.captures.map((c) =>
      c.sync === "pending" ? { ...c, sync: "synced", serverNote: noteFor(c.seq) } : c,
    ),
  };
  emit();
  setMovement(res.movement); // the live count rises with what the server just accepted
  return { synced: pending.length, duplicates: res.duplicates, offline: false };
}

export function resetSession(): void {
  if (db) {
    try { db.runSync("DELETE FROM captures"); }
    catch (e) { console.warn("[session] persist reset failed:", e); }
  }
  state = { captures: [], seq: 0 };
  emit();
}

export interface SessionStats {
  total: number;
  valid: number;       // safe to submit — VALID only (the bright line)
  review: number;      // NEEDS_REVIEW — logged but NOT counted as safe
  invalid: number;
  pending: number;
  validityRate: number;
}

export function deriveStats(s: SessionState): SessionStats {
  let valid = 0, review = 0, invalid = 0, pending = 0;
  for (const c of s.captures) {
    if (c.result.verdict === "VALID") valid++;
    else if (c.result.verdict === "NEEDS_REVIEW") review++;
    else invalid++;
    if (c.sync === "pending") pending++;
  }
  const total = s.captures.length;
  return { total, valid, review, invalid, pending, validityRate: total ? valid / total : 0 };
}

/** Subscribe a component to the live session. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
