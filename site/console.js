/* CampaignOS Gather — Drive Operations console. Renders window.CONSOLE_DATA
   (grounded reqs/deadlines/comp/voter-file from the verified master; progress/yield/
   throughput modeled). Vanilla, null-guarded, works on file://. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const D = window.CONSOLE_DATA;
  if (!D) return;

  const money = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);
  const n = (x) => Math.round(x).toLocaleString("en-US");
  const pct = (x) => `${Math.round(x * 100)}%`;

  // clock (real local time)
  const clock = $("#clock");
  if (clock) { const tick = () => { const d = new Date(); clock.textContent = d.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }; tick(); setInterval(tick, 30000); }

  // ── mission ──
  const m = D.mission;
  $("#m-proj").textContent = money(m.projected);
  $("#m-ceil").textContent = money(m.ceiling);
  $("#m-qual").textContent = m.qualified;
  $("#m-total").textContent = m.totalStates;
  $("#m-spent").textContent = money(m.spentToDate);
  $("#m-levers").textContent = `${D.levers.volunteer}% vol · ${D.levers.digital}% digital`;
  requestAnimationFrame(() => { $("#m-fill").style.width = pct(m.projected / m.ceiling); });

  // ── national board ──
  const board = D.board.slice().sort((a, b) => (a.qualified === b.qualified ? b.needPerDay - a.needPerDay : a.qualified ? 1 : -1));
  $("#board-sub").textContent = `${m.qualified} qualified · ${m.totalStates - m.qualified} in progress · by urgency`;
  $("#board").innerHTML = board.map((s) => {
    const fill = Math.min(100, Math.round((100 * s.collected) / s.required));
    const flags = [
      `<span class="fchip ${s.perSig === "go" ? "go" : "no"}">${s.perSig === "go" ? "$/sig" : "hourly"}</span>`,
      s.residency ? `<span class="fchip res">residency</span>` : "",
    ].join("");
    const meta = s.qualified
      ? `<b>✓ qualified</b><br>${n(s.required)} req`
      : `<b>${n(s.needPerDay)}</b>/day<br>${s.daysLeft}d left`;
    return `<div class="brow">
      <span class="babbr">${s.abbr}</span>
      <div class="bmid">
        <div class="bname"><span class="dot dot--${s.tier}"></span>${s.st} <span style="color:var(--faint);font-family:var(--mono);font-size:10px">${n(s.collected)}/${n(s.required)}</span></div>
        <div class="bbar"><i class="bar--${s.tier}" style="width:${fill}%"></i></div>
      </div>
      <span class="bmeta">${meta}</span>
      <span class="bflags">${flags}</span>
    </div>`;
  }).join("");

  // ── routing ──
  const top = D.routing.slice(0, 8);
  const maxH = Math.max(...top.map((r) => r.hours), 1);
  $("#routing").innerHTML = top.map((r) => `<div class="rrow">
    <span class="rabbr">${r.abbr}</span>
    <span class="rbar"><i style="width:${Math.round((100 * r.hours) / maxH)}%"></i></span>
    <span class="rval"><b>${r.hours}h</b> → ~${n(r.expValid)} valid</span>
  </div>`).join("");
  const rest = D.routing.length - top.length;
  $("#routing-note").innerHTML = `Shadow-price routing keeps every state on pace; the cost-concentration states (CA/TX/NC/FL) absorb most of the next pool${rest > 0 ? `, the other ${rest} ride at maintenance` : ""}. A state at goal drops to zero marginal value.`;

  // ── compensation ──
  const c = D.comp;
  $("#comp").innerHTML = `
    <div class="compgrid">
      <div class="ccell go"><b>${c.perSigGo}</b><span>per-signature OK</span></div>
      <div class="ccell no"><b>${c.hourlyOnly}</b><span>hourly only</span></div>
      <div class="ccell res"><b>${c.residency}</b><span>residency rule</span></div>
    </div>
    <div class="mixrow"><span class="vol-l">${c.volunteerShare}% volunteer</span><span class="paid-l">${c.paidShare}% paid</span></div>
    <div class="mix"><i class="vol" style="width:${c.volunteerShare}%"></i><i class="paid" style="width:${c.paidShare}%"></i></div>
    <p class="comp__note">Per-state rules verified (candidate-petition law). The validation engine pays <b>only on verified signatures</b> — never per-sig where a state prohibits it (the one bright line).</p>`;

  // ── yield (Moat B) ──
  const y = D.yield;
  const ybar = (label, rate, lo) => `<div class="ybar"><span style="flex:0 0 130px">${label}</span><span class="track"><i style="width:${pct(rate)}"></i></span><span class="v${lo ? " lo" : ""}">${pct(rate)}</span></div>`;
  $("#yield").innerHTML = `
    <div class="yblock"><div class="ylabel">by capture format</div>${y.byCapture.map((b) => ybar(b.k, b.rate, b.rate < 0.85)).join("")}</div>
    <div class="yblock"><div class="ylabel">strongest pairings</div>${y.topGatherers.map((g) => ybar(g.k, g.rate, false)).join("")}</div>
    <div class="yblock"><div class="ylabel">flagged for retraining</div>${y.bottomGatherers.map((g) => ybar(g.k, g.rate, true)).join("")}</div>
    <div class="ystate">Validity is <b>state-specific</b>: ${y.stateSpecific.gatherer} is <span class="hi">${pct(y.stateSpecific.strong.rate)} in ${y.stateSpecific.strong.st}</span> but <span class="lo">${pct(y.stateSpecific.weak.rate)} in ${y.stateSpecific.weak.st}</span> — so the optimizer keeps ${y.stateSpecific.gatherer} home. This map compounds per signature and no competitor has it.</div>`;

  // ── throughput ──
  const t = D.throughput;
  const wv = (100 * t.valid) / t.captured, wr = (100 * t.review) / t.captured, wn = (100 * t.invalid) / t.captured;
  $("#throughput").innerHTML = `
    <div class="tbig">${n(t.safeToSubmit)} <span>safe to submit · ${pct(t.rate)} valid</span></div>
    <div class="tbars"><i class="ok" style="width:${wv}%"></i><i class="rev" style="width:${wr}%"></i><i class="no" style="width:${wn}%"></i></div>
    <div class="tleg">
      <span><span class="d ok"></span><b>${n(t.valid)}</b> valid</span>
      <span><span class="d rev"></span><b>${n(t.review)}</b> review</span>
      <span><span class="d no"></span><b>${n(t.invalid)}</b> invalid</span>
      <span style="color:var(--faint)">of ${n(t.captured)} captured</span>
    </div>`;

  // ── footer ──
  $("#cfoot").innerHTML = `<b>grounded:</b> requirements · deadlines · compensation · voter-file (verified master, ${m.totalStates} jurisdictions). <b>modeled (labeled):</b> drive progress · yield · throughput. Source: ${D.generatedFrom}.`;
})();
