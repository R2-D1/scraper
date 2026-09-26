#!/bin/bash

set -u

repo_root="/Users/taras/HOLE/Projects/scraper"
export PATH="/Users/taras/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin"
pnpm_bin="/Users/taras/.nvm/versions/node/v22.23.1/bin/pnpm"
intake_root="$repo_root/intake/unsplash"
lock_dir="/tmp/scraper-unsplash-import-hourly.lock"
last_run_file="$repo_root/tmp/unsplash-import-hourly.last-run"
batch_dir=""

cleanup() {
  if [ -n "$batch_dir" ] && [ -d "$batch_dir" ]; then
    while IFS= read -r -d '' staged_file; do
      relative_path="${staged_file#"$batch_dir/"}"
      destination="$intake_root/$relative_path"
      mkdir -p "$(dirname "$destination")"
      mv "$staged_file" "$destination"
    done < <(find "$batch_dir" -type f -print0)
    find "$batch_dir" -depth -type d -empty -delete
    rmdir -p "$batch_dir" 2>/dev/null || true
  fi
  rmdir "$lock_dir" 2>/dev/null || true
}

if ! mkdir "$lock_dir" 2>/dev/null; then
  exit 0
fi
trap cleanup EXIT INT TERM

now="$(date +%s)"
if [ -f "$last_run_file" ]; then
  last_run="$(cat "$last_run_file")"
  case "$last_run" in
    ''|*[!0-9]*) last_run=0 ;;
  esac
  if [ $((now - last_run)) -lt 4200 ]; then
    exit 0
  fi
fi
cd "$repo_root" || exit 1
batch_dir="$(mktemp -d /tmp/scraper-unsplash-batch.XXXXXX)"

selected=0
while IFS= read -r -d '' source_file; do
  relative_path="${source_file#"$intake_root/"}"
  staged_file="$batch_dir/$relative_path"
  mkdir -p "$(dirname "$staged_file")"
  mv "$source_file" "$staged_file"
  selected=$((selected + 1))
  if [ "$selected" -ge 50 ]; then
    break
  fi
done < <(
  find "$intake_root" -type f \( \
    -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o \
    -iname '*.webp' -o -iname '*.avif' -o -iname '*.svg' \
  \) -print0 | sort -z
)

if [ "$selected" -eq 0 ]; then
  exit 0
fi

if "$pnpm_bin" run unsplash:import-downloads -- --dir "$batch_dir" --keep; then
  printf '%s\n' "$now" > "$last_run_file"
else
  exit 1
fi
