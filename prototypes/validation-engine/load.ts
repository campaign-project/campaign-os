/**
 * Spec-driven voter-file loader.
 *
 * Every state's statewide voter file is a different beast — comma / tab / pipe
 * delimited, UTF-8 / Windows-1252, header-row or positional, name+address split a
 * dozen ways, and five different status-code vocabularies (see sources.ts). This
 * loader is driven entirely by an `AdapterSpec` so ONE parser reads all of them and
 * emits the engine's canonical `VoterRecord`. Adding a state = adding a spec, not code.
 *
 * The hard, format-specific work — which is the actual moat — happens here:
 * decode → split → resolve columns → normalize status & dates → canonical record.
 *
 * v1 reads the whole file (fine for the synthetic samples). The real statewide files
 * are large (NC ≈ 516MB); `loadVoterFile` is line-oriented so the read can be swapped
 * for a chunked `node:fs` stream without touching the row-mapping logic. See README.
 */

import { readFileSync, createReadStream } from "node:fs";
import type { VoterRecord } from "./match.ts";

export type CanonicalField =
  | "voterId" | "firstName" | "middleName" | "lastName" | "suffix" | "fullName"
  | "streetAddress" | "houseNumber" | "streetName" | "unit"
  | "city" | "state" | "zip"
  | "status" | "registrationDate" | "county" | "district";

// A column reference: a header NAME (string) when hasHeader, a 1-based POSITION
// (number) when positional, or an array to concatenate (e.g. FL address spans 2 cols).
export type ColRef = string | number | Array<string | number>;

export interface AdapterSpec {
  jurisdiction: string;
  delimiter: string; // actual char: "\t" | "," | "|"
  encoding: string; // utf-8 | windows-1252 | latin1 | ascii
  hasHeader: boolean;
  columns: Partial<Record<CanonicalField, ColRef>>;
  statusActive: string[]; // values meaning ACTIVE (case-insensitive)
  statusCancelled?: string[]; // values meaning cancelled/removed/denied/purged
  dateFormat: "MM/DD/YYYY" | "YYYY-MM-DD" | "YYYYMMDD" | "unknown";
  downloadUrl?: string;
  layoutDocUrl?: string;
  confidence?: "high" | "medium" | "low";
  verifiedAsOf?: string; // ISO date WE last verified this layout — re-check past the staleness window
  layoutRevision?: string; // the source layout's own revision/updated date, if it states one
  notes?: string;
}

// ----------------------------------------------------------------------------
// Decode — one decoder covers ascii ⊂ latin1 ≈ windows-1252 (they agree on the
// printable high range we care about), plus utf-8. TextDecoder has no "ascii" label.
// ----------------------------------------------------------------------------

function decoderLabel(encoding: string): string {
  const e = encoding.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (e === "utf8" || e === "utf") return "utf-8";
  // ascii / latin1 / iso-8859-1 / cp1252 / windows-1252 → windows-1252 (superset)
  return "windows-1252";
}

export function decodeBuffer(buf: Buffer, encoding: string): string {
  return new TextDecoder(decoderLabel(encoding)).decode(buf);
}

// ----------------------------------------------------------------------------
// Field split — RFC-4180-ish: respects double-quoted fields (which may contain the
// delimiter and "" escapes). Works for any single-char delimiter (",", "\t", "|").
// ----------------------------------------------------------------------------

export function splitDelimited(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // "" escape
        else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === delim) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// ----------------------------------------------------------------------------
// Normalizers
// ----------------------------------------------------------------------------

export function normalizeStatus(raw: string, spec: AdapterSpec): VoterRecord["status"] {
  const v = (raw ?? "").trim().toLowerCase();
  if (spec.statusActive.some((s) => s.toLowerCase() === v)) return "active";
  if (spec.statusCancelled?.some((s) => s.toLowerCase() === v)) return "cancelled";
  // Heuristic backstop for vocabularies we didn't enumerate exhaustively.
  if (/cancel|remov|denied|purg/.test(v)) return "cancelled";
  return "inactive";
}

/** Parse a registration date into ISO YYYY-MM-DD so the engine's date comparisons
 *  (registered-before-signing) work. Returns "" if unparseable / unknown format. */
export function normalizeDate(raw: string, fmt: AdapterSpec["dateFormat"]): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  if (fmt === "YYYY-MM-DD") return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
  if (fmt === "MM/DD/YYYY") {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : "";
  }
  if (fmt === "YYYYMMDD") {
    const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  }
  return ""; // unknown
}

// ----------------------------------------------------------------------------
// Column resolution + record building
// ----------------------------------------------------------------------------

function buildResolver(spec: AdapterSpec, headerCells: string[] | null) {
  const headerIdx = new Map<string, number>();
  if (headerCells) headerCells.forEach((h, i) => headerIdx.set(h.trim().toLowerCase(), i));

  const idxOf = (ref: string | number): number => {
    if (typeof ref === "number") return ref - 1; // 1-based position
    return headerIdx.has(ref.toLowerCase()) ? headerIdx.get(ref.toLowerCase())! : -1;
  };

  return (row: string[], field: CanonicalField): string => {
    const ref = spec.columns[field];
    if (ref === undefined) return "";
    const refs = Array.isArray(ref) ? ref : [ref];
    return refs
      .map((r) => { const i = idxOf(r); return i >= 0 && i < row.length ? row[i] : ""; })
      .filter(Boolean)
      .join(" ")
      .trim();
  };
}

