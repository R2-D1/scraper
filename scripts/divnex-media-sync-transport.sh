#!/usr/bin/env bash

set -euo pipefail

ACTION=${MEDIA_SYNC_ACTION:-}
MODE=${MEDIA_IMPORT_MODE:-remote}
PROFILE=${MEDIA_IMPORT_PROFILE:-}
REMOTE_HOST=${MEDIA_IMPORT_REMOTE:-}
REMOTE_ROOT=${MEDIA_IMPORT_REMOTE_ROOT:-}
REMOTE_PROJECT_ROOT=${MEDIA_IMPORT_REMOTE_PROJECT_ROOT:-}
REMOTE_EXEC=${MEDIA_IMPORT_REMOTE_EXEC:-}
REMOTE_COMPOSE_CMD=${MEDIA_IMPORT_REMOTE_COMPOSE_CMD:-}
REMOTE_SERVICE=${MEDIA_IMPORT_REMOTE_SERVICE:-}
SSH_OPTS=${MEDIA_IMPORT_SSH_OPTS:-}
LOCAL_WORKSPACE_ROOT=${MEDIA_IMPORT_WORKSPACE_ROOT:-${MEDIA_WORKSPACE_ROOT:-./tmp/media}}
LOCAL_CLI=(pnpm exec ts-node --transpile-only --require tsconfig-paths/register --project tools/tsconfig.json tools/scripts/media-import/sync-batch.ts)
REMOTE_CLI=(env APP_MODE=media-sync-command node main.js)

if [[ -n "$PROFILE" ]]; then
  PROFILE_KEY=$(printf '%s' "$PROFILE" | tr '[:lower:]-' '[:upper:]_')
  profile_value() {
    local suffix="$1"
    local fallback="$2"
    local key="MEDIA_IMPORT_${PROFILE_KEY}_${suffix}"
    printf '%s' "${!key:-$fallback}"
  }
  REMOTE_HOST=$(profile_value REMOTE "$REMOTE_HOST")
  REMOTE_ROOT=$(profile_value ROOT "$REMOTE_ROOT")
  REMOTE_PROJECT_ROOT=$(profile_value PROJECT_ROOT "$REMOTE_PROJECT_ROOT")
  REMOTE_EXEC=$(profile_value EXEC "$REMOTE_EXEC")
  REMOTE_COMPOSE_CMD=$(profile_value COMPOSE_CMD "$REMOTE_COMPOSE_CMD")
  REMOTE_SERVICE=$(profile_value SERVICE "$REMOTE_SERVICE")
  SSH_OPTS=$(profile_value SSH_OPTS "$SSH_OPTS")
fi

if [[ -z "$ACTION" ]]; then
  echo "[media-sync] MEDIA_SYNC_ACTION is required." >&2
  exit 1
fi

run_local_cli() {
  env \
    "MEDIA_WORKSPACE_ROOT=$LOCAL_WORKSPACE_ROOT" \
    "MEDIA_IMPORT_ALLOWED_ROOTS=$LOCAL_WORKSPACE_ROOT/imports" \
    "${LOCAL_CLI[@]}" "$@"
}

