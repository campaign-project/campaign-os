/**
 * Synthetic sample generator — serializes fabricated "voters" INTO each state's real
 * on-disk format (delimiter, header-vs-positional, address layout, status codes, date
 * format). This is the inverse of load.ts, so writing then loading is a true round
 * trip that proves each adapter against its real schema — with ZERO real PII.
 *
 * (NC's sample carries a "ñ" written as a raw 0xF1 byte to exercise the Windows-1252
 * decode path the real ncvoter file needs.)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AdapterSpec, CanonicalField } from "./load.ts";
import { ADAPTERS } from "./sources.ts";

export interface Person {
  voterId: string; first: string; middle: string; last: string; suffix: string;
  house: string; street: string; streetAddress: string; unit: string;
  city: string; state: string; zip: string;
  status: "active" | "inactive" | "cancelled"; regISO: string; county: string; district: string;
}

// Five fabricated people (note V001's surname uses ñ to test win-1252).
export const PEOPLE: Person[] = [
  { voterId: "V1001", first: "Robert", middle: "A", last: "Nuñez", suffix: "", house: "42", street: "Main St", streetAddress: "42 Main St", unit: "", city: "Springfield", state: "NC", zip: "62704", status: "active", regISO: "2019-03-01", county: "Sangamon", district: "1" },
  { voterId: "V1002", first: "William", middle: "", last: "Johnson", suffix: "", house: "88", street: "Oak Ave", streetAddress: "88 Oak Ave", unit: "", city: "Springfield", state: "NC", zip: "62704", status: "active", regISO: "2018-06-15", county: "Sangamon", district: "1" },
  { voterId: "V1003", first: "Maria", middle: "", last: "Gonzalez", suffix: "", house: "5", street: "Sunset Blvd", streetAddress: "5 Sunset Blvd", unit: "4", city: "Springfield", state: "NC", zip: "62705", status: "active", regISO: "2021-11-02", county: "Sangamon", district: "1" },
  { voterId: "V1004", first: "James", middle: "", last: "O'Brien", suffix: "", house: "230", street: "N Park Rd", streetAddress: "230 N Park Rd", unit: "", city: "Springfield", state: "NC", zip: "62704", status: "inactive", regISO: "2017-09-10", county: "Sangamon", district: "1" },
  { voterId: "V1005", first: "Katherine", middle: "", last: "Lee", suffix: "", house: "901", street: "River Dr", streetAddress: "901 River Dr", unit: "", city: "Springfield", state: "NC", zip: "62704", status: "cancelled", regISO: "2016-05-05", county: "Sangamon", district: "1" },
];

function statusCode(status: Person["status"], spec: AdapterSpec): string {
  if (status === "active") return spec.statusActive[0];
  if (status === "cancelled") return spec.statusCancelled?.[0] ?? "CANCELLED";
  return "INACTIVE"; // classifies as inactive under every spec's normalizer
}

function fmtDate(iso: string, fmt: AdapterSpec["dateFormat"]): string {
  const [y, m, d] = iso.split("-");
  if (fmt === "MM/DD/YYYY") return `${m}/${d}/${y}`;
  if (fmt === "YYYY-MM-DD") return iso;
  if (fmt === "YYYYMMDD") return `${y}${m}${d}`;
  return iso; // unknown → emit ISO; the loader will (correctly) leave registeredOn blank
}

function valueFor(field: CanonicalField, p: Person, spec: AdapterSpec): string {
  switch (field) {
    case "voterId": return p.voterId;
    case "firstName": return p.first;
    case "middleName": return p.middle;
    case "lastName": return p.last;
    case "suffix": return p.suffix;
    case "fullName": return `${p.first} ${p.last}`;
    case "streetAddress": return p.streetAddress;
    case "houseNumber": return p.house;
    case "streetName": return p.street;
    case "unit": return p.unit;
    case "city": return p.city;
    case "state": return p.state;
    case "zip": return p.zip;
    case "status": return statusCode(p.status, spec);
    case "registrationDate": return fmtDate(p.regISO, spec.dateFormat);
    case "county": return p.county;
    case "district": return p.district;
    default: return "";
  }
}

export function serialize(spec: AdapterSpec, people: Person[]): Buffer {
  const entries = Object.entries(spec.columns) as [CanonicalField, AdapterSpec["columns"][CanonicalField]][];
  let text: string;

  if (spec.hasHeader) {
    const header = entries.map(([, ref]) => String(ref)).join(spec.delimiter);
    const rows = people.map((p) => entries.map(([f]) => valueFor(f, p, spec)).join(spec.delimiter));
    text = [header, ...rows].join("\n") + "\n";
  } else {
    // positional: size the row to the max 1-based position used
    let max = 0;
    for (const [, ref] of entries) for (const r of (Array.isArray(ref) ? ref : [ref!])) if (typeof r === "number") max = Math.max(max, r);
    const rows = people.map((p) => {
      const arr = new Array(max).fill("");
      for (const [f, ref] of entries) {
        const refs = Array.isArray(ref) ? ref : [ref!];
        const firstNum = refs.find((r) => typeof r === "number") as number | undefined;
        if (firstNum !== undefined) arr[firstNum - 1] = valueFor(f, p, spec);
      }
      return arr.join(spec.delimiter);
    });
    text = rows.join("\n") + "\n";
  }

  const isUtf8 = /utf/i.test(spec.encoding);
  return isUtf8 ? Buffer.from(text, "utf8") : Buffer.from(text, "latin1"); // latin1 write = ascii/win-1252 bytes
}

function extFor(spec: AdapterSpec): string {
  return spec.delimiter === "\t" ? "tsv" : spec.delimiter === "|" ? "psv" : "csv";
}

/** Write a synthetic sample for every adapter to ./samples/, return {jur: path}. */
export function writeSamples(): Record<string, string> {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "samples");
  mkdirSync(dir, { recursive: true });
  const out: Record<string, string> = {};
  for (const [jur, spec] of Object.entries(ADAPTERS)) {
    const path = join(dir, `${jur.replace(/\s+/g, "_")}.${extFor(spec)}`);
    writeFileSync(path, serialize(spec, PEOPLE));
    out[jur] = path;
  }
  return out;
}

/** Write a LARGE synthetic file (PEOPLE cycled to `rows` rows, unique ids) in `jur`'s
 *  real format — for exercising the streaming loader. Returns the file path. */
export function writeBig(jur: string, rows: number, dir: string): string {
  const spec = ADAPTERS[jur];
  const big: Person[] = [];
  for (let i = 0; i < rows; i++) {
    const base = PEOPLE[i % PEOPLE.length];
    big.push({ ...base, voterId: `${base.voterId}-${i}` });
  }
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${jur.replace(/\s+/g, "_")}_${rows}.${extFor(spec)}`);
  writeFileSync(path, serialize(spec, big));
  return path;
}
