#!/usr/bin/env bash

set -euo pipefail

LOCAL_IMPORT_DIR=${MEDIA_IMPORT_LOCAL_ARCHIVE_DIR:-tmp/imports}
MEDIA_IMPORT_MODE=${MEDIA_IMPORT_MODE:-remote}
MEDIA_IMPORT_PROFILE=${MEDIA_IMPORT_PROFILE:-}

REMOTE_HOST=${MEDIA_IMPORT_REMOTE:-}
REMOTE_ROOT=${MEDIA_IMPORT_REMOTE_ROOT:-}
REMOTE_WORKSPACE_ROOT=""
REMOTE_PROJECT_ROOT=${MEDIA_IMPORT_REMOTE_PROJECT_ROOT:-}
SSH_OPTS=${MEDIA_IMPORT_SSH_OPTS:-}
REMOTE_EXEC=${MEDIA_IMPORT_REMOTE_EXEC:-}
REMOTE_ENV_FILE=${MEDIA_IMPORT_REMOTE_ENV_FILE:-}
REMOTE_REDIS_URL=${MEDIA_IMPORT_REMOTE_REDIS_URL:-}
REMOTE_COMPOSE_CMD=${MEDIA_IMPORT_REMOTE_COMPOSE_CMD:-}
REMOTE_COMPOSE_SERVICE=${MEDIA_IMPORT_REMOTE_SERVICE:-}
REMOTE_CONTAINER_ROOT=${MEDIA_IMPORT_REMOTE_CONTAINER_ROOT:-}
REMOTE_SYNC_PATHS=${MEDIA_IMPORT_REMOTE_SYNC_PATHS:-}

LOCAL_WORKSPACE_ROOT=${MEDIA_IMPORT_WORKSPACE_ROOT:-${MEDIA_WORKSPACE_ROOT:-./tmp/media}}
LOCAL_WORKSPACE_ROOT=${LOCAL_WORKSPACE_ROOT%/}
LOCAL_IMPORT_ROOT=${MEDIA_IMPORT_LOCAL_ROOT:-$LOCAL_WORKSPACE_ROOT/imports}
LOCAL_IMPORT_ROOT=${LOCAL_IMPORT_ROOT%/}
LOCAL_UNPACKED=${MEDIA_IMPORT_LOCAL_UNPACKED:-$LOCAL_IMPORT_ROOT/unpacked}
LOCAL_UNPACKED=${LOCAL_UNPACKED%/}

if [[ -n "$MEDIA_IMPORT_PROFILE" ]]; then
  PROFILE_KEY=$(echo "$MEDIA_IMPORT_PROFILE" | tr '[:lower:]-' '[:upper:]_')
  resolve_profile_var() {
    local suffix="$1"
    local fallback="$2"
    local var_name="MEDIA_IMPORT_${PROFILE_KEY}_${suffix}"
    local value="${!var_name:-}"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
    else
      printf '%s' "$fallback"
    fi
  }
  REMOTE_HOST=$(resolve_profile_var "REMOTE" "$REMOTE_HOST")
  REMOTE_ROOT=$(resolve_profile_var "ROOT" "$REMOTE_ROOT")
  REMOTE_PROJECT_ROOT=$(resolve_profile_var "PROJECT_ROOT" "$REMOTE_PROJECT_ROOT")
  SSH_OPTS=$(resolve_profile_var "SSH_OPTS" "$SSH_OPTS")
  REMOTE_ENV_FILE=$(resolve_profile_var "ENV_FILE" "$REMOTE_ENV_FILE")
  REMOTE_EXEC=$(resolve_profile_var "EXEC" "$REMOTE_EXEC")
  REMOTE_REDIS_URL=$(resolve_profile_var "REDIS_URL" "$REMOTE_REDIS_URL")
  REMOTE_COMPOSE_CMD=$(resolve_profile_var "COMPOSE_CMD" "$REMOTE_COMPOSE_CMD")
  REMOTE_COMPOSE_SERVICE=$(resolve_profile_var "SERVICE" "$REMOTE_COMPOSE_SERVICE")
  REMOTE_CONTAINER_ROOT=$(resolve_profile_var "CONTAINER_ROOT" "$REMOTE_CONTAINER_ROOT")
  REMOTE_SYNC_PATHS=$(resolve_profile_var "SYNC_PATHS" "$REMOTE_SYNC_PATHS")
fi