resolve_remote_runtime() {
  if [[ -z "$REMOTE_HOST" || -z "$REMOTE_ROOT" || -z "$REMOTE_PROJECT_ROOT" || -z "$REMOTE_EXEC" ]]; then
    echo "[media-sync] Remote profile is incomplete." >&2
    exit 1
  fi
  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_SERVICE" ]]; then
    running=$(ssh $SSH_OPTS "$REMOTE_HOST" "cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD ps --services --status running")
    if ! printf '%s\n' "$running" | grep -Fxq "$REMOTE_SERVICE"; then
      configured="$REMOTE_SERVICE"
      active=$(printf '%s\n' "$running" | grep -E "^${configured}-(blue|green)$" || true)
      [[ $(printf '%s\n' "$active" | sed '/^$/d' | wc -l | tr -d ' ') == "1" ]] || {
        echo "[media-sync] Active service is ambiguous." >&2
        exit 1
      }
      REMOTE_SERVICE=$(printf '%s\n' "$active" | sed -n '1p')
      REMOTE_EXEC=${REMOTE_EXEC% $configured}
      REMOTE_EXEC="$REMOTE_EXEC $REMOTE_SERVICE"
    fi
  fi
  RUNTIME_META=$(ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC sh -lc 'printf \"%s\\n%s\\n\" \"\${MEDIA_IMPORT_ALLOWED_ROOTS:-}\" \"\${MEDIA_WORKSPACE_ROOT:-}\"'")
  RUNTIME_ALLOWED=$(printf '%s\n' "$RUNTIME_META" | sed -n '1p' | tr -d '\r')
  RUNTIME_WORKSPACE=$(printf '%s\n' "$RUNTIME_META" | sed -n '2p' | tr -d '\r')
  if [[ -z "$RUNTIME_WORKSPACE" ]]; then
    echo "[media-sync] Worker MEDIA_WORKSPACE_ROOT is empty." >&2
    exit 1
  fi
  RUNTIME_IMPORTS="${RUNTIME_WORKSPACE%/}/imports"
  RUNTIME_UNPACKED="$RUNTIME_IMPORTS/unpacked"
}

run_remote_cli() {
  local command
  printf -v command '%q ' "${REMOTE_CLI[@]}" "$@"
  ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC env MEDIA_WORKSPACE_ROOT='$RUNTIME_WORKSPACE' MEDIA_IMPORT_ALLOWED_ROOTS='$RUNTIME_ALLOWED' $command"
}

poll_remote_batch() {
  local batch_id="$1"
  shift
  local timeout_seconds="${MEDIA_SYNC_POLL_TIMEOUT_SECONDS:-3600}"
  local interval_seconds="${MEDIA_SYNC_POLL_INTERVAL_SECONDS:-5}"
  local deadline=$((SECONDS + timeout_seconds))
  run_remote_cli "$@" --batch-id "$batch_id" >/dev/null 2>&1 || true
  while (( SECONDS < deadline )); do
    local output
    output=$(run_remote_cli status --batch-id "$batch_id" 2>/dev/null || true)
    if printf '%s\n' "$output" | grep -q '"status":"completed"'; then
      printf '%s\n' "$output"
      return 0
    fi
    if printf '%s\n' "$output" | grep -q '"status":"failed"'; then
      printf '%s\n' "$output" >&2
      return 1
    fi
    if printf '%s\n' "$output" | grep -q '"status":"missing"'; then
      run_remote_cli "$@" --batch-id "$batch_id" >/dev/null 2>&1 || true
    fi
    sleep "$interval_seconds"
  done
  echo "[media-sync] Timed out waiting for batch $batch_id." >&2
  return 1
}

cleanup_children() {
  local root="$1"
  [[ "$root" == */imports/unpacked && "$root" != "/imports/unpacked" ]] || {
    echo "[media-sync] Unsafe cleanup root." >&2
    exit 1
  }
  mkdir -p "$root"
  find "$root" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
}

extract_archive() {
  local archive="$1"
  local target="$2"
  mkdir -p "$target"
  case "$archive" in
    *.zip) python3 -m zipfile -e "$archive" "$target" ;;
    *.tar.gz|*.tgz) tar -xzf "$archive" -C "$target" ;;
    *.tar) tar -xf "$archive" -C "$target" ;;
    *) echo "[media-sync] Unsupported archive: $archive" >&2; return 1 ;;
  esac
}

