#!/usr/bin/env bash
# Regression check for the watchlist API contract.
# Exercises the full add → list → update → remove cycle.
#
# Usage:
#   BASE_URL=https://idea-watchlist.vercel.app TOKEN=xxx ./scripts/test-api.sh
#
# Exits non-zero on the first failure.

set -euo pipefail

: "${BASE_URL:?set BASE_URL, e.g. https://idea-watchlist.vercel.app or http://localhost:3000}"
: "${TOKEN:?set TOKEN to the WATCHLIST_TOKEN value}"

TICKER="ZZTEST"
EXCHANGE="NASDAQ"

echo "→ GET /api/list (auth check)"
curl -fsS "$BASE_URL/api/list?token=$TOKEN" >/dev/null
echo "  ok"

echo "→ POST /api/add"
curl -fsS -X POST "$BASE_URL/api/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ticker\": \"$TICKER\",
    \"exchange\": \"$EXCHANGE\",
    \"currency\": \"USD\",
    \"analysis_date\": \"$(date -u +%Y-%m-%d)\",
    \"anchor_price\": 100.0,
    \"bull_target\": 150.0,
    \"base_target\": 120.0,
    \"bear_target\": 80.0,
    \"thesis_oneliner\": \"regression test entry\",
    \"catalysts\": [\"smoke test\"]
  }" >/dev/null
echo "  ok"

echo "→ POST /api/add (duplicate, expect 409-equivalent)"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ticker\": \"$TICKER\",
    \"exchange\": \"$EXCHANGE\",
    \"currency\": \"USD\",
    \"analysis_date\": \"$(date -u +%Y-%m-%d)\",
    \"anchor_price\": 100.0,
    \"bull_target\": 150.0,
    \"base_target\": 120.0,
    \"bear_target\": 80.0,
    \"thesis_oneliner\": \"dup\",
    \"catalysts\": [\"x\"]
  }")
if [ "$status" -lt 400 ]; then
  echo "  FAIL: duplicate add returned $status, expected 4xx"
  exit 1
fi
echo "  ok ($status)"

echo "→ POST /api/update (raise base_target)"
curl -fsS -X POST "$BASE_URL/api/update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ticker\":\"$TICKER\",\"exchange\":\"$EXCHANGE\",\"patch\":{\"base_target\":125.0}}" >/dev/null
echo "  ok"

echo "→ GET /api/list (verify present)"
list=$(curl -fsS "$BASE_URL/api/list?token=$TOKEN")
if ! echo "$list" | grep -q "\"$TICKER\""; then
  echo "  FAIL: $TICKER not in /api/list response"
  exit 1
fi
echo "  ok"

echo "→ POST /api/remove"
curl -fsS -X POST "$BASE_URL/api/remove" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ticker\":\"$TICKER\",\"exchange\":\"$EXCHANGE\"}" >/dev/null
echo "  ok"

echo "→ POST /api/remove (already gone, expect 404)"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/remove" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ticker\":\"$TICKER\",\"exchange\":\"$EXCHANGE\"}")
if [ "$status" -ne 404 ]; then
  echo "  FAIL: remove of missing entry returned $status, expected 404"
  exit 1
fi
echo "  ok ($status)"

echo
echo "All checks passed."
