#!/usr/bin/env bash
#
# upload-verify-shards.sh — push the ZIP-sharded verify records (RFC-002-A1 Tier 2) to the Gather
# sync Worker. These are real voter PII, so this is an OPERATOR step (the agent is hard-blocked from
# bulk-PII uploads). Uploads every shard built by `build-verify-shards.mts` for the campaign, so it
# scales from the demo set to a full statewide run unchanged.
#
# The admin token is read from the environment — never hardcode or commit it.
#
# Usage:
#   ADMIN_TOKEN=<admin token> apps/mobile/scripts/upload-verify-shards.sh
#   ADMIN_TOKEN=<admin token> apps/mobile/scripts/upload-verify-shards.sh oh-minwage https://gather-sync.example.workers.dev
#
set -euo pipefail

CAMPAIGN="${1:-nc-independent}"
BASE="${2:-https://gather-sync.gotaylorfamilygo.workers.dev}"
: "${ADMIN_TOKEN:?set ADMIN_TOKEN=<admin token> (operator-only; not stored in the repo)}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../voterfiles/out/verify/${CAMPAIGN}/zip" 2>/dev/null && pwd || true)"
shopt -s nullglob
shards=("${DIR:-/nonexistent}"/*.json)
if [ "${#shards[@]}" -eq 0 ]; then
  echo "no shards under voterfiles/out/verify/${CAMPAIGN}/zip — run: node --experimental-strip-types scripts/build-verify-shards.mts" >&2
  exit 1
fi

echo "Uploading ${#shards[@]} verify shard(s) for '${CAMPAIGN}' → ${BASE}"
ok=0; fail=0
for f in "${shards[@]}"; do
  zip="$(basename "$f" .json)"
  code=$(curl -sS -X PUT "${BASE}/verify-shard/${CAMPAIGN}/${zip}" \
    -H "authorization: Bearer ${ADMIN_TOKEN}" -H "content-type: application/json" \
    --data-binary @"$f" -o /tmp/uvs-resp.json -w "%{http_code}" --max-time 120 || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✓ ${zip}  ($(du -h "$f" | cut -f1))  $(cat /tmp/uvs-resp.json)"
    ok=$((ok + 1))
  else
    echo "  ✗ ${zip}  http ${code}  $(cat /tmp/uvs-resp.json 2>/dev/null)"
    fail=$((fail + 1))
  fi
done
echo "done: ${ok} uploaded, ${fail} failed"
[ "$fail" -eq 0 ]
