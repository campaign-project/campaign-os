/* Ballot Access Risk Board — renders window.BALLOT_DATA into an interactive board. */
(() => {
  "use strict";
  const DATA = (window.BALLOT_DATA || []).slice();
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const CRITICAL = new Set(["signaturesRequired", "deadline", "distributionRule"]);

  // ---- tally each state's gates once (lens-independent) ----
  for (const d of DATA) {
    let critHold = 0, critBlock = 0, minorHold = 0, minorBlock = 0;
    for (const f of d.fields) {
      const crit = CRITICAL.has(f.f);
      if (f.gate === "BLOCKED") crit ? critBlock++ : minorBlock++;
      else if (f.gate === "CONSERVATIVE-HOLD") crit ? critHold++ : minorHold++;
    }
    d._critHold = critHold; d._critBlock = critBlock;
    d._minorHold = minorHold; d._minorBlock = minorBlock;
    d._holds = critHold + minorHold; d._blocked = critBlock + minorBlock;
    d._sos = (d.sos || []).length;
  }

  // ---- lens: "critical" judges only signatures/deadline/distribution; "all" judges every field ----
  let lens = "critical", filter = "all", query = "", sort = "risk";

  function applyLens() {
    for (const d of DATA) {
      if (lens === "critical") {
        d._status = d._critBlock ? "red" : d._critHold ? "amber" : "green";
        d._rank = d._critBlock ? 0 : d._critHold ? 1 : 3;
      } else {
        d._status = d._blocked ? "red" : d._holds ? "amber" : "green";
        d._rank = d._blocked ? 0 : d._critHold ? 1 : d._holds ? 2 : 3;
      }
    }
  }

  const nStatus = (s) => DATA.filter((d) => d._status === s).length;
  const gateClass = (g) => g === "AUTO-LIVE" ? "AUTOLIVE" : g === "BLOCKED" ? "BLOCKED" : "HOLD";

  function renderHeader() {
    const totalSos = DATA.reduce((a, d) => a + d._sos, 0);
    $("#summary").innerHTML = [
      ["jurisdictions", DATA.length, ""],
      ["fully clear", nStatus("green"), "green"],
      ["needs review", nStatus("amber"), "amber"],
      ["blocked", nStatus("red"), "red"],
      ["SoS inquiries", totalSos, "sos"],
    ].map(([t, v, k]) => `<div class="ba-tile${k ? " ba-tile--" + k : ""}"><dt>${t}</dt><dd>${v}</dd></div>`).join("");
    $("#genstamp").textContent = `${DATA.length} jurisdictions · ${totalSos} SoS inquiries`;

    $("#chips").innerHTML = [
      ["all", "all", DATA.length],
      ["green", "clear", nStatus("green")],
      ["amber", "review", nStatus("amber")],
      ["red", "blocked", nStatus("red")],
    ].map(([f, label, c]) =>
      `<button class="chip" role="tab" data-f="${f}" aria-selected="${f === filter}">` +
      `${f === "all" ? "" : '<span class="cdot"></span>'}${label} <span class="cn">${c}</span></button>`).join("");

    $("#lenscap").textContent = lens === "critical"
      ? "Status reflects only the load-bearing fields — signatures, deadline, distribution. Minor holds (notary, circulator, fee) are shown in each state but don't drive the color."
      : "Status reflects every held field, including minor ones (notary, circulator, fee).";
  }

  function metaHTML(d) {
    const m = [];
    if (lens === "critical") {
      if (d._critBlock) m.push(`<span class="b">🔴 ${d._critBlock}</span>`);
      if (d._critHold) m.push(`<span class="h">🟡 ${d._critHold}</span>`);
      if (!d._critBlock && !d._critHold) m.push(`<span class="ok">✓ clear</span>`);
      const minor = d._minorHold + d._minorBlock;
      if (minor) m.push(`<span class="mute">+${minor} minor</span>`);
    } else {
      if (d._blocked) m.push(`<span class="b">🔴 ${d._blocked}</span>`);
      if (d._holds) m.push(`<span class="h">🟡 ${d._holds}</span>`);
      if (!d._blocked && !d._holds) m.push(`<span class="ok">✓ clear</span>`);
    }
    if (d._sos) m.push(`<span class="s">✉ ${d._sos}</span>`);
    return m.join("");
  }

  function detailHTML(d) {
    const risk = d.risk ? `<div class="srow__risk"><b>risk</b> &nbsp;${esc(d.risk)}</div>` : "";
    const fields = d.fields.map((f) => {
      const crit = CRITICAL.has(f.f);
      return `<div class="fld${crit ? " fld--crit" : ""}">
        <div class="fld__top">
          <span class="gate gate--${gateClass(f.gate)}">${esc(f.gate)}</span>
          <span class="fld__name">${esc(f.f)}</span>
          ${crit ? '<span class="fld__crit">critical</span>' : ""}
          ${f.conf != null ? `<span class="fld__conf">conf ${f.conf.toFixed(2)}</span>` : ""}
        </div>
        <div class="fld__val">${esc(f.val)}</div>
        ${f.note ? `<div class="fld__note"><span class="nk">why</span> ${esc(f.note)}</div>` : ""}
      </div>`;
    }).join("");
    const sos = d._sos ? `<div class="sos"><div class="sos__h">✉ ${d._sos} inquiry to the election office</div>` +
      d.sos.map((q) => `<div class="sos__item">${esc(q)}</div>`).join("") + `</div>` : "";
    const c = d.comp;
    let comp = "";
    if (c) {
      const go = c.payMethod === "per-signature";
      const cls = go ? "comp--permitted" : "comp--banned";
      const sigLabel = c.perSignatureAllowed === "no" ? "prohibited"
        : c.perSignatureAllowed === "yes" ? "permitted" : esc(c.perSignatureAllowed);
      const resFlag = c.circulatorResidency === "required"
        ? ' <span class="comp__flag">⚠ in-state circulators required</span>' : "";
      comp = `<div class="comp ${cls}">
        <div class="comp__h">paying gatherers <span class="comp__status">${go ? "PER-SIGNATURE OK" : "HOURLY ONLY"}</span></div>
        <div class="comp__row"><span class="ck">stance</span> ${esc(c.operatingStance)}</div>
        <div class="comp__row"><span class="ck">per-signature</span> <b>${sigLabel}</b> for candidate petitions · paid circulators: ${esc(c.paidCirculatorsAllowed)} · residency: ${esc(c.circulatorResidency)}${resFlag}</div>
        ${c.note ? `<div class="comp__note">${esc(c.note)}</div>` : ""}
        ${c.initiativePrior ? `<div class="comp__note">initiative-law prior (reference only): per-signature ${esc(c.initiativePrior)} for ballot initiatives.</div>` : ""}
      </div>`;
    }
    return `<div class="srow__detail">${risk}${fields}${comp}${sourcesHTML(d)}${sos}</div>`;
  }

  function sourcesHTML(d) {
    const src = d.sources || [];
    if (!src.length) return "";
    const link = (s) => `<a class="src${s.official ? " src--gov" : ""}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.url)}">${s.official ? "▸&nbsp;" : ""}${esc(s.label)}<span class="src__dom">${esc(s.dom)} ↗</span></a>`;
    return `<div class="srcs"><div class="srcs__h">official sources <span class="srcs__n">${src.length}</span></div><div class="srcs__list">${src.map(link).join("")}</div></div>`;
  }

  function rowHTML(d) {
    return `<div class="srow" data-status="${d._status}">
      <div class="srow__head">
        <span class="srow__dot"></span>
        <span class="srow__name">${esc(d.state)}</span>
        <span class="srow__cell"><span class="lbl">signatures</span>${esc(d.sigs)}</span>
        <span class="srow__cell srow__cell--deadline"><span class="lbl">deadline</span>${esc(d.deadline)}</span>
        <span class="srow__meta">${metaHTML(d)}</span>
        <span class="srow__chev">▸</span>
      </div>
      ${detailHTML(d)}
    </div>`;
  }

  function render() {
    let rows = DATA.filter((d) => (filter === "all" || d._status === filter) && (!query || d.state.toLowerCase().includes(query)));
    rows.sort((a, b) =>
      sort === "name" ? a.state.localeCompare(b.state) :
      sort === "sos" ? (b._sos - a._sos) || a.state.localeCompare(b.state) :
      (a._rank - b._rank) || a.state.localeCompare(b.state));
    $("#board").innerHTML = rows.map(rowHTML).join("");
    $("#empty").hidden = rows.length > 0;
  }

  function refresh() { applyLens(); renderHeader(); render(); }

  // ---- events ----
  $("#lens").addEventListener("click", (e) => {
    const b = e.target.closest(".seg"); if (!b) return;
    lens = b.dataset.lens;
    [...$("#lens").children].forEach((x) => x.setAttribute("aria-selected", x === b));
    refresh();
  });
  $("#board").addEventListener("click", (e) => {
    const head = e.target.closest(".srow__head");
    if (head) head.parentElement.classList.toggle("open");
  });
  $("#chips").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    filter = c.dataset.f;
    [...$("#chips").children].forEach((x) => x.setAttribute("aria-selected", x === c));
    render();
  });
  $("#search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  $("#sort").addEventListener("change", (e) => { sort = e.target.value; render(); });

  refresh();
})();