if [[ "$MEDIA_IMPORT_MODE" == "remote" ]]; then
  if [[ -z "$REMOTE_HOST" ]]; then
    echo "[media-import] Потрібно визначити MEDIA_IMPORT_REMOTE (user@host)" >&2
    exit 1
  fi
  if [[ -z "$REMOTE_ROOT" ]]; then
    echo "[media-import] Потрібно визначити MEDIA_IMPORT_REMOTE_ROOT" >&2
    exit 1
  fi
  if [[ -z "$REMOTE_PROJECT_ROOT" ]]; then
    echo "[media-import] Потрібно визначити MEDIA_IMPORT_REMOTE_PROJECT_ROOT" >&2
    exit 1
  fi
  REMOTE_WORKSPACE_ROOT=$(dirname "$REMOTE_ROOT")

  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" ]]; then
    CONFIGURED_COMPOSE_SERVICE="$REMOTE_COMPOSE_SERVICE"
    RUNNING_COMPOSE_SERVICES=$(ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD ps --services --status running")
    if ! printf '%s\n' "$RUNNING_COMPOSE_SERVICES" | grep -Fxq "$REMOTE_COMPOSE_SERVICE"; then
      ACTIVE_COLOR_SERVICES=$(printf '%s\n' "$RUNNING_COMPOSE_SERVICES" | grep -E "^${REMOTE_COMPOSE_SERVICE}-(blue|green)$" || true)
      ACTIVE_COLOR_COUNT=$(printf '%s\n' "$ACTIVE_COLOR_SERVICES" | sed '/^$/d' | wc -l | tr -d ' ')
      if [[ "$ACTIVE_COLOR_COUNT" != "1" ]]; then
        echo "[media-import] Не вдалося однозначно визначити активний Compose-сервіс для $REMOTE_COMPOSE_SERVICE." >&2
        exit 1
      fi
      REMOTE_COMPOSE_SERVICE=$(printf '%s\n' "$ACTIVE_COLOR_SERVICES" | sed -n '1p')
      if [[ "$REMOTE_EXEC" == *" $CONFIGURED_COMPOSE_SERVICE" ]]; then
        REMOTE_EXEC="${REMOTE_EXEC% $CONFIGURED_COMPOSE_SERVICE} $REMOTE_COMPOSE_SERVICE"
      fi
      echo "[media-import] Активний Compose-сервіс: $REMOTE_COMPOSE_SERVICE."
    fi
  fi

  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" && -n "$REMOTE_CONTAINER_ROOT" && -n "${REMOTE_SYNC_PATHS:-}" && "${MEDIA_IMPORT_SKIP_API_SYNC:-0}" != "1" ]]; then
    ensure_sync_entry() {
      local entry="$1"
      if [[ " $REMOTE_SYNC_PATHS " != *" $entry "* ]]; then
        REMOTE_SYNC_PATHS="$REMOTE_SYNC_PATHS $entry"
      fi
    }

    # ts-node CLI needs API sources + schema + generated artifacts inside the container.
    ensure_sync_entry "apps/api/src:/usr/src/api/apps/api/src"
    ensure_sync_entry "apps/api/prisma:/usr/src/api/apps/api/prisma"
    ensure_sync_entry "libs:/usr/src/api/libs"
    ensure_sync_entry "tools/generated:/usr/src/api/tools/generated"
  fi
fi

build_cli_command() {
  local workspace_root="$1"
  local allowed_root="$2"
  local scan_root="$3"
  local dotenv_file="${4:-}"
  local redis_url="${5:-}"

  CLI_REQUIRE_FLAGS=()
  CLI_ENV_PREFIX=()
  if [[ -n "$dotenv_file" ]]; then
    CLI_ENV_PREFIX=(env "DOTENV_CONFIG_PATH=$dotenv_file")
    CLI_REQUIRE_FLAGS+=(--require dotenv/config)
  fi
  CLI_REQUIRE_FLAGS+=(--require tsconfig-paths/register)
  CLI_CMD=()
  if [[ ${#CLI_ENV_PREFIX[@]:-0} -gt 0 ]]; then
    CLI_CMD+=("${CLI_ENV_PREFIX[@]}")
  fi
  CLI_CMD+=(
    pnpm
    exec
    ts-node
    --transpile-only
    "${CLI_REQUIRE_FLAGS[@]}"
    --project
    tools/tsconfig.json
    tools/scripts/media-import/scan-folders.ts
    --root
    "$scan_root"
  )
  if [[ "$OVERWRITE_FLAG" -eq 1 ]]; then
    CLI_CMD+=(--overwrite-files)
  fi
  if [[ "$RESET_FLAG" -eq 1 ]]; then
    CLI_CMD+=(--reset-queue)
  fi

  if [[ -n "$redis_url" ]]; then
    CLI_CMD=(env "REDIS_URL=$redis_url" "${CLI_CMD[@]}")
  fi

  CLI_CMD=(
    env
    "MEDIA_WORKSPACE_ROOT=$workspace_root"
    "MEDIA_IMPORT_ALLOWED_ROOTS=$allowed_root"
    "${CLI_CMD[@]}"
  )
}

build_remote_enqueue_command() {
  local workspace_root="$1"
  local allowed_root="$2"
  local scan_root="$3"
  local redis_url="${4:-}"

  local node_script
  node_script=$(
    cat <<'NODE'
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Queue } = require('bullmq');

const parseRedisUrl = (url) => {
  const parsed = new URL(url);
  const dbPath = (parsed.pathname || '').replace(/^\//, '');
  const db = dbPath.length ? Number(dbPath) : undefined;
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    db: Number.isFinite(db) ? db : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
};

const sanitizeFolderName = (value) => {
  const fallback = 'import';
  if (!value) return fallback;
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return normalized.length ? normalized : fallback;
};

const isWithinRoots = (targetPath, roots) => {
  if (!roots.length) return true;
  const resolved = path.resolve(targetPath);
  return roots.some(root => {
    const candidate = path.resolve(root);
    return resolved === candidate || resolved.startsWith(candidate + path.sep);
  });
};

const moveDirectory = async (source, target) => {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rm(target, { recursive: true, force: true }).catch(() => undefined);
  try {
    await fs.rename(source, target);
    return;
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error;
  }
  await fs.rm(target, { recursive: true, force: true }).catch(() => undefined);
  await fs.mkdir(target, { recursive: true });
  await fs.cp(source, target, { recursive: true });
  await fs.rm(source, { recursive: true, force: true });
};

const readFolderOptions = async (folderPath, fallback) => {
  const optionsPath = path.join(folderPath, '.media-import.json');
  let raw;
  try {
    raw = await fs.readFile(optionsPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { overwriteFiles: fallback, reindexOnComplete: true };
    }
    throw error;
  }
  const parsed = JSON.parse(raw);
  if (typeof parsed?.overwriteFiles !== 'boolean') {
    throw new Error('.media-import.json must contain boolean overwriteFiles.');
  }
  if (typeof parsed?.reindexOnComplete !== 'boolean') {
    throw new Error('.media-import.json must contain boolean reindexOnComplete.');
  }
  return {
    overwriteFiles: parsed.overwriteFiles,
    reindexOnComplete: parsed.reindexOnComplete,
  };
};

const main = async () => {
  const scanRootRaw = (process.env.MEDIA_IMPORT_SCAN_ROOT || '').trim();
  if (!scanRootRaw) {
    console.error('[media-import] MEDIA_IMPORT_SCAN_ROOT is required.');
    process.exit(1);
    return;
  }

  const workspaceRoot = (process.env.MEDIA_WORKSPACE_ROOT || '').trim();
  if (!workspaceRoot) {
    console.error('[media-import] MEDIA_WORKSPACE_ROOT is required.');
    process.exit(1);
    return;
  }

  const allowedRoots = (process.env.MEDIA_IMPORT_ALLOWED_ROOTS || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  const scanRoot = path.resolve(scanRootRaw);
  if (!isWithinRoots(scanRoot, allowedRoots)) {
    console.error(`[media-import] Директорія ${scanRoot} не входить до дозволених шляхів для імпорту.`);
    process.exit(1);
    return;
  }

  const stats = await fs.stat(scanRoot).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    console.error('[media-import] Вказаний шлях не є каталогом.');
    process.exit(1);
    return;
  }

  const redisUrl = (process.env.REDIS_URL || 'redis://redis:6379').trim();
  const prefix = (process.env.QUEUE_PREFIX || 'divnex').trim() || 'divnex';
  const connection = parseRedisUrl(redisUrl);
  const queue = new Queue('media-icon-import', {
    connection,
    prefix,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  const overwriteFiles = (process.env.MEDIA_IMPORT_OVERWRITE_FILES || '0') === '1';
  const ownerId = (process.env.MEDIA_IMPORT_OWNER_ID || 'media-import-cli').trim() || 'media-import-cli';
  const roles = (process.env.MEDIA_IMPORT_OWNER_ROLES || 'Super')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  const activeStatuses = ['active', 'waiting', 'waiting-children', 'delayed', 'paused', 'prioritized'];

  try {
    const stagingRoot = path.join(scanRoot, 'server-queue');
    await fs.mkdir(stagingRoot, { recursive: true });

    const entries = await fs.readdir(scanRoot, { withFileTypes: true });
    const forbidden = new Set(['server-queue', 'processed', 'archives']);
    const folders = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !forbidden.has(entry.name))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b, 'en'));

    if (!folders.length) {
      console.info('[media-import] Нових директорій для імпорту не знайдено.');
      return;
    }

    const counts = await queue.getJobCounts(...activeStatuses);
    const pending = activeStatuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
    if (pending > 0) {
      console.error('[media-import] Імпорт уже виконується. Новий запуск можливий після завершення поточного.');
      process.exit(1);
      return;
    }

    console.info('[media-import] Очищаю попередні дані імпорту…');
    await queue.obliterate({ force: true }).catch(() => undefined);
    const importRoot = path.join(workspaceRoot, 'imports');
    const cleanupTargets = [
      path.join(importRoot, 'icons'),
      path.join(importRoot, 'server-queue'),
      path.join(importRoot, 'processed'),
      path.join(importRoot, 'archives'),
    ];
    for (const target of cleanupTargets) {
      await fs.rm(target, { recursive: true, force: true });
      await fs.mkdir(target, { recursive: true });
    }

    let failures = 0;
    for (const folder of folders) {
      const sourcePath = path.join(scanRoot, folder);
      const targetName = `${sanitizeFolderName(folder)}-${randomUUID()}`;
      const targetPath = path.join(stagingRoot, targetName);
      try {
        const folderOptions = await readFolderOptions(sourcePath, overwriteFiles);
        await moveDirectory(sourcePath, targetPath);
        await queue.add('media.icon-import.prepare', {
          type: 'media.icon-import.prepare',
          ownerId,
          roles,
          archivePath: targetPath,
          archiveRelativePath: null,
          archiveName: folder,
          archiveMimeType: null,
          overwriteFiles: folderOptions.overwriteFiles,
          reindexOnComplete: folderOptions.reindexOnComplete,
          sourceType: 'directory',
        });

        console.info(`[media-import] Каталог ${folder} переміщено у ${targetName} та поставлено в чергу.`);
      } catch (error) {
        failures += 1;
        console.error(
          `[media-import] Не вдалося поставити в чергу директорію ${folder}:`,
          error?.message ?? String(error)
        );
      }
    }

    if (failures > 0) {
      console.error(`[media-import] Готово з помилками. Зірвано задач: ${failures}.`);
      process.exit(1);
      return;
    }
    console.info('[media-import] Усі директорії передано воркеру.');
  } finally {
    await queue.close().catch(() => undefined);
  }
};

main().catch(error => {
  console.error('[media-import] Невдала спроба сканування директорій:', error?.message ?? error);
  process.exit(1);
});
NODE
  )

  CLI_CMD=(
    node
    -e
    "$node_script"
  )

  CLI_CMD=(
    env
    "MEDIA_WORKSPACE_ROOT=$workspace_root"
    "MEDIA_IMPORT_ALLOWED_ROOTS=$allowed_root"
    "MEDIA_IMPORT_SCAN_ROOT=$scan_root"
    "MEDIA_IMPORT_OVERWRITE_FILES=$OVERWRITE_FLAG"
    "MEDIA_IMPORT_RESET_QUEUE=$RESET_FLAG"
    "${CLI_CMD[@]}"
  )

  if [[ -n "$redis_url" ]]; then
    CLI_CMD=(env "REDIS_URL=$redis_url" "${CLI_CMD[@]}")
  fi
}

extract_zip() {
  local zip_file="$1"
  local target_dir="$2"

  if command -v unzip >/dev/null 2>&1; then
    unzip -qq "$zip_file" -d "$target_dir"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$zip_file" "$target_dir" <<'PY'
import os
import sys
import zipfile

zip_path = sys.argv[1]
target = sys.argv[2]
os.makedirs(target, exist_ok=True)
with zipfile.ZipFile(zip_path) as zf:
    zf.extractall(target)
PY
    return 0
  fi

  echo "[media-import] Не вдалося розпакувати ZIP: немає ні unzip, ні python3." >&2
  return 1
}

OVERWRITE_FLAG=0
RESET_FLAG=0

for arg in "$@"; do
  case "$arg" in
    --overwrite|--overwrite-files)
      OVERWRITE_FLAG=1
      ;;
    --reset-queue)
      RESET_FLAG=1
      ;;
  esac
done

if [[ ! -d "$LOCAL_IMPORT_DIR" ]]; then
  echo "[media-import] Каталог $LOCAL_IMPORT_DIR відсутній." >&2
  exit 1
fi

ARCHIVES=()
while IFS= read -r archive; do
  ARCHIVES+=("$archive")
done < <(find "$LOCAL_IMPORT_DIR" -maxdepth 1 -type f \
  \( -iname '*.zip' -o -iname '*.tar' -o -iname '*.tar.gz' -o -iname '*.tgz' \) | sort)

if [[ ${#ARCHIVES[@]} -eq 0 ]]; then
  echo "[media-import] Архіви для імпорту не знайдені у $LOCAL_IMPORT_DIR."
  exit 0
fi

if [[ "$MEDIA_IMPORT_MODE" == "local" ]]; then
  echo "[media-import] Очищаю старі локальні дані імпорту..."
  rm -rf "$LOCAL_IMPORT_ROOT/archives" "$LOCAL_UNPACKED"
  echo "[media-import] Розпаковую архіви локально..."
  mkdir -p "$LOCAL_UNPACKED"
  for file in "${ARCHIVES[@]}"; do
    name=$(basename "$file")
    base=${name%.*}
    target="$LOCAL_UNPACKED/$base"
    rm -rf "$target"
    mkdir -p "$target"
    case "$name" in
      *.tar.gz|*.tgz)
        tar -xzf "$file" -C "$target"
        ;;
      *.tar)
        tar -xf "$file" -C "$target"
        ;;
      *.zip)
        extract_zip "$file" "$target"
        ;;
      *)
        echo "[media-import] Пропуск архіву $name: невідомий формат" >&2
        rm -rf "$target"
        continue
        ;;
    esac
  done

  echo "[media-import] Запускаю CLI локально..."
  build_cli_command "$LOCAL_WORKSPACE_ROOT" "$LOCAL_UNPACKED" "$LOCAL_UNPACKED" "" ""
  set +e
  CLI_OUTPUT=$("${CLI_CMD[@]}" 2>&1)
  CLI_EXIT=$?
  set -e
  printf '%s\n' "$CLI_OUTPUT"
  if [[ "$CLI_EXIT" -ne 0 && "$CLI_OUTPUT" != *"[media-import] Усі директорії передано воркеру."* ]]; then
    exit "$CLI_EXIT"
  fi

  if [[ "${MEDIA_IMPORT_LOCAL_RUN_WORKER:-1}" == "1" ]]; then
    echo "[media-import] Запускаю локальний воркер для обробки черги..."
    if ! pnpm exec ts-node --transpile-only --require tsconfig-paths/register --project tools/tsconfig.json \
      tools/scripts/media-import/run-local-worker-once.ts; then
      echo "[media-import] Локальний воркер завершився з помилкою. Перевірте логи." >&2
    fi
  fi
