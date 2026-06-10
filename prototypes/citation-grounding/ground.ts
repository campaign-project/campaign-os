/**
 * Citation-Grounding Checker — prototype (CampaignOS, RFC-001 §5.5, layer 3)
 *
 * Deterministic, NO-LLM verification layer. For each citation {url, quote} it
 * answers exactly one question:
 *
 *     "Does this exact quoted text actually appear at this URL?"
 *
 * It catches fabricated quotes, altered quotes, and dead links — the citation-
 * integrity failure mode. It does NOT judge whether the quote *supports* the
 * claimed value; that is a separate (consensus / adversarial) layer. Keeping this
 * boundary sharp is what makes this layer trustworthy: it cannot hallucinate its
 * own verdict, because the verdict is a string match against fetched bytes.
 *
 * Run (Node >= 22.6, no install):
 *   node --experimental-strip-types ground.ts --selftest          # offline, proves the matcher
 *   node --experimental-strip-types ground.ts citations.sample.json   # live fetch + check
 *
 * The fetcher is pluggable. The default uses Node's global fetch with browser-ish
 * headers; production should inject a browser-grade fetcher (wick / Playwright) so
 * bot-blocked SOS pages (HTTP 403) and PDFs resolve instead of going UNREACHABLE.
 */

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const pexec = promisify(execFile);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type Verdict = "GROUNDED" | "PARTIAL" | "NOT_FOUND" | "UNREACHABLE";

export interface Citation {
  id?: string;
  field?: string; // which StateBallotRule field this citation backs
  url: string;
  quote: string;
}

interface FetchResult {
  ok: boolean;
  status?: number;
  text?: string;
  error?: string;
  via?: string; // which fetcher resolved it: node | wick | pdftotext
}

export type Fetcher = (url: string) => Promise<FetchResult>;

export interface GroundingResult {
  citation: Citation;
  verdict: Verdict;
  score: number; // 0..1 best similarity of the quote against the fetched text
  matchedSnippet?: string;
  detail: string;
  fetch: { ok: boolean; status?: number; bytes?: number; error?: string; via?: string };
}

// Tunables. Exact/near-exact => GROUNDED; materially-present-but-altered => PARTIAL.
const GROUNDED_AT = 0.97;
const PARTIAL_AT = 0.75;
const MAX_CONTENT_TOKENS = 200_000;

// ----------------------------------------------------------------------------
// Text normalization — fold the differences that make a *correct* citation look
// wrong (smart quotes, dashes, NBSP, case, whitespace runs).
// ----------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’‛′`´]/g, "'") // ‘ ’ ‛ ′ ` ´ -> '
    .replace(/[“”‟″]/g, '"') // “ ” ‟ ″ -> "
    .replace(/[‐-―−]/g, "-") // hyphen/dash variants + minus -> -
    .replace(/[   ]/g, " ") // nbsp variants -> space
    .replace(/…/g, "...") // ellipsis
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------------------------------
// Fuzzy matcher — word-bigram Dice coefficient over a sliding window, anchored on
// the rarest quote token so it stays fast on long statute pages. Returns the best
// similarity in [0,1] and the matched snippet.
// ----------------------------------------------------------------------------

function bigrams(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = tokens[i] + " " + tokens[i + 1];
    m.set(bg, (m.get(bg) ?? 0) + 1);
  }
  return m;
}

function dice(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let overlap = 0;
  let sizeA = 0;
  let sizeB = 0;
  for (const v of a.values()) sizeA += v;
  for (const v of b.values()) sizeB += v;
  for (const [k, av] of a) {
    const bv = b.get(k);
    if (bv) overlap += Math.min(av, bv);
  }
  return (2 * overlap) / (sizeA + sizeB);
}

/** Asymmetric coverage: what fraction of the QUOTE's bigrams appear in the window.
 *  Robust to the source span being longer than the quote (extra connective words). */
function containment(qb: Map<string, number>, wb: Map<string, number>): number {
  let qbSize = 0;
  for (const v of qb.values()) qbSize += v;
  if (qbSize === 0) return 0;
  let covered = 0;
  for (const [k, av] of qb) {
    const bv = wb.get(k);
    if (bv) covered += Math.min(av, bv);
  }
  return covered / qbSize;
}

