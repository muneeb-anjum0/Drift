#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine/Desktop with Compose v2 first." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

# Keep file creation under the caller's account even when Docker needs sudo.
if docker info >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v sudo >/dev/null 2>&1; then
  echo "Docker needs administrator access; sudo may ask for your password."
  sudo -v
  compose() { sudo docker compose "$@"; }
else
  echo "Cannot access the Docker daemon. Grant your user access or install sudo." >&2
  exit 1
fi

if [ ! -e .env ]; then
  umask 077
  jwt_secret=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
  inference_key=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
  provider_key=$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n')
  project_name=drift-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
  temp_env=$(mktemp ./.env.setup.XXXXXX)
  trap 'rm -f "$temp_env"' EXIT HUP INT TERM
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      JWT_SECRET=*) printf 'JWT_SECRET=%s\n' "$jwt_secret" ;;
      DRIFT_INFERENCE_API_KEY=*) printf 'DRIFT_INFERENCE_API_KEY=%s\n' "$inference_key" ;;
      DRIFT_PROVIDER_MASTER_KEY=*) printf 'DRIFT_PROVIDER_MASTER_KEY=%s\n' "$provider_key" ;;
      COMPOSE_PROJECT_NAME=*) printf 'COMPOSE_PROJECT_NAME=%s\n' "$project_name" ;;
      *) printf '%s\n' "$line" ;;
    esac
  done < .env.example > "$temp_env"
  mv "$temp_env" .env
  trap - EXIT HUP INT TERM
  unset jwt_secret inference_key provider_key project_name
  echo "Created private .env with independent service and provider-encryption keys."
else
  echo "Using existing .env without changing its keys or settings."
fi

chmod 600 .env
if ! awk -F= '
  $1 == "JWT_SECRET" && length($2) >= 32 { jwt = $2 }
  $1 == "DRIFT_INFERENCE_API_KEY" && length($2) >= 32 { inference = $2 }
  END { exit !(jwt != "" && inference != "" && jwt != inference) }
' .env; then
  echo "JWT_SECRET and DRIFT_INFERENCE_API_KEY must be different and at least 32 characters." >&2
  exit 1
fi

compose config --quiet
compose up -d --build --wait db inference backend frontend

port=$(awk -F= '$1 == "DRIFT_FRONTEND_PORT" { print $2; exit }' .env)
echo "Drift is ready at http://localhost:${port:-5173}"
echo "The core app works without model weights. AI comparison needs the separately supplied original GGUF or a configured BYOK provider."
