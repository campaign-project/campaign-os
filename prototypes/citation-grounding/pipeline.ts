/**
 * Verification pipeline orchestrator — prototype (RFC-001 §5.5).
 *
 * Wires the deterministic citation-grounding checker in as the SHORT-CIRCUIT stage:
 *
 *   STAGE 1  grounding (deterministic, cheap)  ── NOT_FOUND / no-ground ─▶ BLOCKED
 *      │  (survivors only)
 *      ▼
 *   STAGE 2  consensus + adversarial judge (LLM, expensive)
 *      ▼
 *   STAGE 3  tiered gate → AUTO-LIVE | CONSERVATIVE-HOLD | BLOCKED
 *
 * The point: a fabricated/altered citation is killed for free in Stage 1, so the
 * expensive LLM layers never run on a field whose evidence is fake. And grounding is
 * NECESSARY-BUT-NOT-SUFFICIENT — Stage 2 still catches a quote that is real but
 * stale/wrong, or a value that hinges on legal interpretation.
 *
 * Run:
 *   node --experimental-strip-types pipeline.ts rule.ca.draft.json
 *
 * The LLM judge is a pluggable seam. This prototype ships a deterministic `mockJudge`
 * so the wiring is runnable offline-of-LLMs; production injects `agentJudge` (the
 * consensus + adversarial subagents already demonstrated against AZ/CA/CO).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkCitation, pickFetcher } from "./ground.ts";
import type { Citation, GroundingResult, Fetcher } from "./ground.ts";

type Gate = "AUTO-LIVE" | "CONSERVATIVE-HOLD" | "BLOCKED";

interface DraftField {
  field: string;
  value: string;
  citations: Citation[];
  conservativeFallback?: string; // the strictest interpretation to use while held
}
interface RuleDraft {
  jurisdiction: string;
  accessPath?: string;
  fields: DraftField[];
}

interface JudgeResult {
  agree: boolean; // does the verifier agree the value is current + correct?
  confidence: number;
  interpretationRequired: boolean; // legal interpretation, not settleable by retrieval
  note: string;
}
type Judge = (field: DraftField, grounded: GroundingResult[]) => Promise<JudgeResult>;

interface FieldOutcome {
  field: string;
  value: string;
  grounding: string;
  judged: boolean; // did it reach the expensive LLM layer?
  judge?: JudgeResult;
  gate: Gate;
  reliedValue: string; // what the optimizer is allowed to use
  reason: string;
}

// ----------------------------------------------------------------------------
// The judge seam. mockJudge is deterministic and mirrors the real findings from
// the AZ/CA/CO runs (notary = interpretation; stale $/figures = disagree).
// ----------------------------------------------------------------------------

const mockJudge: Judge = async (f) => {
  const name = f.field.toLowerCase();
  const value = f.value.toLowerCase();

  // grounding can confirm a quote is REAL while the value is STALE/WRONG — the
  // judge (consensus + adversarial) is what catches that. (cf. CO's stale "5,000"
  // and "$500" tracing to the presidential-primary statute, not the general path.)
  if (/\$\d|5,?000\b/.test(value)) {
    return {
      agree: false,
      confidence: 0.4,
      interpretationRequired: false,
      note: "value appears stale / from the wrong statute path — verifier disagrees despite a real citation",
    };
  }
  // some questions are legal interpretation, not fact lookup (cf. CA sworn-affidavit
  // vs. perjury-declaration; AZ weekend-deadline rollover).
  if (/notary|affidavit|deadline/.test(name)) {
    return {
      agree: true,
      confidence: 0.7,
      interpretationRequired: true,
      note: "legal-interpretation question — not settled by retrieval (e.g. sworn affidavit vs. perjury declaration)",
    };
  }
  return {
    agree: true,
    confidence: 0.95,
    interpretationRequired: false,
    note: "independent agents converged; adversarial reviewer could not refute",
  };
};

// agentJudge seam: in production this spawns N consensus research agents + 1
// adversarial reviewer live. Here we consume their structured verdicts from a file
// (keyed by field name) — the same Stage-3 gate runs on real judgments, no mock.
function fileJudge(path: string): Judge {
  const map = JSON.parse(readFileSync(path, "utf8")) as Record<string, JudgeResult>;
  return async (f) =>
    map[f.field] ?? {
      agree: false,
      confidence: 0,
      interpretationRequired: true,
      note: "no judge verdict supplied for this field — hold conservatively",
    };
}

// ----------------------------------------------------------------------------
// Pipeline
// ----------------------------------------------------------------------------

function blocked(f: DraftField, grounding: string, reason: string): FieldOutcome {
  return {
    field: f.field,
    value: f.value,
    grounding,
    judged: false,
    gate: "BLOCKED",
    reliedValue: "(none — blocked)",
    reason,
  };
}

async function runPipeline(draft: RuleDraft, fetcher: Fetcher, judge: Judge): Promise<FieldOutcome[]> {
  const out: FieldOutcome[] = [];
  for (const f of draft.fields) {
    // ---- STAGE 1: deterministic grounding (the short-circuit) ----
    const g = await Promise.all(f.citations.map((c) => checkCitation(c, fetcher)));
    const grounded = g.filter((r) => r.verdict === "GROUNDED");
    const notFound = g.filter((r) => r.verdict === "NOT_FOUND");
    const partial = g.filter((r) => r.verdict === "PARTIAL");
    const unreachable = g.filter((r) => r.verdict === "UNREACHABLE");
    const summary = `${grounded.length}✓ ${partial.length}≈ ${notFound.length}✗ ${unreachable.length}∅`;

    if (notFound.length > 0) {
      out.push(blocked(f, summary, "SHORT-CIRCUIT: citation integrity failure (fabricated/altered quote) — LLM layers skipped"));
      continue;
    }
    if (grounded.length === 0) {
      const why = unreachable.length === g.length ? "all sources unreachable — re-fetch" : "no verbatim-grounded citation";
      out.push(blocked(f, summary, `SHORT-CIRCUIT: ${why} — LLM layers skipped`));
      continue;
    }

    // ---- STAGE 2: consensus + adversarial judge (survivors only) ----
    const j = await judge(f, grounded);

    // ---- STAGE 3: tiered gate ----
    let gate: Gate;
    let reliedValue = f.value;
    let reason: string;
    const fallback = f.conservativeFallback ?? `STRICTEST reading of: ${f.value}`;
    if (!j.agree) {
      gate = "CONSERVATIVE-HOLD";
      reliedValue = fallback;
      reason = "grounded BUT verifier disagrees (stale/wrong value) — hold at strictest + escalate to SOS";
    } else if (j.interpretationRequired) {
      gate = "CONSERVATIVE-HOLD";
      reliedValue = fallback;
      reason = "grounded + agreed, but legal-interpretation question — hold at strictest + draft SOS inquiry";
    } else if (partial.length > 0) {
      gate = "CONSERVATIVE-HOLD";
      reason = "grounded only as PARTIAL (altered quote) — tighten wording, then auto-live";
    } else {
      gate = "AUTO-LIVE";
      reason = "grounded verbatim + verifier agrees";
    }
    out.push({ field: f.field, value: f.value, grounding: summary, judged: true, judge: j, gate, reliedValue, reason });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Report
// ----------------------------------------------------------------------------

const GATE_ICON: Record<Gate, string> = { "AUTO-LIVE": "🟢", "CONSERVATIVE-HOLD": "🟡", BLOCKED: "🔴" };

function report(draft: RuleDraft, outcomes: FieldOutcome[]): number {
  console.log(`\n  verification pipeline — ${draft.jurisdiction}`);
  console.log(`  ${draft.accessPath ?? ""}`);
  console.log("  " + "─".repeat(82));
  for (const o of outcomes) {
    console.log(`  ${GATE_ICON[o.gate]} ${o.gate.padEnd(18)} ${o.field}`);
    console.log(`     value     : ${o.value}`);
    console.log(`     grounding : ${o.grounding}   judged: ${o.judged ? "yes" : "NO (short-circuited)"}`);
    if (o.judge) console.log(`     judge     : agree=${o.judge.agree} interp=${o.judge.interpretationRequired} — ${o.judge.note}`);
    console.log(`     → optimizer uses: ${o.reliedValue}`);
    console.log(`     reason    : ${o.reason}`);
    console.log("");
  }
  const n = (g: Gate) => outcomes.filter((o) => o.gate === g).length;
  const shortCircuited = outcomes.filter((o) => !o.judged).length;
  console.log("  " + "─".repeat(82));
  console.log(`  ${outcomes.length} fields · 🟢 ${n("AUTO-LIVE")} auto-live · 🟡 ${n("CONSERVATIVE-HOLD")} hold · 🔴 ${n("BLOCKED")} blocked`);
  console.log(`  LLM judging skipped (short-circuited at grounding): ${shortCircuited} field(s) — cost saved, integrity enforced early`);
  return n("BLOCKED") > 0 ? 1 : 0;
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: pipeline.ts <rule.draft.json> [--fetcher=auto|node|wick]");
    process.exit(64);
  }
  const fetcherName = args.find((a) => a.startsWith("--fetcher="))?.split("=")[1] ?? "auto";
  const judgeFile = args.find((a) => a.startsWith("--judge="))?.split("=")[1];
  const judge = judgeFile ? fileJudge(judgeFile) : mockJudge;
  const draft = JSON.parse(readFileSync(file, "utf8")) as RuleDraft;
  console.log(
    `\n  running 3-stage verification on ${draft.fields.length} fields ` +
      `(judge=${judgeFile ? `agent:${judgeFile}` : "mock"}; fetcher=${fetcherName})…`,
  );
  const outcomes = await runPipeline(draft, pickFetcher(fetcherName), judge);
  process.exit(report(draft, outcomes));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
