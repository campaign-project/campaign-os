/* CampaignOS Gather — renders the "next best move" card from the optimizer data. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const D = window.GATHER_DATA || { states: [], bestOpp: { name: "—", validPer2h: 0 }, topNeed: {} };
  const states = D.states.slice().sort((a, b) => a.st.localeCompare(b.st));
  const byName = new Map(states.map((s) => [s.st, s]));
  const PAY_PER_SIG = 2.0, HOURLY = 20;

  let mode = "volunteer";

  // phone clock
  const clock = $("#clock");
  const tick = () => { const d = new Date(); clock.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
  tick(); setInterval(tick, 30000);

  // state picker
  const sel = $("#state");
  sel.innerHTML = states.map((s) => `<option${s.st === "California" ? " selected" : ""}>${s.st}</option>`).join("");

  const TIER = {
    critical: { cls: "t-critical", word: "behind pace" },
    behind: { cls: "t-behind", word: "behind pace" },
    ontrack: { cls: "t-ontrack", word: "on track" },
    done: { cls: "t-done", word: "at goal" },
  };

  // drive status (share of states on pace)
  const onPace = states.filter((s) => s.tier === "ontrack" || s.tier === "done").length;
  $("#drivenum").textContent = `${onPace}/${states.length} on pace`;
  $("#drivefill").style.width = `${Math.round((100 * onPace) / states.length)}%`;
  $("#drivelabel").textContent = "national drive status";

  function render() {
    const s = byName.get(sel.value);
    const t = TIER[s.tier];
    const lowPriority = s.tier === "ontrack" || s.tier === "done";
    const yield2h = D.bestOpp.validPer2h;

    const move = $("#move");
    move.classList.toggle("move--low", lowPriority);
    $("#opp").textContent = D.bestOpp.name;
    $("#yield").textContent = "~" + yield2h;

    const badge = s.tier === "done"
      ? `<span class="tbadge ${t.cls}">✓ at goal</span>`
      : `<span class="tbadge ${t.cls}">${s.tier === "critical" ? "🔴" : s.tier === "behind" ? "🟡" : "🟢"} ${s.needPerDay.toLocaleString()}/day needed</span>`;
    $("#toward").innerHTML = `<span class="arrow">toward →</span> <span class="st">${s.st}</span> ${badge}`;

    // meta rows
    const rows = [];
    rows.push(`<div><span class="mk">mode</span><span class="mv"><b>paper</b> · turf packet auto-assigned, one sheet per county</span></div>`);
    if (s.residency) rows.push(`<div><span class="mk">eligible</span><span class="mv pay-no">must be an in-state ${s.st} circulator</span></div>`);
    if (mode === "paid") {
      rows.push(s.perSig
        ? `<div><span class="mk">pay</span><span class="mv pay-ok"><b>$${PAY_PER_SIG.toFixed(2)}/valid signature</b> · ~$${(PAY_PER_SIG * yield2h).toFixed(0)} this 2-hr shift</span></div>`
        : `<div><span class="mk">pay</span><span class="mv pay-no"><b>hourly only here</b> — per-signature not permitted · ~$${HOURLY * 2}/shift</span></div>`);
    } else {
      rows.push(`<div><span class="mk">why</span><span class="mv">every valid signature opens the ballot to new ideas — track your civic impact</span></div>`);
    }
    $("#meta").innerHTML = rows.join("");

    // nudge: low-priority state → redirect to the hottest
    const nudge = $("#nudge");
    if (lowPriority && D.topNeed && D.topNeed.st && D.topNeed.st !== s.st) {
      nudge.hidden = false;
      nudge.innerHTML = `${s.st} is <b>${t.word}</b> — your hours go furthest elsewhere. The drive most needs <b>${D.topNeed.st}</b> (~${D.topNeed.needPerDay.toLocaleString()} valid/day). Travel, phone-bank, or recruit there?`;
    } else nudge.hidden = true;

    // reset accept
    const a = $("#accept");
    a.classList.remove("done");
    a.innerHTML = `Accept &amp; start <span>→</span>`;
  }

  sel.addEventListener("change", render);
  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest(".gseg"); if (!b) return;
    mode = b.dataset.mode;
    [...$("#mode").children].forEach((x) => x.setAttribute("aria-selected", x === b));
    render();
  });
  $("#accept").addEventListener("click", (e) => {
    const a = e.currentTarget;
    if (a.classList.contains("done")) return;
    a.classList.add("done");
    a.innerHTML = "✓ on your way — packet sent, safety check-in on";
  });

  render();
})();

/* Live capture → validation engine (REAL verdicts, computed on-device via
   window.CampaignEngine over the synthetic voter sample). */
