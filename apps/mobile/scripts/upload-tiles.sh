#!/usr/bin/env bash
#
# upload-tiles.sh — push a campaign's turf TILES (RFC-002-A1 Tier 1a) to the Gather sync Worker.
# Each tile is a compound-id index artifact, uploaded via PUT /index/<campaign>/tiles/<cell>. Real
# voter PII → OPERATOR step (the agent is hard-blocked from bulk-PII uploads). Discovers tiles from
# voterfiles/out/tiles/<campaign>/ (skips manifest.json — that's metadata, uploaded via /manifest).
#
# The admin token is read from the environment — never hardcode or commit it.
#
# Usage:
#   ADMIN_TOKEN=<admin token> apps/mobile/scripts/upload-tiles.sh
#   ADMIN_TOKEN=<admin token> apps/mobile/scripts/upload-tiles.sh <campaign> <worker-url>
#
set -euo pipefail

CAMPAIGN="${1:-nc-independent}"
BASE="${2:-https://gather-sync.gotaylorfamilygo.workers.dev}"
: "${ADMIN_TOKEN:?set ADMIN_TOKEN=<admin token> (operator-only; not stored in the repo)}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../voterfiles/out/tiles/${CAMPAIGN}" 2>/dev/null && pwd || true)"
shopt -s nullglob
files=("${DIR:-/nonexistent}"/*.json)
if [ "${#files[@]}" -eq 0 ]; then
  echo "no tiles under voterfiles/out/tiles/${CAMPAIGN} — run: node --experimental-strip-types scripts/build-tiles.mts" >&2
  exit 1
fi

echo "Uploading turf tiles for '${CAMPAIGN}' → ${BASE}"
ok=0; fail=0; n=0
for f in "${files[@]}"; do
  cell="$(basename "$f" .json)"
  [ "$cell" = "manifest" ] && continue   # metadata, not a tile (uploaded via /manifest)
  n=$((n + 1))
  code=$(curl -sS -X PUT "${BASE}/index/${CAMPAIGN}/tiles/${cell}" \
    -H "authorization: Bearer ${ADMIN_TOKEN}" -H "content-type: application/json" \
    --data-binary @"$f" -o /tmp/ut-resp.json -w "%{http_code}" --max-time 120 || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✓ ${cell}  ($(du -h "$f" | cut -f1))  $(cat /tmp/ut-resp.json)"
    ok=$((ok + 1))
  else
    echo "  ✗ ${cell}  http ${code}  $(cat /tmp/ut-resp.json 2>/dev/null)"
    fail=$((fail + 1))
  fi
done
echo "done: ${ok} uploaded, ${fail} failed (of ${n} tiles)"
[ "$fail" -eq 0 ]