function composeName(get: (f: CanonicalField) => string): string {
  const full = get("fullName");
  if (full) return full;
  return [get("firstName"), get("middleName"), get("lastName"), get("suffix")].filter(Boolean).join(" ");
}

function composeAddress(get: (f: CanonicalField) => string): string {
  // Prefer a combined street line; fall back to house# + street + unit.
  const street = get("streetAddress") || [get("houseNumber"), get("streetName")].filter(Boolean).join(" ");
  const unit = get("unit");
  const cityStateZip = [get("city"), get("state"), get("zip")].filter(Boolean).join(" ");
  const line1 = [street, unit ? `#${unit}` : ""].filter(Boolean).join(" ");
  return [line1, cityStateZip].filter(Boolean).join(", ");
}

export function rowToRecord(row: string[], get: (row: string[], f: CanonicalField) => string, spec: AdapterSpec): VoterRecord {
  const g = (f: CanonicalField) => get(row, f);
  return {
    id: g("voterId") || `${spec.jurisdiction}:${g("lastName")}:${g("zip")}`,
    name: composeName(g),
    address: composeAddress(g),
    status: normalizeStatus(g("status"), spec),
    registeredOn: normalizeDate(g("registrationDate"), spec.dateFormat) || undefined,
    county: g("county") || undefined,
    district: g("district") || undefined,
  };
}

/** Load a voter file at `path` into canonical VoterRecords using `spec`. */
export function loadVoterFile(path: string, spec: AdapterSpec): VoterRecord[] {
  const text = decodeBuffer(readFileSync(path), spec.encoding);
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  let headerCells: string[] | null = null;
  let start = 0;
  if (spec.hasHeader) { headerCells = splitDelimited(lines[0], spec.delimiter); start = 1; }

  const get = buildResolver(spec, headerCells);
  const records: VoterRecord[] = [];
  for (let i = start; i < lines.length; i++) {
    const row = splitDelimited(lines[i], spec.delimiter);
    records.push(rowToRecord(row, get, spec));
  }
  return records;
}

// ----------------------------------------------------------------------------
// Streaming loader — for the real statewide files (NC ≈ 516MB), which we never want
// to hold in memory at once. Yields ONE canonical record at a time, so peak memory is
// a read-chunk + one partial line, independent of file size. Row-mapping is identical
// to loadVoterFile(), so streamed output equals the batch output byte-for-byte.
//
// Two chunk-boundary hazards, both handled:
//   • a LINE split across chunks → a held-over `remainder` is prepended to the next chunk.
//   • a multi-byte UTF-8 CHARACTER split across chunks → a persistent TextDecoder with
//     {stream:true} buffers the incomplete byte sequence until the next chunk completes it.
// ----------------------------------------------------------------------------

export interface StreamOptions {
  highWaterMark?: number; // read-chunk size in bytes (default 64KB); tiny values stress boundaries
}

export async function* streamVoterFile(path: string, spec: AdapterSpec, opts: StreamOptions = {}): AsyncGenerator<VoterRecord> {
  const decoder = new TextDecoder(decoderLabel(spec.encoding));
  let remainder = "";
  let headerCells: string[] | null = null;
  let get: ((row: string[], f: CanonicalField) => string) | null = null;

  function* emit(line: string): Generator<VoterRecord> {
    if (line.length === 0) return; // skip blanks (matches loadVoterFile)
    if (spec.hasHeader && headerCells === null) {
      headerCells = splitDelimited(line, spec.delimiter);
      get = buildResolver(spec, headerCells);
      return; // header consumed, not a record
    }
    if (!get) get = buildResolver(spec, null); // positional file: no header
    yield rowToRecord(splitDelimited(line, spec.delimiter), get, spec);
  }

  const stream = createReadStream(path, opts.highWaterMark ? { highWaterMark: opts.highWaterMark } : {});
  for await (const chunk of stream) {
    remainder += decoder.decode(chunk as Uint8Array, { stream: true });
    const parts = remainder.split(/\r\n|\n|\r/);
    remainder = parts.pop() ?? ""; // last element may be a partial line — hold it over
    for (const line of parts) yield* emit(line);
  }
  remainder += decoder.decode(); // flush any bytes buffered by the streaming decoder
  for (const line of remainder.split(/\r\n|\n|\r/)) yield* emit(line);
}

/** Collect streamed records into an array, optionally filtered and/or capped — e.g.
 *  load only the ZIPs where signatures were gathered, so memory stays bounded even on
 *  a 516MB file. Early `limit` destroys the underlying stream (for-await cleanup). */
export async function collectVoterFile(
  path: string,
  spec: AdapterSpec,
  opts: { filter?: (r: VoterRecord) => boolean; limit?: number } = {},
): Promise<VoterRecord[]> {
  const out: VoterRecord[] = [];
  for await (const rec of streamVoterFile(path, spec)) {
    if (opts.filter && !opts.filter(rec)) continue;
    out.push(rec);
    if (opts.limit && out.length >= opts.limit) break;
  }
  return out;
}