if [[ "$MODE" == "local" ]]; then
  case "$ACTION" in
    cleanup)
      run_local_cli cleanup
      cleanup_children "$LOCAL_WORKSPACE_ROOT/imports/unpacked"
      ;;
    inventory) run_local_cli inventory ;;
    reindex) run_local_cli reindex ;;
    result) run_local_cli result --batch-id "$MEDIA_SYNC_BATCH_ID" ;;
    tombstones)
      run_local_cli tombstones --batch-id "$MEDIA_SYNC_BATCH_ID" --file "$MEDIA_SYNC_TOMBSTONES_FILE" --run-worker
      ;;
    batch)
      archive=${MEDIA_SYNC_ARCHIVE:-}
      batch_id=${MEDIA_SYNC_BATCH_ID:-}
      [[ -f "$archive" && -n "$batch_id" ]] || { echo "[media-sync] Archive and batch ID are required." >&2; exit 1; }
      actual=$(shasum -a 256 "$archive" | awk '{print $1}')
      [[ "$actual" == "${MEDIA_SYNC_CHECKSUM:-}" ]] || { echo "[media-sync] Checksum mismatch." >&2; exit 1; }
      target="$LOCAL_WORKSPACE_ROOT/imports/unpacked/$batch_id"
      mkdir -p "$LOCAL_WORKSPACE_ROOT/imports/unpacked"
      orphans=$(find "$LOCAL_WORKSPACE_ROOT/imports/unpacked" -mindepth 1 -maxdepth 1 ! -name "$batch_id" -print)
      if [[ -n "$orphans" ]]; then
        echo "[media-sync] Знайдено orphan пакети; автоматичне очищення заборонене:" >&2
        printf '%s\n' "$orphans" >&2
        exit 1
      fi
      rm -rf "$target"
      extract_archive "$archive" "$target"
      if run_local_cli batch --batch-id "$batch_id" --root "$target" --run-worker; then
        rm -rf "$target"
        rm -f "$archive"
      else
        exit 1
      fi
      ;;
    *) echo "[media-sync] Unknown action: $ACTION" >&2; exit 1 ;;
  esac
  exit 0
fi

resolve_remote_runtime

