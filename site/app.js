/* ============================================================
   CampaignOS // Civic Mainframe — interaction layer
   ============================================================ */
(() => {
  "use strict";
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1. SYSTEM CLOCK — live local time
  --------------------------------------------------------- */
  const clockEl = $("#sysclock");
  if (clockEl) {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      clockEl.textContent =
        `SYS ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} // ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     2. BOOT TERMINAL
  --------------------------------------------------------- */
  const bootEl = $("#boot");
  if (bootEl) {
    const lines = [
      { p: "> booting campaign-os kernel ............. ok",
        h: '> booting campaign-os kernel ............. <span class="ok">ok</span>' },
      { p: "> provisioning tenant ........ campaign://",
        h: '> provisioning tenant ........ <span class="ok">campaign://</span>' },
      { p: "> publishing site + policy index ..... live",
        h: '> publishing site + policy index ..... <span class="ok">live</span>' },
      { p: "> volunteer signup ........... open",
        h: '> volunteer signup ........... <span class="ok">open</span>' },
      { p: "> ai copilots ................ online",
        h: '> ai copilots ................ <span class="ok">online</span>' },
      { p: "> first events scheduled ..... 3",
        h: '> first events scheduled ..... <span class="ok">3</span>' },
      { p: "> campaign live in 38s. democracy is open source.",
        h: '<span class="ready">> campaign live in 38s. democracy is open source.</span>' },
    ];
    const caret = '<span class="caret"></span>';

    if (reduce) {
      bootEl.innerHTML = lines.map((l) => l.h).join("\n") + "\n" + caret;
    } else {
      let done = "", li = 0, ci = 0;
      const render = (cur) => { bootEl.innerHTML = done + cur + caret; };
      const step = () => {
        if (li >= lines.length) { render(""); return; }
        const line = lines[li];
        if (ci <= line.p.length) {
          render(line.p.slice(0, ci) + "\n");
          ci++;
          setTimeout(step, ci === 1 ? 90 : 14 + Math.random() * 26);
        } else {
          done += line.h + "\n";
          li++; ci = 0;
          setTimeout(step, 180);
        }
      };
      setTimeout(step, 500);
    }
  }

  /* ---------------------------------------------------------
     3. REVEAL ON SCROLL
  --------------------------------------------------------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ---------------------------------------------------------
     4. COUNT-UP METRICS
  --------------------------------------------------------- */
  const fmt = (n) => n.toLocaleString("en-US");
  const countEls = $$("[data-count]");
  if (countEls.length) {
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const run = (el) => {
      const target = +el.dataset.count;
      if (reduce) { el.textContent = fmt(target); return; }
      const dur = 1700; let start;
      const frame = (ts) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / dur, 1);
        el.textContent = fmt(Math.round(target * easeOut(t)));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const mIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); mIO.unobserve(e.target); } });
    }, { threshold: 0.5 });
    countEls.forEach((el) => mIO.observe(el));
  }

  /* live-ish star count */
  const starEl = $("#starcount");
  if (starEl && !reduce) {
    let stars = 14200;
    setInterval(() => {
      stars += Math.floor(Math.random() * 3);
      starEl.textContent = (stars / 1000).toFixed(1) + "k";
    }, 5200);
  }

  /* ---------------------------------------------------------
     5. CURSOR GLOW + CARD SPOTLIGHT
  --------------------------------------------------------- */
  const glow = $(".cursor-glow");
  if (glow && window.matchMedia("(pointer:fine)").matches) {
    let gx = 0, gy = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx += (gx - cx) * 0.16; cy += (gy - cy) * 0.16;
      glow.style.transform = `translate(${cx}px, ${cy}px)`;
      raf = (Math.abs(gx - cx) > 0.5 || Math.abs(gy - cy) > 0.5) ? requestAnimationFrame(loop) : null;
    };
    window.addEventListener("mousemove", (e) => {
      gx = e.clientX; gy = e.clientY; glow.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(loop);
    });
    document.addEventListener("mouseleave", () => { glow.style.opacity = "0"; });
  }

  $$(".card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------------------------------------------------------
     6. LAUNCH SEQUENCE STATE MACHINE
     Provisioning a full campaign, step by step — the speed story.
  --------------------------------------------------------- */
  const steps    = $$("#pipe [data-step]");
  const sBox     = $("#launch-status");
  const sText    = $("#launch-status-text");
  const preview  = $("#preview");
  const golive   = $("#golive");
  const volCount = $("#vol-count");
  const rows     = $$("#preview .psite__row");

  if (steps.length && sBox) {
    const labels = [
      "selecting template · presidential…",
      "provisioning tenant · campaign://…",
      "publishing site + policy index…",
      "importing sources & voter data…",
      "opening volunteer signup…",
      "scheduling the first events…",
      "going live…",
    ];
    // step index -> which preview row appears (0-based rows)
    const rowFor = { 2: 0, 4: 1, 5: 2, 6: 3 };

    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const after = (ms, fn) => timers.push(setTimeout(fn, ms));

    const reset = () => {
      clearTimers();
      steps.forEach((s) => s.classList.remove("active", "done"));
      sBox.className = "answer__status";
      sText.textContent = "provisioning your campaign…";
      preview.classList.remove("show");
      golive.classList.remove("show");
      rows.forEach((r) => r.classList.remove("show"));
      if (volCount) volCount.textContent = "0";
    };

    const tickVolunteers = () => {
      if (!volCount) return;
      if (reduce) { volCount.textContent = "1,240"; return; }
      const target = 1240; let start;
      const frame = (ts) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 1400, 1);
        volCount.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString("en-US");
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    let cycleTimer = null;
    const run = () => {
      reset();
      const stepMs = reduce ? 1 : 640;
      preview.classList.add("show");
      steps.forEach((s, i) => {
        after(stepMs * i + 300, () => {
          steps.forEach((x, j) => x.classList.toggle("active", j === i));
          if (i > 0) steps[i - 1].classList.add("done");
          sBox.className = "answer__status";
          sText.textContent = labels[i];
          if (i in rowFor) {
            const r = rows[rowFor[i]];
            if (r) r.classList.add("show");
            if (rowFor[i] === 1) tickVolunteers();
          }
        });
      });
      const endAt = stepMs * steps.length + 400;
      after(endAt, () => {
        steps.forEach((s) => { s.classList.remove("active"); s.classList.add("done"); });
        sBox.className = "answer__status done";
        sText.textContent = "campaign live · provisioned in 38s · ready for volunteers";
        golive.classList.add("show");
      });
      cycleTimer = setTimeout(run, endAt + 7000);
    };

    let started = false;
    const kIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) { started = true; run(); }
      });
    }, { threshold: 0.3 });
    const launchSec = $("#launch");
    if (launchSec) kIO.observe(launchSec);
  }

  /* ---------------------------------------------------------
     7. COPY CLONE COMMANDS
  --------------------------------------------------------- */
  const copyBtn = $("#clone-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const cmd = [
        "git clone https://github.com/campaign-os/campaign-os",
        "pnpm install && pnpm db:push",
        "pnpm dev",
      ].join("\n");
      try { await navigator.clipboard.writeText(cmd); } catch (_) {}
      copyBtn.textContent = "copied ✓";
      copyBtn.classList.add("done");
      setTimeout(() => { copyBtn.textContent = "copy"; copyBtn.classList.remove("done"); }, 1800);
    });
  }

  /* ---------------------------------------------------------
     8. MOBILE MENU
  --------------------------------------------------------- */
  const bar = $("#menubar"), burger = $("#burger");
  if (burger && bar) {
    burger.addEventListener("click", () => {
      const open = bar.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$(".menubar__nav a").forEach((a) =>
      a.addEventListener("click", () => {
        bar.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------------------------------------------------------
     9. CIVIC NETWORK CANVAS
  --------------------------------------------------------- */
  const canvas = $("#grid-net");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, nodes = [], raf = null, running = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width  = Math.floor(innerWidth  * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      const count = Math.min(72, Math.round((innerWidth * innerHeight) / 22000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16 * dpr,
        vy: (Math.random() - 0.5) * 0.16 * dpr,
        r: (Math.random() * 1.4 + 0.6) * dpr,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const LINK = 132; // px in css units
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const link = LINK * dpr;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            const o = (1 - d / link) * 0.22;
            ctx.strokeStyle = `rgba(54,242,192,${o})`;
            ctx.lineWidth = dpr * 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        n.pulse += 0.02;
        const glow = 0.35 + Math.sin(n.pulse) * 0.25;
        ctx.fillStyle = `rgba(54,242,192,${glow})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    };

    const startStatic = () => { resize(); draw(); running = false; };
    resize();
    if (reduce) { draw(); }
    else {
      draw();
      window.addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); if (running) raf = requestAnimationFrame(draw); });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!reduce) { running = true; raf = requestAnimationFrame(draw); }
      });
    }
  }
})();
