/* ============================================================
   CampaignOS validation engine — BROWSER CORE
   A faithful, dependency-free port of the pure logic from
   prototypes/validation-engine/{normalize,match,rules}.ts so the
   Gather field app computes REAL verdicts on-device (works on file://).
   Only the file *loader* needs Node; this matcher + validity logic is pure.
   Sets window.CampaignEngine = { buildIndex, matchSigner, evaluate, validate }.
   ============================================================ */
(() => {
  "use strict";

  // ---- normalize.ts ----
  const NICKNAMES = {
    bob: "robert", rob: "robert", bobby: "robert", robbie: "robert",
    bill: "william", billy: "william", will: "william", liam: "william",
    jim: "james", jimmy: "james", jamie: "james", joe: "joseph", joey: "joseph",
    mike: "michael", mikey: "michael", dave: "david",
    dick: "richard", rick: "richard", ricky: "richard", rich: "richard",
    tom: "thomas", tommy: "thomas", steve: "stephen", steven: "stephen",
    chris: "christopher", matt: "matthew", dan: "daniel", danny: "daniel",
    tony: "anthony", ed: "edward", eddie: "edward", ned: "edward",
    ben: "benjamin", benny: "benjamin", sam: "samuel", sammy: "samuel",
    beth: "elizabeth", liz: "elizabeth", lizzie: "elizabeth", betty: "elizabeth", eliza: "elizabeth",
    kate: "katherine", katie: "katherine", kathy: "katherine", cathy: "katherine", catherine: "katherine",
    peggy: "margaret", meg: "margaret", maggie: "margaret", sue: "susan", suzie: "susan",
    jen: "jennifer", jenny: "jennifer", abby: "abigail", becky: "rebecca", cindy: "cynthia",
    patty: "patricia", pat: "patricia", trish: "patricia", sandy: "sandra",
    debbie: "deborah", deb: "deborah",
  };
  const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
  const STREET_TYPES = {
    street: "st", st: "st", avenue: "ave", ave: "ave", av: "ave", road: "rd", rd: "rd",
    drive: "dr", dr: "dr", lane: "ln", ln: "ln", court: "ct", ct: "ct",
    boulevard: "blvd", blvd: "blvd", place: "pl", pl: "pl", circle: "cir", cir: "cir",
    terrace: "ter", ter: "ter", highway: "hwy", hwy: "hwy", parkway: "pkwy", pkwy: "pkwy",
    way: "way", trail: "trl", trl: "trl",
  };
  const DIRECTIONALS = {
    north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w",
    northeast: "ne", ne: "ne", northwest: "nw", nw: "nw", southeast: "se", se: "se", southwest: "sw", sw: "sw",
  };
  const UNIT_RE = /(?:#\s*|\b(?:apt|apartment|unit|ste|suite|no|num|bldg|fl|floor|rm|room)\b\.?\s*)([0-9]+[a-z]?|[a-z]\d*)/i;

  function basic(s) {
    return (s ?? "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[.,'"`]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normName(raw) {
    let s = basic(raw);
    if ((raw || "").includes(",")) { const [last, rest] = raw.split(","); s = basic(`${rest} ${last}`); }
    const tokens = s.split(" ").filter(Boolean).filter((t) => !SUFFIXES.has(t));
    if (tokens.length === 0) return { first: "", last: "", middle: "", full: "" };
    const first0 = tokens[0];
    const first = NICKNAMES[first0] ?? first0;
    const last = tokens.length > 1 ? tokens[tokens.length - 1] : "";
    const middle = tokens.slice(1, -1).join(" ");
    return { first, last, middle, full: [first, middle, last].filter(Boolean).join(" ") };
  }

  function normAddress(raw) {
    const r = raw ?? "";
    const zip5 = (r.match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1] ?? "";
    let streetLine = r.split(",")[0];
    let unit = "";
    const um = streetLine.match(UNIT_RE);
    if (um) { unit = um[1]; streetLine = streetLine.slice(0, um.index) + " " + streetLine.slice(um.index + um[0].length); }
    const toks = basic(streetLine).split(" ").filter(Boolean);
    let number = "", i = 0;
    if (toks.length && /^\d+[a-z]?$/.test(toks[0])) { number = toks[0].replace(/[a-z]$/, ""); i = 1; }
    const street = toks.slice(i).map((t) => DIRECTIONALS[t] ?? STREET_TYPES[t] ?? t).join(" ").trim();
    return { number, street, unit: unit.trim(), zip5 };
  }

  // ---- match.ts ----
  const MATCH_AT = 0.88, REVIEW_AT = 0.7;

  function jaro(a, b) {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    const md = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
    let m = 0;
    for (let i = 0; i < a.length; i++) {
      const lo = Math.max(0, i - md), hi = Math.min(i + md + 1, b.length);
      for (let j = lo; j < hi; j++) { if (bm[j] || a[i] !== b[j]) continue; am[i] = bm[j] = true; m++; break; }
    }
    if (m === 0) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < a.length; i++) { if (!am[i]) continue; while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; }
    t /= 2;
    return (m / a.length + m / b.length + (m - t) / m) / 3;
  }
  function jaroWinkler(a, b) {
    const j = jaro(a, b);
    if (j < 0.7) return j;
    let p = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) { if (a[i] === b[i]) p++; else break; }
    return j + p * 0.1 * (1 - j);
  }
  function scoreName(a, b) {
    if (!a.last || !b.last) return 0;
    const last = jaroWinkler(a.last, b.last);
    let first;
    if (a.first && b.first && a.first === b.first) first = 1;
    else if (a.first && b.first && a.first[0] === b.first[0] && (a.first.length === 1 || b.first.length === 1)) first = 0.85;
    else first = jaroWinkler(a.first, b.first);
    return 0.6 * last + 0.4 * first;
  }
  function scoreAddr(a, b) {
    let num;
    if (a.number && b.number) num = a.number === b.number ? 1 : 0; else num = 0.5;
    const street = a.street && b.street ? jaroWinkler(a.street, b.street) : 0.5;
    const zip = a.zip5 && b.zip5 ? (a.zip5 === b.zip5 ? 1 : 0) : 0.5;
    return 0.5 * num + 0.35 * street + 0.15 * zip;
  }
  function blockKeysFor(n, a) {
    const pfx = n.last.slice(0, 3), keys = [`L:${pfx}`];
    if (a.zip5) keys.push(`Z:${a.zip5}|L:${pfx}`);
    return keys;
  }
  function buildIndex(voters) {
    const byBlock = new Map();
    for (const rec of voters) {
      const n = normName(rec.name), a = normAddress(rec.address), entry = { rec, n, a };
      for (const k of blockKeysFor(n, a)) { const arr = byBlock.get(k); if (arr) arr.push(entry); else byBlock.set(k, [entry]); }
    }
    return { size: voters.length, byBlock };
  }
  function matchSigner(signer, index) {
    const sn = normName(signer.name), sa = normAddress(signer.address);
    const seen = new Set(), cands = [];
    for (const k of blockKeysFor(sn, sa)) for (const e of (index.byBlock.get(k) || [])) { if (seen.has(e.rec.id)) continue; seen.add(e.rec.id); cands.push(e); }
    let best = null;
    for (const c of cands) {
      const ns = scoreName(sn, c.n), as = scoreAddr(sa, c.a), score = 0.65 * ns + 0.35 * as;
      if (!best || score > best.score) best = { rec: c.rec, nameScore: ns, addrScore: as, score };
    }
    if (!best) return { band: "NO_MATCH", score: 0, candidatesConsidered: 0, detail: "no candidate in any block (not in voter file)" };
    const band = best.score >= MATCH_AT ? "MATCH" : best.score >= REVIEW_AT ? "REVIEW" : "NO_MATCH";
    return { band, score: best.score, voter: band === "NO_MATCH" ? undefined : best.rec, nameScore: best.nameScore, addrScore: best.addrScore, candidatesConsidered: cands.length };
  }

  // ---- rules.ts (voter-file-match branch) ----
  function evaluate(signer, m, ctx) {
    ctx = ctx || { mode: "voter-file-match" };
    const reasons = [];
    if (m.band === "NO_MATCH") { reasons.push("not found in voter file — signer is not a registered voter (or wrong name/address)"); return { verdict: "INVALID", reasons }; }
    if (m.band === "REVIEW") { reasons.push(`probable match (${m.score.toFixed(2)}) below auto-accept threshold — needs a second look or more identifying data`); return { verdict: "NEEDS_REVIEW", reasons, matchedVoterId: m.voter && m.voter.id }; }
    const v = m.voter;
    if (v.status !== "active") { reasons.push(`matched voter ${v.id} is ${v.status}, not an active/eligible elector`); return { verdict: "INVALID", reasons, matchedVoterId: v.id }; }
    if (signer.signedOn && v.registeredOn && v.registeredOn > signer.signedOn) { reasons.push(`voter registered ${v.registeredOn}, after the signing date ${signer.signedOn} — not registered at time of signing`); return { verdict: "INVALID", reasons, matchedVoterId: v.id }; }
    if (ctx.requiredJurisdiction && v.district && v.district !== ctx.requiredJurisdiction) { reasons.push(`registered in ${v.district}, not the required ${ctx.requiredJurisdiction} — counts toward wrong distribution bucket`); return { verdict: "NEEDS_REVIEW", reasons, matchedVoterId: v.id }; }
    reasons.push(`confident match to active voter ${v.id}; conditions satisfied`);
    return { verdict: "VALID", reasons, matchedVoterId: v.id };
  }

  function validate(signer, index, ctx) {
    const m = matchSigner(signer, index);
    const res = evaluate(signer, m, ctx);
    return { ...res, band: m.band, score: m.score, voter: m.voter };
  }

  window.CampaignEngine = { buildIndex, matchSigner, evaluate, validate, normName, normAddress, MATCH_AT, REVIEW_AT };
})();
