---
name: run-gather
description: Launch and drive the Gather Expo iOS app in the booted simulator and verify it end-to-end against the prod Cloudflare Worker — reload a fresh JS bundle, tap through picker → briefing → collect with idb, and confirm the live /movement, /yield, and real nc-independent /index pulls. Use whenever asked to run/start/screenshot the Gather mobile app, drive its UI, or confirm a change works against prod (not just tests).
allowed-tools: Bash, Read, Edit
---

# Run & verify Gather (apps/mobile) against prod

Gather is a **managed Expo app** (SDK 53, RN 0.79) running in **Expo Go** (`host.exp.Exponent`) — there is no native build to compile. "Running" it means: a Metro dev server on `:8081`, a booted iOS simulator, and Expo Go pointed at the project. Driving it means **idb** tap/type (the simulator has no synthetic-input path otherwise — `osascript` keystrokes are blocked by accessibility, and `simctl` has no `tap`).

The prod backend it talks to is the Cloudflare Worker `https://gather-sync.gotaylorfamilygo.workers.dev` (set in `src/net/sync.ts` with the read-only device token). See `[[gather-sync-deployment]]`.

## Prerequisites (one-time, already done on this machine)
- **idb companion**: `brew install facebook/fb/idb-companion` → `/opt/homebrew/bin/idb_companion`.
- **idb client** in its own venv (system Python is 3.14, too new for fb-idb): `python3.13 -m venv ~/.idb-venv && ~/.idb-venv/bin/pip install fb-idb` → client at `~/.idb-venv/bin/idb`.
- The driver wrapper **`drive.sh`** (next to this file) wraps idb with that venv path and filters the benign `objc[…] Class FBProcess is implemented in both …` warning idb_companion prints to stderr — ignore it, idb works fine.

## The runbook

Let `D=apps/mobile/.claude/skills/run-gather/drive.sh`.

**1. Metro** — reuse if already up (don't start a second one; a non-interactive `expo start` will just prompt for port 8082 and skip):
```bash
curl -s --max-time 5 http://localhost:8081/status   # "packager-status:running" = reuse it
# else, start it (background, from apps/mobile):  npx expo start --ios
```

**2. Simulator** — confirm one is booted (`$D udid` prints its UDID; boot with `xcrun simctl boot "iPhone 16 Pro"` + `open -a Simulator` if none).

**3. Load a fresh bundle** — this is what picks up edits to `src/net/sync.ts` etc.:
```bash
$D reload          # terminate Expo Go + openurl exp://127.0.0.1:8081
```

**4. (Recommended) Stream the live prod Worker log** so every UI action's network call is provable, not inferred. Run in the **background** (long-lived):
```bash
cd apps/mobile/server/worker && corepack pnpm exec wrangler tail gather-sync --format json
```
Parse it with the snippet in **Verifying** below. Stop it with `pkill -f "wrangler tail"` when done.

**5. Drive the UI.** Tap by accessibility label (reads the a11y tree, computes the element center, taps in **logical points** — never eyeball screenshot pixels, which are 3× on this device):
```bash
$D labels                              # dump every on-screen label + frame to find targets
$D tap-label "Independent U.S. Senate" # picker → NC campaign card
$D tap-label "Allow While Using App"   # the briefing shows a map → grant the location prompt once
$D tap-label "Resume collecting"       # (or "Start collecting" on a fresh shift) → collect screen
$D type "Jane Q Public"                # type into a focused field
$D shot /tmp/gather.png                # screenshot → then Read the PNG and LOOK at it
```

## Verifying it talks to prod
Two independent signals — use both:

**A. The rendered screen.** A successful prod pull shows on the collect screen as:
`matching 8000 voters · Charlotte · 28202 · synced ✓`. The picker header reads `Join 1,240 circulators` (the live `/movement` value, not a hardcoded default).

**B. The Worker tail.** Parse the JSON events (wrangler pretty-prints one object across many lines, so split on brace depth, not newlines):
```bash
python3 - "$TAIL_OUTPUT_FILE" <<'PY'
import json,sys
from urllib.parse import urlparse
raw=open(sys.argv[1],encoding="utf-8",errors="replace").read()
objs=[];d=0;b=""
for ch in raw:
    if ch=="{":
        if d==0:b=""
        d+=1
    if d>0:b+=ch
    if ch=="}":
        d-=1
        if d==0 and b.strip():
            try:objs.append(json.loads(b))
            except:pass
for o in objs:
    ev=o.get("event",{}) or o; rq=ev.get("request",{}); rs=ev.get("response",{})
    if rq.get("url"):
        u=urlparse(rq["url"]); print(rq.get("method"), u.path+(("?"+u.query) if u.query else ""), "->", rs.get("status"))
PY
```
Expect, across a fresh picker → briefing → collect walk: `GET /movement → 200`, `GET /yield/nc-independent → 200`, and (only when the index is stale) `GET /index/nc-independent?since=<ver> → 200`.

## Gotchas (each cost time the first run)
- **Index pull is skipped when fresh.** The voter index persists to SQLite and `voterIndexStore` only re-pulls when stale (`STALE_MS = 1h`). So after one successful pull, navigating back to the collect screen fires `/movement` + `/yield` but **not** `/index` — that's the staleness guard working, not a failure. To force a pull, delete the app's SQLite or bump the prod index version.
- **Tap coords are logical points** (iPhone 16 Pro = 402×874 pt), but `simctl … screenshot` is 1206×2622 px (3×). `tap-label` handles this; for raw `$D tap x y`, divide pixel coords by 3.
- **Example chips assume the synthetic fixture.** The "Clean match / Fuzzy → counts / …" demo chips were authored against the 6-voter synthetic index; against the real 8000-voter Charlotte file those fake names read **"not found in voter file"** — expected, not a bug.
- **Location prompt** appears the first time the briefing's map renders — grant it (`tap-label "Allow While Using App"`) or the briefing sits behind the dialog.
- **`objc[…] FBProcess` on stderr** from idb_companion is a harmless duplicate-class warning; `drive.sh` already filters it.
- **Don't drive via temporary edits to `App.tsx`.** Before idb was set up, the only way to reach the collect screen was injecting a `setPhase("working")` effect; that's obsolete now — tap through it for real and leave source untouched.
