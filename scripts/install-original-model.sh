#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

expected=11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9
target=ai_model/artifacts/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: ./scripts/install-original-model.sh /path/to/original.gguf [--gpu]" >&2
  exit 2
fi
source_file=$1
mode=${2:-}
if [ -n "$mode" ] && [ "$mode" != "--gpu" ]; then
  echo "Second argument must be --gpu." >&2
  exit 2
fi
if [ ! -f "$source_file" ]; then
  echo "Model file not found: $source_file" >&2
  exit 1
fi
if ! command -v sha256sum >/dev/null 2>&1; then
  echo "sha256sum is required to verify the model." >&2
  exit 1
fi
actual=$(sha256sum "$source_file" | cut -d ' ' -f 1)
if [ "$actual" != "$expected" ]; then
  echo "Model SHA-256 does not match the supported original. Nothing was installed or started." >&2
  exit 1
fi

mkdir -p ai_model/artifacts/gguf
if [ -f "$target" ]; then
  installed=$(sha256sum "$target" | cut -d ' ' -f 1)
  if [ "$installed" != "$expected" ]; then
    echo "A different file already occupies $target; remove it manually after checking its custody." >&2
    exit 1
  fi
else
  cp "$source_file" "$target"
  installed=$(sha256sum "$target" | cut -d ' ' -f 1)
  if [ "$installed" != "$expected" ]; then
    echo "Copied model failed verification. Do not start it; inspect $target." >&2
    exit 1
  fi
fi
echo "Original model hash verified."

if docker info >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v sudo >/dev/null 2>&1; then
  sudo -v
  compose() { sudo docker compose "$@"; }
else
  echo "Model verified, but Docker is unavailable. Start it after Docker access is configured." >&2
  exit 1
fi

if [ "$mode" = "--gpu" ]; then
  compose -f docker-compose.yml -f deploy/compose/gpu.yml --profile model up -d llama
else
  compose --profile model up -d llama
fi
compose restart inference
echo "Model container started. Check its logs and the in-app model readiness before comparing changes."