function groundQuote(content: string, quote: string): { score: number; snippet?: string } {
  const c = normalize(content);
  const q = normalize(quote);
  if (!q) return { score: 0 };
  if (!c) return { score: 0 };

  // Fast path: exact (post-normalization) substring => perfect grounding.
  if (c.includes(q)) return { score: 1, snippet: quote };

  let cTokens = c.split(" ");
  if (cTokens.length > MAX_CONTENT_TOKENS) cTokens = cTokens.slice(0, MAX_CONTENT_TOKENS);
  const qTokens = q.split(" ");
  const win = qTokens.length;

  // Single-token quotes can't form bigrams — fall back to presence.
  if (win < 2) return { score: c.includes(q) ? 1 : 0 };

  const qb = bigrams(qTokens);

  // Anchor on the rarest quote token to localize candidate windows.
  const freq = new Map<string, number>();
  for (const t of cTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  let anchor = qTokens[0];
  let anchorFreq = Infinity;
  for (const t of qTokens) {
    const f = freq.get(t) ?? 0;
    // prefer a token that exists and is rare; tie-break on longer (more distinctive) token
    if (f > 0 && (f < anchorFreq || (f === anchorFreq && t.length > anchor.length))) {
      anchor = t;
      anchorFreq = f;
    }
  }
  if (anchorFreq === Infinity) return { score: 0 }; // not even the rarest word is present

  const anchorPositions: number[] = [];
  for (let i = 0; i < cTokens.length; i++) if (cTokens[i] === anchor) anchorPositions.push(i);

  // Try both a quote-length window and a slightly larger one, so a source span
  // with a few extra interleaved words still scores. Score = max(symmetric Dice,
  // asymmetric quote-containment).
  const lengths = [win, win + 3];
  let best = 0;
  let bestStart = 0;
  let bestLen = win;
  for (const p of anchorPositions) {
    for (const L of lengths) {
      const lo = Math.max(0, p - L + 1);
      for (let start = lo; start <= p; start++) {
        const wb = bigrams(cTokens.slice(start, start + L));
        const score = Math.max(dice(qb, wb), containment(qb, wb));
        if (score > best) {
          best = score;
          bestStart = start;
          bestLen = L;
        }
        if (best === 1) break;
      }
      if (best === 1) break;
    }
    if (best === 1) break;
  }

  return { score: best, snippet: cTokens.slice(bestStart, bestStart + bestLen).join(" ") };
}

function verdictFor(score: number): Verdict {
  if (score >= GROUNDED_AT) return "GROUNDED";
  if (score >= PARTIAL_AT) return "PARTIAL";
  return "NOT_FOUND";
}

// ----------------------------------------------------------------------------
// Fetching — default Node fetcher with HTML->text. Pluggable.
// ----------------------------------------------------------------------------

function stripHtml(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  // decode the entities that actually matter for legal text
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return s.replace(/\s+/g, " ").trim();
}

const nodeFetcher: Fetcher = async (url: string) => {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        // browser-ish; real bot-blockers (e.g. FindLaw) still 403 -> use wick in prod
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    if (ct.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      return { ok: false, status: res.status, error: "pdf-needs-extractor (inject a PDF text layer)" };
    }
    const body = await res.text();
    const text = ct.includes("html") || /<html/i.test(body) ? stripHtml(body) : body;
    return { ok: true, status: res.status, text };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

// ----------------------------------------------------------------------------
// Browser-grade + PDF fetchers — shell out to the wick CLI and poppler's
// pdftotext when present. The Fetcher seam means nothing downstream changes.
// ----------------------------------------------------------------------------

function hasCmd(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const WICK = hasCmd("wick");
const PDFTOTEXT = hasCmd("pdftotext");

const isPdfUrl = (url: string) => /\.pdf($|\?)/i.test(url);

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/** Browser-grade HTML via the wick CLI — resolves UA-blocked / JS / Cloudflare
 *  pages the Node fetcher misses. !ok on CAPTCHA/challenge or if wick is absent. */
const wickFetcher: Fetcher = async (url: string) => {
  if (!WICK) return { ok: false, error: "wick not installed" };
  let out = "";
  try {
    const r = await pexec("wick", ["fetch", "--format", "text", "--no-robots", url], {
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    out = r.stdout ?? "";
  } catch (e) {
    out = (e as { stdout?: string }).stdout ?? ""; // wick may exit nonzero but still print
  }
  if (!out.trim() || /returned a CAPTCHA or browser challenge/i.test(out)) {
    return { ok: false, error: "wick: captcha/challenge or empty" };
  }
  return { ok: true, text: out, via: "wick" };
};

/** PDF text layer: download bytes (browser UA) → poppler pdftotext; fall back to
 *  wick's own extraction. Bot-blocked / dead hosts stay UNREACHABLE (honest). */
async function fetchPdfText(url: string): Promise<FetchResult> {
  if (PDFTOTEXT) {
    let tmp = "";
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": BROWSER_UA, Accept: "application/pdf,*/*" },
        signal: AbortSignal.timeout(40_000),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        tmp = join(tmpdir(), `cg-${randomUUID()}.pdf`);
        writeFileSync(tmp, buf);
        const { stdout } = await pexec("pdftotext", ["-q", tmp, "-"], { maxBuffer: 64 * 1024 * 1024 });
        if (stdout && stdout.trim()) return { ok: true, status: res.status, text: stdout, via: "pdftotext" };
      }
    } catch {
      /* fall through to wick */
    } finally {
      if (tmp)
        try {
          rmSync(tmp, { force: true });
        } catch {
          /* ignore */
        }
    }
  }
  const w = await wickFetcher(url);
  if (w.ok) return w;
  return { ok: false, error: "pdf unreachable (download blocked / host down / no extractor)" };
}

/** Default: fast Node fetch, escalate to wick on failure; PDFs go through the PDF layer. */
const autoFetcher: Fetcher = async (url: string) => {
  if (isPdfUrl(url)) return fetchPdfText(url);
  const n = await nodeFetcher(url);
  if (n.ok) return { ...n, via: "node" };
  if (n.error && /pdf/i.test(n.error)) return fetchPdfText(url); // content-type was PDF
  if (WICK) {
    const w = await wickFetcher(url);
    if (w.ok) return w; // escalated to browser-grade
  }
  return n; // preserve the original failure detail
};

export function pickFetcher(name: string): Fetcher {
  if (name === "node") return nodeFetcher;
  if (name === "wick") return async (u) => (isPdfUrl(u) ? fetchPdfText(u) : wickFetcher(u));
  return autoFetcher;
}

// ----------------------------------------------------------------------------
// Per-citation + per-record checks
// ----------------------------------------------------------------------------

export async function checkCitation(c: Citation, fetcher: Fetcher): Promise<GroundingResult> {
  const f = await fetcher(c.url);
  if (!f.ok || !f.text) {
    return {
      citation: c,
      verdict: "UNREACHABLE",
      score: 0,
      detail: `could not read source (${f.error ?? "no content"}) — source blocked or host down`,
      fetch: { ok: false, status: f.status, error: f.error, via: f.via },
    };
  }
  const { score, snippet } = groundQuote(f.text, c.quote);
  const verdict = verdictFor(score);
  const detail =
    verdict === "GROUNDED"
      ? "quote found verbatim at source"
      : verdict === "PARTIAL"
        ? "quote materially present but altered/paraphrased — review wording"
        : "quote NOT found at source — possible fabrication or wrong URL";
  return {
    citation: c,
    verdict,
    score,
    matchedSnippet: snippet,
    detail,
    fetch: { ok: true, status: f.status, bytes: f.text.length, via: f.via },
  };
}

async function checkRecord(citations: Citation[], fetcher: Fetcher): Promise<GroundingResult[]> {
  // bounded concurrency
  const out: GroundingResult[] = [];
  const LIMIT = 5;
  for (let i = 0; i < citations.length; i += LIMIT) {
    const batch = citations.slice(i, i + LIMIT);
    out.push(...(await Promise.all(batch.map((c) => checkCitation(c, fetcher)))));
  }
  return out;
}

// ----------------------------------------------------------------------------
// Reporting
// ----------------------------------------------------------------------------

const ICON: Record<Verdict, string> = {
  GROUNDED: "✓",
  PARTIAL: "≈",
  NOT_FOUND: "✗",
  UNREACHABLE: "∅",
};

function report(results: GroundingResult[]): number {
  const counts: Record<Verdict, number> = { GROUNDED: 0, PARTIAL: 0, NOT_FOUND: 0, UNREACHABLE: 0 };
  console.log("\n  citation grounding report");
  console.log("  " + "─".repeat(76));
  for (const r of results) {
    counts[r.verdict]++;
    const tag = `${ICON[r.verdict]} ${r.verdict}`.padEnd(15);
    const field = (r.citation.field ?? r.citation.id ?? "").padEnd(22).slice(0, 22);
    console.log(`  ${tag} ${field} score=${r.score.toFixed(2)} via=${r.fetch.via ?? "—"}`);
    console.log(`     ${r.citation.url}`);
    console.log(`     ${r.detail}`);
    if (r.verdict === "PARTIAL" && r.matchedSnippet) {
      console.log(`     source≈ "…${r.matchedSnippet.slice(0, 90)}…"`);
    }
    console.log("");
  }
  const reachable = results.length - counts.UNREACHABLE;
  const groundedRate = reachable ? (counts.GROUNDED / reachable) : 0;
  console.log("  " + "─".repeat(76));
  console.log(
    `  ${results.length} citations · ✓ ${counts.GROUNDED} grounded · ≈ ${counts.PARTIAL} partial · ` +
      `✗ ${counts.NOT_FOUND} not-found · ∅ ${counts.UNREACHABLE} unreachable`,
  );
  console.log(`  grounding rate (of reachable): ${(groundedRate * 100).toFixed(0)}%`);

  // Gate suggestion — maps onto the §5.5 tiered gate.
  if (counts.NOT_FOUND > 0) {
    console.log("\n  GATE: ✗ FAIL — citation integrity broken (possible fabrication). Block these fields.");
    return 1;
  }
  if (counts.UNREACHABLE > 0) {
    console.log("\n  GATE: ⚠ RE-FETCH — some sources unreachable; retry with browser-grade fetcher (wick) before trusting.");
    return 2;
  }
  if (counts.PARTIAL > 0) {
    console.log("\n  GATE: ⚠ REVIEW — quotes present but altered; tighten wording, then AUTO-LIVE.");
    return 0;
  }
  console.log("\n  GATE: ✓ PASS — every citation grounded verbatim at its source.");
  return 0;
}

// ----------------------------------------------------------------------------
// Offline self-test — proves the matcher with a fake fetcher (no network).
// ----------------------------------------------------------------------------

async function selftest(): Promise<number> {
  // a snippet of real-ish statute text, with the formatting quirks that trip naive matchers
  const FAKE: Record<string, string> = {
    "mock://co/1-4-905":
      "<p>(3)&nbsp;The designated election official shall not accept for filing any section " +
      "of a petition which does not have attached to it the notarized affidavit required by this section.</p>",
    "mock://ca/8401":
      "If the statistical sampling shows that the number of valid signatures is within 90 to 110 " +
      "percent of the number of signatures needed to declare the petition sufficient, the elections " +
      "official shall examine and verify each signature filed.",
  };
  const fake: Fetcher = async (url) =>
    url in FAKE ? { ok: true, status: 200, text: stripHtml(FAKE[url]) } : { ok: false, status: 404, error: "HTTP 404" };

  const cases: { name: string; cit: Citation; expect: Verdict }[] = [
    {
      name: "exact (despite &nbsp; + curly punctuation)",
      cit: { field: "witnessOrNotary", url: "mock://co/1-4-905", quote: "shall not accept for filing any section of a petition which does not have attached to it the notarized affidavit" },
      expect: "GROUNDED",
    },
    {
      name: "smart-quote / case / whitespace variant",
      cit: { field: "validationModel", url: "mock://ca/8401", quote: "within 90 to 110 percent of the number of signatures needed to declare the petition SUFFICIENT,  the elections official shall examine and verify each signature" },
      expect: "GROUNDED",
    },
    {
      name: "near-verbatim, dropped words (real transcription drift)",
      cit: { field: "validationModel", url: "mock://ca/8401", quote: "the official shall examine and verify each signature" },
      expect: "PARTIAL",
    },
    {
      name: "fabricated quote (NOT at source)",
      cit: { field: "captureMode", url: "mock://co/1-4-905", quote: "petitions may be signed electronically from any mobile device anywhere in the state" },
      expect: "NOT_FOUND",
    },
    {
      name: "dead link",
      cit: { field: "deadline", url: "mock://co/missing", quote: "anything" },
      expect: "UNREACHABLE",
    },
  ];

  const results = await Promise.all(cases.map((t) => checkCitation(t.cit, fake)));
  let pass = 0;
  console.log("\n  self-test (offline, deterministic)");
  console.log("  " + "─".repeat(76));
  results.forEach((r, i) => {
    const ok = r.verdict === cases[i].expect;
    if (ok) pass++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${ICON[r.verdict]} ${r.verdict.padEnd(12)} ` +
        `(expected ${cases[i].expect.padEnd(11)}) score=${r.score.toFixed(2)}  ${cases[i].name}`,
    );
  });
  console.log("  " + "─".repeat(76));
  console.log(`  ${pass}/${cases.length} matcher cases passed\n`);
  return pass === cases.length ? 0 : 1;
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--selftest")) {
    process.exit(await selftest());
  }
  const fetcherName = args.find((a) => a.startsWith("--fetcher="))?.split("=")[1] ?? "auto";
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: ground.ts <citations.json> [--fetcher=auto|node|wick]");
    process.exit(64);
  }
  const fetcher = pickFetcher(fetcherName);
  const citations = JSON.parse(readFileSync(file, "utf8")) as Citation[];
  console.log(
    `\n  fetching + grounding ${citations.length} citations ` +
      `(fetcher=${fetcherName}; wick=${WICK ? "yes" : "no"}, pdftotext=${PDFTOTEXT ? "yes" : "no"})…`,
  );
  const results = await checkRecord(citations, fetcher);
  process.exit(report(results));
}

// Only run the CLI when invoked directly — allows `import` from the pipeline.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