case "$ACTION" in
  cleanup)
    [[ "$REMOTE_ROOT" == /*/imports && "$REMOTE_ROOT" != "/imports" ]] || {
      echo "[media-sync] Unsafe remote cleanup root." >&2
      exit 1
    }
    [[ "$RUNTIME_UNPACKED" == /*/imports/unpacked && "$RUNTIME_UNPACKED" != "/imports/unpacked" ]] || {
      echo "[media-sync] Unsafe runtime cleanup root." >&2
      exit 1
    }
    run_remote_cli cleanup
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; mkdir -p '$REMOTE_ROOT/archives' '$REMOTE_ROOT/unpacked'; find '$REMOTE_ROOT/archives' '$REMOTE_ROOT/unpacked' -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +"
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC sh -lc 'mkdir -p \"$RUNTIME_UNPACKED\"; find \"$RUNTIME_UNPACKED\" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +'"
    ;;
  inventory) run_remote_cli inventory ;;
  reindex) run_remote_cli reindex ;;
  result) run_remote_cli result --batch-id "$MEDIA_SYNC_BATCH_ID" ;;
  tombstones)
    remote_file="$REMOTE_ROOT/tombstones-${MEDIA_SYNC_BATCH_ID}.json"
    rsync -e "ssh $SSH_OPTS" "$MEDIA_SYNC_TOMBSTONES_FILE" "$REMOTE_HOST:$remote_file"
    runtime_file="$RUNTIME_IMPORTS/tombstones-${MEDIA_SYNC_BATCH_ID}.json"
    if ! ssh $SSH_OPTS "$REMOTE_HOST" "cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC test -f '$runtime_file'" >/dev/null 2>&1; then
      echo "[media-sync] Контейнер не бачить tombstone-файл у змонтованій runtime-теці: $runtime_file" >&2
      exit 1
    fi
    if poll_remote_batch "$MEDIA_SYNC_BATCH_ID" submit-tombstones --file "$runtime_file"; then
      ssh $SSH_OPTS "$REMOTE_HOST" "rm -f '$remote_file'"
    else
      exit 1
    fi
    ;;
  batch)
    archive=${MEDIA_SYNC_ARCHIVE:-}
    batch_id=${MEDIA_SYNC_BATCH_ID:-}
    checksum=${MEDIA_SYNC_CHECKSUM:-}
    [[ -f "$archive" && -n "$batch_id" && -n "$checksum" ]] || { echo "[media-sync] Archive, batch ID and checksum are required." >&2; exit 1; }
    archive_bytes=$(wc -c < "$archive" | tr -d ' ')
    required_bytes=$(awk -v total="$archive_bytes" -v mult="${MEDIA_IMPORT_MIN_FREE_MULTIPLIER:-2.2}" -v extra="${MEDIA_IMPORT_MIN_FREE_EXTRA_BYTES:-536870912}" 'BEGIN { printf "%.0f", (total * mult) + extra }')
    free_kb=$(ssh $SSH_OPTS "$REMOTE_HOST" "df -Pk '$REMOTE_ROOT' | awk 'NR==2 {print \$4}'")
    (( free_kb * 1024 >= required_bytes )) || { echo "[media-sync] Not enough disk space for one package." >&2; exit 1; }
    remote_archive="$REMOTE_ROOT/archives/$batch_id.zip"
    remote_unpacked="$REMOTE_ROOT/unpacked/$batch_id"
    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p '$REMOTE_ROOT/archives' '$REMOTE_ROOT/unpacked'"
    if ! ssh $SSH_OPTS "$REMOTE_HOST" "cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC test -d '$RUNTIME_UNPACKED'" >/dev/null 2>&1; then
      echo "[media-sync] Контейнер не бачить змонтовану runtime-теку: $RUNTIME_UNPACKED" >&2
      exit 1
    fi
    orphans=$(ssh $SSH_OPTS "$REMOTE_HOST" "find '$REMOTE_ROOT/archives' '$REMOTE_ROOT/unpacked' -mindepth 1 -maxdepth 1 ! -name '$batch_id' ! -name '$batch_id.zip' -print")
    if [[ -n "$orphans" ]]; then
      echo "[media-sync] Знайдено orphan пакети; автоматичне очищення заборонене:" >&2
      printf '%s\n' "$orphans" >&2
      exit 1
    fi
    rsync -e "ssh $SSH_OPTS" --partial "$archive" "$REMOTE_HOST:$remote_archive"
    remote_checksum=$(ssh $SSH_OPTS "$REMOTE_HOST" "if command -v sha256sum >/dev/null 2>&1; then sha256sum '$remote_archive'; else shasum -a 256 '$remote_archive'; fi" | awk '{print $1}')
    [[ "$remote_checksum" == "$checksum" ]] || { echo "[media-sync] Remote checksum mismatch." >&2; exit 1; }
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; rm -rf '$remote_unpacked'; mkdir -p '$remote_unpacked'; python3 -m zipfile -e '$remote_archive' '$remote_unpacked'"
    runtime_batch="$RUNTIME_UNPACKED/$batch_id"
    if ! ssh $SSH_OPTS "$REMOTE_HOST" "cd '$REMOTE_PROJECT_ROOT'; $REMOTE_EXEC test -d '$runtime_batch'" >/dev/null 2>&1; then
      echo "[media-sync] Контейнер не бачить розпакований пакет у змонтованій runtime-теці: $runtime_batch" >&2
      exit 1
    fi
    if poll_remote_batch "$batch_id" submit-batch --root "$runtime_batch"; then
      ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; rm -f '$remote_archive'; rm -rf '$remote_unpacked'; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD exec -T $REMOTE_SERVICE rm -rf '$runtime_batch'"
      rm -f "$archive"
    else
      exit 1
    fi
    ;;
  *) echo "[media-sync] Unknown action: $ACTION" >&2; exit 1 ;;
esac
