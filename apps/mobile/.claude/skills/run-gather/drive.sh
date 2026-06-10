#!/usr/bin/env bash
# drive.sh — thin wrapper over idb for driving the Gather app in the booted iOS simulator.
# All idb stderr noise (the benign "objc[..] Class FBProcess is implemented in both ..." duplicate-
# class warning) is filtered. Tap coordinates are LOGICAL POINTS, not screenshot pixels
# (iPhone 16 Pro = 402x874 pt @ 3x = 1206x2622 px — divide pixel coords by the scale, or just use
# tap-label which reads the accessibility tree and computes the center for you).
#
# Usage:
#   drive.sh udid                  → print the booted simulator UDID
#   drive.sh reload                → relaunch Expo Go at the project (forces a fresh JS bundle)
#   drive.sh labels                → dump every on-screen a11y label with its frame (y x w h)
#   drive.sh tap-label "<substr>"  → tap the center of the first element whose label contains substr
#   drive.sh tap <x> <y>           → raw tap at logical points
#   drive.sh type "<text>"         → type into the focused text field
#   drive.sh shot <path>           → screenshot to <path>
set -euo pipefail

IDB="${IDB:-$HOME/.idb-venv/bin/idb}"            # fb-idb client (installed in its own py3.13 venv)
METRO_URL="${METRO_URL:-exp://127.0.0.1:8081}"   # Expo dev server deep link
EXPO_GO="host.exp.Exponent"
quiet(){ grep -ivE "objc\[|FBProcess|spurious casting|duplicates must be removed" || true; }
udid(){ xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)).*Booted.*/\1/p' | head -1; }
UDID="${UDID:-$(udid)}"

case "${1:-}" in
  udid)   echo "$UDID" ;;
  reload) xcrun simctl terminate booted "$EXPO_GO" 2>/dev/null || true; sleep 1
          xcrun simctl openurl booted "$METRO_URL" >/dev/null 2>&1; echo "reloaded $METRO_URL" ;;
  labels) "$IDB" ui describe-all --udid "$UDID" 2>/dev/null | python3 -c '
import json,sys
for e in json.load(sys.stdin):
    l=(e.get("AXLabel") or "").strip()
    if not l: continue
    f=e.get("frame",{})
    print("y=%-6.0f x=%-4.0f w=%-4.0f h=%-4.0f | %s" % (f.get("y",0),f.get("x",0),f.get("width",0),f.get("height",0),l[:80]))' ;;
  tap-label)
          sub="${2:?need a label substring}"
          read -r cx cy < <("$IDB" ui describe-all --udid "$UDID" 2>/dev/null | python3 -c '
import json,sys
sub=sys.argv[1].lower()
for e in json.load(sys.stdin):
    if sub in (e.get("AXLabel") or "").lower():
        f=e["frame"]; print(int(f["x"]+f["width"]/2), int(f["y"]+f["height"]/2)); break
' "$sub")
          [ -n "${cx:-}" ] || { echo "no element matching: $sub" >&2; exit 1; }
          echo "tap '$sub' -> ($cx,$cy)"; "$IDB" ui tap --udid "$UDID" "$cx" "$cy" 2>&1 | quiet ;;
  tap)    "$IDB" ui tap --udid "$UDID" "${2:?x}" "${3:?y}" 2>&1 | quiet ;;
  type)   "$IDB" ui text --udid "$UDID" "${2:?text}" 2>&1 | quiet ;;
  shot)   xcrun simctl io booted screenshot "${2:?path}" 2>/dev/null && echo "wrote ${2}" ;;
  *)      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