elif [[ "$MEDIA_IMPORT_MODE" == "remote" ]]; then
  # Якщо задано MEDIA_IMPORT_SSH_OPTS з неправильним ключем, ssh/rsync можуть впасти у парольний фолбек.
  # Щоб "просто працювало" (якщо у користувача вже налаштований доступ через ssh-agent або ~/.ssh/config),
  # пробуємо автоматично прибрати `-i <key>` і/або скинути SSH опції.
  ssh_supports_connection() {
    local host="$1"
    shift
    ssh -o BatchMode=yes "$@" "$host" 'true' >/dev/null 2>&1
  }
  strip_identity_opt() {
    local out=()
    local skip_next=0
    for token in $SSH_OPTS; do
      if [[ "$skip_next" -eq 1 ]]; then
        skip_next=0
        continue
      fi
      if [[ "$token" == "-i" ]]; then
        skip_next=1
        continue
      fi
      out+=("$token")
    done
    printf '%s' "${out[*]:-}"
  }

  if [[ -n "$SSH_OPTS" ]]; then
    if ! ssh_supports_connection "$REMOTE_HOST" $SSH_OPTS; then
      if [[ "$SSH_OPTS" == *"-i "* ]]; then
        STRIPPED_SSH_OPTS="$(strip_identity_opt)"
        if [[ -n "$STRIPPED_SSH_OPTS" ]] && ssh_supports_connection "$REMOTE_HOST" $STRIPPED_SSH_OPTS; then
          echo "[media-import] SSH_OPTS містить -i ключ, який не підходить для $REMOTE_HOST. Використовую SSH_OPTS без -i." >&2
          SSH_OPTS="$STRIPPED_SSH_OPTS"
        fi
      fi
    fi

    if ! ssh_supports_connection "$REMOTE_HOST" $SSH_OPTS; then
      if ssh_supports_connection "$REMOTE_HOST"; then
        echo "[media-import] SSH_OPTS не працюють для $REMOTE_HOST. Використовую дефолтний SSH конфіг/agent без додаткових опцій." >&2
        SSH_OPTS=""
      fi
    fi
  fi

  LOCAL_ARCHIVE_BYTES=0
  for archive in "${ARCHIVES[@]}"; do
    file_bytes=$(wc -c < "$archive")
    file_bytes=${file_bytes//[[:space:]]/}
    LOCAL_ARCHIVE_BYTES=$((LOCAL_ARCHIVE_BYTES + file_bytes))
  done

  MIN_FREE_MULTIPLIER=${MEDIA_IMPORT_MIN_FREE_MULTIPLIER:-2.2}
  MIN_FREE_EXTRA_BYTES=${MEDIA_IMPORT_MIN_FREE_EXTRA_BYTES:-2147483648}
  REQUIRED_FREE_BYTES=$(awk -v total="$LOCAL_ARCHIVE_BYTES" -v mult="$MIN_FREE_MULTIPLIER" -v extra="$MIN_FREE_EXTRA_BYTES" 'BEGIN { printf "%.0f", (total * mult) + extra }')

  REMOTE_ARCHIVES="$REMOTE_ROOT/archives"
  REMOTE_UNPACKED="$REMOTE_ROOT/unpacked"
  REMOTE_FREE_TARGET="$REMOTE_ROOT"
  if [[ "$REMOTE_FREE_TARGET" == */* ]]; then
    REMOTE_FREE_TARGET="${REMOTE_FREE_TARGET%/*}"
  fi
  if [[ -z "$REMOTE_FREE_TARGET" ]]; then
    REMOTE_FREE_TARGET="$REMOTE_ROOT"
  fi

  REMOTE_FREE_KB=$(ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; df -Pk '$REMOTE_FREE_TARGET' | awk 'NR==2 {print \$4}'")
  if [[ -z "$REMOTE_FREE_KB" ]]; then
    echo "[media-import] Не вдалося визначити вільний диск на сервері." >&2
    exit 1
  fi
  REMOTE_FREE_BYTES=$((REMOTE_FREE_KB * 1024))
  if (( REMOTE_FREE_BYTES < REQUIRED_FREE_BYTES )); then
    required_gb=$(awk -v b="$REQUIRED_FREE_BYTES" 'BEGIN { printf "%.2f", b / 1073741824 }')
    free_gb=$(awk -v b="$REMOTE_FREE_BYTES" 'BEGIN { printf "%.2f", b / 1073741824 }')
    archives_gb=$(awk -v b="$LOCAL_ARCHIVE_BYTES" 'BEGIN { printf "%.2f", b / 1073741824 }')
    echo "[media-import] Недостатньо вільного місця на сервері для імпорту." >&2
    echo "[media-import] Розмір локальних архівів: ${archives_gb} GiB; вільно: ${free_gb} GiB; потрібно мінімум: ${required_gb} GiB." >&2
    exit 1
  fi

  CONTAINER_SCAN_ROOT=""
  HAS_UNPACKED_SYNC=0
  if [[ -n "$REMOTE_CONTAINER_ROOT" && -n "$REMOTE_SYNC_PATHS" ]]; then
    for sync_entry in $REMOTE_SYNC_PATHS; do
      src_path="$sync_entry"
      dest_path="$sync_entry"
      if [[ "$sync_entry" == *:* ]]; then
        src_path="${sync_entry%%:*}"
        dest_path="${sync_entry#*:}"
      fi

      if [[ "$dest_path" == /* ]]; then
        dest_abs="${dest_path%/}"
      else
        dest_abs="$REMOTE_CONTAINER_ROOT/${dest_path%/}"
      fi

      src_trimmed="${src_path%/}"
      src_base="${src_trimmed##*/}"
      if [[ "$src_trimmed" == "${REMOTE_UNPACKED%/}" || "$src_base" == "unpacked" || "$dest_abs" == */unpacked || "$dest_abs" == "unpacked" || "$dest_abs" == */unpacked/ ]]; then
        HAS_UNPACKED_SYNC=1
        CONTAINER_SCAN_ROOT="${dest_abs%/}"
        break
      fi
    done
  fi

  SOURCE_SCAN_ROOT="$REMOTE_UNPACKED"
  if [[ "$HAS_UNPACKED_SYNC" -eq 1 && -n "$CONTAINER_SCAN_ROOT" ]]; then
    SOURCE_SCAN_ROOT="$CONTAINER_SCAN_ROOT"
  fi

  RUNTIME_SCAN_ROOT=""
  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" ]]; then
    RUNTIME_META=$(ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -lc 'printf \"%s\\n%s\\n\" \"\${MEDIA_IMPORT_ALLOWED_ROOTS:-}\" \"\${MEDIA_WORKSPACE_ROOT:-}\"'" 2>/dev/null || true)
    RUNTIME_ALLOWED_ROOTS=$(printf '%s\n' "$RUNTIME_META" | sed -n '1p' | tr -d '\r')
    RUNTIME_WORKSPACE_ROOT=$(printf '%s\n' "$RUNTIME_META" | sed -n '2p' | tr -d '\r')
    RUNTIME_ALLOWED_FIRST=$(printf '%s' "$RUNTIME_ALLOWED_ROOTS" | tr ',' '\n' | sed -n '1p' | xargs)
    if [[ -n "$RUNTIME_ALLOWED_FIRST" ]]; then
      if [[ "$RUNTIME_ALLOWED_FIRST" == */unpacked ]]; then
        RUNTIME_SCAN_ROOT="${RUNTIME_ALLOWED_FIRST%/}"
      else
        RUNTIME_SCAN_ROOT="${RUNTIME_ALLOWED_FIRST%/}/unpacked"
      fi
    elif [[ -n "$RUNTIME_WORKSPACE_ROOT" ]]; then
      RUNTIME_SCAN_ROOT="${RUNTIME_WORKSPACE_ROOT%/}/imports/unpacked"
    fi
  fi

  CLI_SCAN_ROOT="$SOURCE_SCAN_ROOT"
  if [[ -n "$RUNTIME_SCAN_ROOT" ]]; then
    CLI_SCAN_ROOT="$RUNTIME_SCAN_ROOT"
  fi
  CLI_WORKSPACE_ROOT="$REMOTE_WORKSPACE_ROOT"
  if [[ "$CLI_SCAN_ROOT" == */imports/unpacked ]]; then
    CLI_WORKSPACE_ROOT="${CLI_SCAN_ROOT%/imports/unpacked}"
  fi

  echo "[media-import] Preflight перевірка перед завантаженням архівів..."
  ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; mkdir -p '$REMOTE_ARCHIVES' '$REMOTE_UNPACKED'"
  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" && -n "$REMOTE_EXEC" ]]; then
    if [[ "$HAS_UNPACKED_SYNC" -eq 0 ]]; then
      if ! ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -lc 'test -d \"$REMOTE_UNPACKED\"'"; then
        echo "[media-import] Контейнер не бачить $REMOTE_UNPACKED. Додайте bind-mount або sync-path для unpacked і повторіть запуск." >&2
        exit 1
      fi
    fi
  fi

  PREFLIGHT_SCAN_ROOT="$CLI_SCAN_ROOT/__preflight_empty__"
  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" && -n "$REMOTE_EXEC" && "$HAS_UNPACKED_SYNC" -eq 1 ]]; then
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -lc 'rm -rf \"$PREFLIGHT_SCAN_ROOT\" && mkdir -p \"$PREFLIGHT_SCAN_ROOT\"'"
  else
    PREFLIGHT_SCAN_ROOT="$REMOTE_UNPACKED/__preflight_empty__"
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; rm -rf '$PREFLIGHT_SCAN_ROOT'; mkdir -p '$PREFLIGHT_SCAN_ROOT'"
  fi

  echo "[media-import] Preflight: перевіряю запуск CLI (без завантаження архівів)..."
  build_remote_enqueue_command "$CLI_WORKSPACE_ROOT" "$CLI_SCAN_ROOT" "$PREFLIGHT_SCAN_ROOT" "$REMOTE_REDIS_URL"
  printf -v CLI_PREFLIGHT_STRING '%q ' "${CLI_CMD[@]}"
  if [[ -n "$REMOTE_EXEC" ]]; then
    REMOTE_PREFLIGHT_CMD="$REMOTE_EXEC $CLI_PREFLIGHT_STRING"
  else
    REMOTE_PREFLIGHT_CMD="$CLI_PREFLIGHT_STRING"
  fi
  PREFLIGHT_OUTPUT=""
  if PREFLIGHT_OUTPUT=$(ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_PREFLIGHT_CMD" 2>&1); then
    printf '%s\n' "$PREFLIGHT_OUTPUT"
  else
    printf '%s\n' "$PREFLIGHT_OUTPUT" >&2
    if [[ "$PREFLIGHT_OUTPUT" == *"[media-import] Нових директорій для імпорту не знайдено."* && "$PREFLIGHT_OUTPUT" == *"Error: Connection is closed."* ]]; then
      echo "[media-import] Preflight: ігнорую відомий шум закриття Redis-з'єднання після порожнього dry-run." >&2
    else
      echo "[media-import] Preflight не пройдено. Імпорт зупинено до завантаження великих архівів." >&2
      exit 1
    fi
  fi

  if [[ -n "$CLI_SCAN_ROOT" ]]; then
    echo "[media-import] Використовую шлях для сканування у контейнері: $CLI_SCAN_ROOT"
  fi

  echo "[media-import] Готую віддалені каталоги..."
  ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; mkdir -p '$REMOTE_ARCHIVES' '$REMOTE_UNPACKED'; rm -rf '$REMOTE_ARCHIVES'/* '$REMOTE_UNPACKED'/*"

  echo "[media-import] Копіюю архіви на сервер..."
  for archive in "${ARCHIVES[@]}"; do
    if [[ -n "$SSH_OPTS" ]]; then
      rsync -e "ssh $SSH_OPTS" -av --progress "$archive" "$REMOTE_HOST":"$REMOTE_ARCHIVES/"
    else
      rsync -av --progress "$archive" "$REMOTE_HOST":"$REMOTE_ARCHIVES/"
    fi
  done

  echo "[media-import] Розпаковую архіви на сервері..."
  ssh $SSH_OPTS "$REMOTE_HOST" env \
    "REMOTE_ARCHIVES=$REMOTE_ARCHIVES" \
    "REMOTE_UNPACKED=$REMOTE_UNPACKED" \
    "OVERWRITE_FLAG=$OVERWRITE_FLAG" \
    "RESET_FLAG=$RESET_FLAG" \
    bash <<'REMOTE_CMDS'
set -euo pipefail
for file in "$REMOTE_ARCHIVES"/*; do
  [ -f "$file" ] || continue
  name=$(basename "$file")
  base=${name%.*}
  target="$REMOTE_UNPACKED/$base"
  rm -rf "$target"
  mkdir -p "$target"
  case "$name" in
    *.tar.gz|*.tgz)
      tar -xzf "$file" -C "$target"
      ;;
    *.tar)
      tar -xf "$file" -C "$target"
      ;;
    *.zip)
      if command -v unzip >/dev/null 2>&1; then
        unzip -qq "$file" -d "$target"
      elif command -v python3 >/dev/null 2>&1; then
        python3 - "$file" "$target" <<'PY'
import os
import sys
import zipfile

zip_path = sys.argv[1]
target = sys.argv[2]
os.makedirs(target, exist_ok=True)
with zipfile.ZipFile(zip_path) as zf:
    zf.extractall(target)
PY
      else
        echo "[media-import] Не вдалося розпакувати ZIP: немає ні unzip, ні python3." >&2
        exit 1
      fi
      ;;
    *)
      echo "[media-import] Пропуск архіву $name: невідомий формат" >&2
      rm -rf "$target"
      rm -f "$file"
      continue
      ;;
  esac
  rm -f "$file"
done
REMOTE_CMDS

  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" && -n "$REMOTE_CONTAINER_ROOT" && -n "$REMOTE_SYNC_PATHS" ]]; then
    echo "[media-import] Оновлюю файли у контейнері..."
    for sync_entry in $REMOTE_SYNC_PATHS; do
      src_path="$sync_entry"
      dest_path="$sync_entry"
      if [[ "$sync_entry" == *:* ]]; then
        src_path="${sync_entry%%:*}"
        dest_path="${sync_entry#*:}"
      fi

      if [[ -z "$dest_path" ]]; then
        echo "[media-import] Порожній dest path для sync entry: $sync_entry" >&2
        exit 1
      fi

      if [[ "$dest_path" == /* ]]; then
        dest_abs="$dest_path"
      else
        dest_abs="$REMOTE_CONTAINER_ROOT/$dest_path"
      fi

      if [[ "$dest_abs" == */* ]]; then
        dest_dir="${dest_abs%/*}"
      else
        dest_dir="$REMOTE_CONTAINER_ROOT"
      fi

      ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; \
        $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -c 'mkdir -p \"$dest_dir\" && rm -rf \"$dest_abs\"'; \
        $REMOTE_COMPOSE_CMD cp '$src_path' $REMOTE_COMPOSE_SERVICE:$dest_dir/"
    done
  fi

  if [[ -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" ]]; then
    echo "[media-import] Генерую Prisma client у контейнері..."
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; \
      $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -lc '\
        test -f apps/api/prisma/schema.prisma || { echo \"[media-import] Не знайдено apps/api/prisma/schema.prisma у контейнері.\" >&2; exit 1; }; \
        pnpm exec prisma generate --schema apps/api/prisma/schema.prisma\
      '"
  fi

  if [[ -n "$RUNTIME_SCAN_ROOT" && "$RUNTIME_SCAN_ROOT" != "$SOURCE_SCAN_ROOT" && -n "$REMOTE_COMPOSE_CMD" && -n "$REMOTE_COMPOSE_SERVICE" ]]; then
    echo "[media-import] Узгоджую шлях імпорту з runtime налаштуванням воркера..."
    ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_COMPOSE_CMD exec -T $REMOTE_COMPOSE_SERVICE sh -lc '\
      test -d \"$SOURCE_SCAN_ROOT\" || { echo \"[media-import] Джерельний scan-root $SOURCE_SCAN_ROOT не знайдено у контейнері.\" >&2; exit 1; }; \
      rm -rf \"$RUNTIME_SCAN_ROOT\"; \
      mkdir -p \"$RUNTIME_SCAN_ROOT\"; \
      cp -a \"$SOURCE_SCAN_ROOT\"/. \"$RUNTIME_SCAN_ROOT\"/ \
    '"
  fi

  echo "[media-import] Запускаю CLI на сервері..."
  build_remote_enqueue_command "$CLI_WORKSPACE_ROOT" "$CLI_SCAN_ROOT" "$CLI_SCAN_ROOT" "$REMOTE_REDIS_URL"
  printf -v CLI_STRING '%q ' "${CLI_CMD[@]}"
  if [[ -n "$REMOTE_EXEC" ]]; then
    REMOTE_RUN_CMD="$REMOTE_EXEC $CLI_STRING"
  else
    REMOTE_RUN_CMD="$CLI_STRING"
  fi

  ssh $SSH_OPTS "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_PROJECT_ROOT'; $REMOTE_RUN_CMD"
else
  echo "[media-import] Невідомий режим MEDIA_IMPORT_MODE=$MEDIA_IMPORT_MODE. Підтримуються local або remote." >&2
  exit 1
fi

echo "[media-import] Імпорт поставлено у чергу. Перевіряйте логіку воркера через pnpm run logs:media-import-worker."
