#!/usr/bin/env bash
# 사용법: e2e/run.sh [시나리오...]   (시나리오: fixed 5 7 10 rules hints daily share, 기본은 전부)
# BASE_URL 기본값은 http://localhost:5173. 서버가 없으면 pnpm dev를 띄웠다가 끝날 때 종료한다.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:5173}"
SHOTS="$ROOT/e2e/screenshots"
mkdir -p "$SHOTS"

SCENARIOS=("$@")
[ ${#SCENARIOS[@]} -eq 0 ] && SCENARIOS=(fixed 5 7 10 rules hints daily share)

DEV_PID=""
cleanup() {
  if [ -n "$DEV_PID" ]; then
    kill "$DEV_PID" 2>/dev/null
    wait "$DEV_PID" 2>/dev/null
  fi
}
trap cleanup EXIT

up() { curl -fs -o /dev/null "$BASE_URL/"; }

if ! up; then
  (cd "$ROOT" && exec pnpm dev >/tmp/fence-e2e-dev.log 2>&1) &
  DEV_PID=$!
  for _ in $(seq 1 60); do
    up && break
    sleep 0.5
  done
  if ! up; then
    echo "dev 서버가 뜨지 않음 (/tmp/fence-e2e-dev.log)"
    echo "E2E FAIL"
    exit 1
  fi
fi

ALL_OK=1
for sc in "${SCENARIOS[@]}"; do
  case "$sc" in
    fixed) QUERY="seed=fixed"; LABEL="fence-fixed"; SCRIPT="$ROOT/e2e/fence.e2e.js" ;;
    5|7|10) QUERY="size=$sc&seed=e2e-$sc"; LABEL="fence-$sc"; SCRIPT="$ROOT/e2e/fence.e2e.js" ;;
    rules) QUERY=""; LABEL="fence-rules"; SCRIPT="$ROOT/e2e/rules.e2e.js" ;;
    hints) QUERY=""; LABEL="fence-hints"; SCRIPT="$ROOT/e2e/hints.e2e.js" ;;
    daily) QUERY=""; LABEL="fence-daily"; SCRIPT="$ROOT/e2e/daily.e2e.js" ;;
    share) QUERY=""; LABEL="fence-share"; SCRIPT="$ROOT/e2e/share.e2e.js" ;;
    *) echo "알 수 없는 시나리오: $sc"; ALL_OK=0; continue ;;
  esac

  QUERY_ESC="${QUERY//&/\\&}"
  CODE="$(sed -e "s|__BASE_URL__|$BASE_URL|g" -e "s|__QUERY__|$QUERY_ESC|g" -e "s|__LABEL__|$LABEL|g" "$SCRIPT")"
  OUT="$(aside repl "$CODE" 2>&1)"
  echo "$OUT" | grep -v '^SHOTDATA '

  # 스크린샷은 SHOTDATA(base64) 줄에서 복원한다
  while read -r _ name data; do
    echo "$data" | base64 -D > "$SHOTS/$name.png"
  done < <(echo "$OUT" | grep '^SHOTDATA ')

  echo "$OUT" | grep -q "^E2E PASS $LABEL" || ALL_OK=0
done

if [ "$ALL_OK" -eq 1 ]; then
  echo "E2E PASS"
  exit 0
fi
echo "E2E FAIL"
exit 1
