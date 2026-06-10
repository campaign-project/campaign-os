/**
 * Persistent cross-drive yield store — makes the Moat-B flywheel durable.
 *
 * The YieldModel is an in-memory Beta-Binomial accumulator; on its own it forgets
 * everything between runs, so every drive restarts at the 0.80 cold-start prior and
 * re-pays the "learning tax" (wasted hours on low-validity gatherers before it figures
 * them out). This store persists the accumulated counts to disk so the NEXT drive
 * starts WARM — it already knows each gatherer / location / format's track record.
 *
 * Usage pattern (the model is the accumulator):
 *     const model = warmModel(path);     // seed from everything learned so far
 *     ...run the drive, model.observeReport(...) on each batch...
 *     saveStore(path, model, { newDrive: true });   // persist the accumulated total
 *
 * Because the state is additive {valid,total} counts, "compounding across drives" is
 * just integer addition — drive N+1's observations add to drive N's and the posterior
 * tightens. Pure logic lives in yield.ts; this file owns the (Node) file I/O.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { YieldModel } from "./yield.ts";

const SCHEMA = "campaignos.yieldstore/v1";

export interface YieldStoreFile {
  schema: string;
  updatedAt: string;
  drives: number; // how many drives have contributed
  observations: Record<string, { valid: number; total: number }>;
}

export function loadStore(path: string): YieldStoreFile {
  if (!existsSync(path)) return { schema: SCHEMA, updatedAt: "", drives: 0, observations: {} };
  const f = JSON.parse(readFileSync(path, "utf8")) as YieldStoreFile;
  return { schema: f.schema ?? SCHEMA, updatedAt: f.updatedAt ?? "", drives: f.drives ?? 0, observations: f.observations ?? {} };
}

/** A YieldModel pre-seeded with everything the store has learned (cold if no store yet). */
export function warmModel(path: string): YieldModel {
  const m = new YieldModel();
  m.merge(loadStore(path).observations);
  return m;
}

/** Persist a model's accumulated snapshot. Pass newDrive to increment the drive counter. */
export function saveStore(path: string, model: YieldModel, opts: { newDrive?: boolean; stamp?: string } = {}): YieldStoreFile {
  const prev = loadStore(path);
  const file: YieldStoreFile = {
    schema: SCHEMA,
    updatedAt: opts.stamp ?? new Date().toISOString().slice(0, 10),
    drives: prev.drives + (opts.newDrive ? 1 : 0),
    observations: model.snapshot(),
  };
  writeFileSync(path, JSON.stringify(file, null, 2));
  return file;
}
