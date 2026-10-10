#!/usr/bin/env bash
set -euo pipefail

# Run with MongoDB Database Tools on PATH. Credentials live only in the
# ignored, mode-0600 YAML passed as DRIFT_BACKUP_AUTH_FILE.
: "${DRIFT_BACKUP_DB:?set an isolated database name}"
: "${DRIFT_BACKUP_ROOT:?set an existing absolute backup directory}"
: "${DRIFT_BACKUP_AUTH_FILE:?set an existing MongoDB tools --config YAML}"
: "${DRIFT_BACKUP_RELEASE_ID:?set the reviewed source SHA}"

case "$DRIFT_BACKUP_DB" in
  drift_staging|drift_ivc_*) ;;
  *) echo 'BACKUP_FAIL: database must be drift_staging or drift_ivc_*' >&2; exit 1 ;;
esac
if [[ "$DRIFT_BACKUP_ROOT" != /* || ! -d "$DRIFT_BACKUP_ROOT" ]]; then
  echo 'BACKUP_FAIL: root must be an existing absolute directory' >&2
  exit 1
fi
if [[ ! -f "$DRIFT_BACKUP_AUTH_FILE" ]]; then
  echo 'BACKUP_FAIL: MongoDB tools config file is missing' >&2
  exit 1
fi
if [[ ! "$DRIFT_BACKUP_RELEASE_ID" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'BACKUP_FAIL: release ID must be a full Git SHA' >&2
  exit 1
fi

umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="${DRIFT_BACKUP_DB}_${stamp}_${DRIFT_BACKUP_RELEASE_ID:0:12}"
archive="$DRIFT_BACKUP_ROOT/$base.archive.gz"
manifest="$DRIFT_BACKUP_ROOT/$base.manifest"
if [[ -e "$archive" || -e "$manifest" ]]; then
  echo 'BACKUP_FAIL: timestamp/release artifact already exists' >&2
  exit 1
fi
partial="$(mktemp "$DRIFT_BACKUP_ROOT/.${base}.partial.XXXXXXXX")"
trap 'rm -f -- "$partial"' EXIT
mongodump --config "$DRIFT_BACKUP_AUTH_FILE" --db "$DRIFT_BACKUP_DB" --archive="$partial" --gzip --quiet
sha="$(sha256sum "$partial" | cut -d' ' -f1)"
bytes="$(stat -c '%s' "$partial")"
mv -- "$partial" "$archive"
trap - EXIT
printf 'database=%s\ncreated_utc=%s\nrelease_sha=%s\narchive=%s\narchive_sha256=%s\narchive_bytes=%s\n' \
  "$DRIFT_BACKUP_DB" "$stamp" "$DRIFT_BACKUP_RELEASE_ID" "$base.archive.gz" "$sha" "$bytes" > "$manifest"
chmod 600 "$archive" "$manifest"
echo "BACKUP_PASS: $archive"
echo "BACKUP_MANIFEST: $manifest"
echo "BACKUP_SHA256: $sha"