(() => {
  "use strict";
  const E = window.CampaignEngine, V = window.VOTER_SAMPLE;
  if (!E || !V) return;
  const $ = (s) => document.querySelector(s);
  const index = E.buildIndex(V);
  const ctx = { mode: "voter-file-match", jurisdiction: "Springfield" };
  const signed = new Set(); // voter ids counted this shift → cross-capture duplicate detection
  let valid = 0, review = 0, invalid = 0;

  const ICON = { VALID: "✓", NEEDS_REVIEW: "⚠", INVALID: "✗" };
  const CLS = { VALID: "v-ok", NEEDS_REVIEW: "v-rev", INVALID: "v-no" };
  const WORD = { VALID: "VALID", NEEDS_REVIEW: "NEEDS REVIEW", INVALID: "INVALID" };

  const chips = $("#cap-chips");
  (window.VOTER_SAMPLE_CHIPS || []).forEach((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "capchip"; b.textContent = c.label;
    b.addEventListener("click", () => { $("#cap-name").value = c.name; $("#cap-addr").value = c.addr; run(); });
    chips.appendChild(b);
  });

  function tallies() {
    $("#t-valid").textContent = valid; $("#t-review").textContent = review; $("#t-invalid").textContent = invalid;
    $("#t-safe").textContent = valid;
    const total = valid + review + invalid;
    $("#caprate").textContent = total ? `${Math.round((100 * valid) / total)}% valid · ${total} captured` : "";
  }

  function run() {
    const name = $("#cap-name").value.trim(), address = $("#cap-addr").value.trim();
    if (!name || !address) return;
    const signer = { id: "live", name, address, signedOn: new Date().toISOString().slice(0, 10) };
    let res = E.validate(signer, index, ctx);
    // session duplicate check (engine dedups within a batch; here it's across the shift)
    if (res.verdict === "VALID" && res.matchedVoterId) {
      if (signed.has(res.matchedVoterId)) res = { verdict: "INVALID", band: res.band, score: res.score, voter: res.voter, reasons: [`duplicate — voter ${res.matchedVoterId} already signed this shift; only the first counts`] };
      else signed.add(res.matchedVoterId);
    }
    if (res.verdict === "VALID") valid++; else if (res.verdict === "NEEDS_REVIEW") review++; else invalid++;

    const v = res.voter;
    const sub = v ? `${v.name} · ${v.id} · ${v.status}${res.score ? ` · score ${res.score.toFixed(2)}` : ""}` : (res.band === "NO_MATCH" ? "no voter-file match" : "");
    const vb = $("#cap-verdict");
    vb.hidden = false;
    vb.className = `cap__verdict ${CLS[res.verdict]}`;
    vb.innerHTML = `<div class="vrow"><span class="vbadge">${ICON[res.verdict]} ${WORD[res.verdict]}</span>${sub ? `<span class="vsub">${sub}</span>` : ""}</div><p class="vwhy">${res.reasons[0]}</p>`;
    vb.classList.remove("flash"); void vb.offsetWidth; vb.classList.add("flash");
    tallies();
  }

  $("#capform").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  tallies();
})();
