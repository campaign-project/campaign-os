/**
 * @campaign-os/engine — membership filter (RFC-002-A1 Tier 1b, "the ballpark case").
 *
 * A Bloom filter over a campaign's ENTIRE eligible voter set (statewide for a statewide petition),
 * so a device can answer "is this signer a registered voter?" OFFLINE even when they're in no loaded
 * turf tile — the dispersed-venue case (stadium / fair / transit hub, no signal). For a statewide
 * petition, validity IS set membership, and the whole state fits in ~10 MB of hashed bits instead of
 * ~1.5 GB of records. It carries NO records: you can only TEST a guess, never enumerate (so a lost
 * venue phone leaks nothing browsable).
 *
 * Pure + framework-agnostic (Node builder, RN device, browser) — self-contained base64 + hashing, no
 * platform deps. Keyed on the SAME canonical identity the matcher normalizes to, so a signer whose
 * input normalizes to their registration hits. Exact-on-normalized-key (no fuzzy beyond normalization);
 * false positives are caught by Tier 3 reconcile, never-block-capture absorbs near-misses. A coarser
 * second key (surname+house#+zip) for typo tolerance is a documented ~2× tunable (RFC-002-A1 §3) — v1
 * uses the single full canonical key.
 */
import { normName, normAddress } from "./normalize.ts";

export interface MembershipFilter { m: number; k: number; n: number; fpr: number; bits: string } // bits: base64
export interface LoadedFilter { m: number; k: number; bytes: Uint8Array }

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function b64encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] +
      (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return out;
}
function b64decode(s: string): Uint8Array {
  const lut = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) lut[B64.charCodeAt(i)] = i;
  const clean = s.replace(/=+$/, "");
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bi = 0, acc = 0, bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = lut[clean.charCodeAt(i)];
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; bytes[bi++] = (acc >> bits) & 0xff; }
  }
  return bytes;
}

/** The canonical membership key — IDENTICAL for a voter (add) and a signer (test). First+last+address
 *  (NOT middle name), so a signer who omits their middle name still hits their registration. */
function memberKey(name: string, address: string): string {
  const n = normName(name), a = normAddress(address);
  return `${n.first} ${n.last}|${a.number} ${a.street} ${a.zip5}`;
}

// Two independent 32-bit hashes (FNV-1a variants) → k indices by double hashing (h1 + i·h2).
function h1of(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function h2of(s: string): number { let h = 0x9e3779b1; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca77); } return (h >>> 0) | 1; }
function fill(idx: number[], k: number, m: number, s: string): void {
  const a = h1of(s), b = h2of(s);
  for (let i = 0; i < k; i++) idx[i] = ((a + Math.imul(i, b)) >>> 0) % m;
}

/** Size a fresh filter for ~nEst elements at the target false-positive rate. */
export function newFilter(nEst: number, fpr = 0.01): { m: number; k: number; bytes: Uint8Array } {
  const m = Math.max(8, Math.ceil((-nEst * Math.log(fpr)) / (Math.LN2 * Math.LN2)));
  const k = Math.max(1, Math.round((m / nEst) * Math.LN2));
  return { m, k, bytes: new Uint8Array(Math.ceil(m / 8)) };
}
export function addMember(f: { m: number; k: number; bytes: Uint8Array }, name: string, address: string): void {
  const idx: number[] = [];
  fill(idx, f.k, f.m, memberKey(name, address));
  for (let i = 0; i < f.k; i++) f.bytes[idx[i] >> 3] |= 1 << (idx[i] & 7);
}
export function sealFilter(f: { m: number; k: number; bytes: Uint8Array }, n: number, fpr: number): MembershipFilter {
  return { m: f.m, k: f.k, n, fpr, bits: b64encode(f.bytes) };
}
export function loadFilter(f: MembershipFilter): LoadedFilter {
  return { m: f.m, k: f.k, bytes: b64decode(f.bits) };
}
/** Device side: does this signer appear in the eligible set? No false negatives on the exact
 *  normalized key; ~fpr false positives (resolved by Tier-3 reconcile). */
export function isMember(f: LoadedFilter, name: string, address: string): boolean {
  const idx: number[] = [];
  fill(idx, f.k, f.m, memberKey(name, address));
  for (let i = 0; i < f.k; i++) if (!(f.bytes[idx[i] >> 3] & (1 << (idx[i] & 7)))) return false;
  return true;
}
