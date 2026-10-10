# Staging Mongo Backup and Restore

**Procedure only for a future staging host; no production data is authorized.** Initial staging uses synthetic data. The local Phase IV-C rehearsal archive is retained under ignored `archive/phase_iv_c_local_backup/`; it is not a staging-host or off-host backup.

## Custody and retention

Provision `/srv/drift-staging/backups/` outside the checkout and Compose volumes, owned by the release operator with restrictive permissions. Keep a separate **encrypted, access-controlled off-host destination** chosen by the operator; record its URI/object version, checksum, copy time, and retrieval test. Never label a second directory on the same host as off-host. Use a staging-only MongoDB tools YAML with `uri:` and credentials, mode `0600`, outside Git; do not put passwords in process arguments or shell history. Do not use production credentials or a production URI.

For every release and before destructive maintenance, create a timestamped, SHA-bound archive with [`tools/ops/staging_mongo_backup.sh`](../tools/ops/staging_mongo_backup.sh). Record the full reviewed release SHA, archive filename, bytes, SHA-256, database, operator, UTC time, off-host copy identity, restore-test result, and Mongo index inventory. Retain at least the two most recent **verified** snapshots until a real retention policy and storage quota are approved. Never automatically delete the last restorable backup; a final deletion requires explicit operator review. If sensitive data is later introduced, encrypt both the host archive and off-host copy at rest, use encrypted transfer, restrict readers, and reapprove retention.

Example **placeholder-driven** backup invocation after the staging host is provisioned (never paste actual credentials into a command):

```sh
DRIFT_BACKUP_DB=drift_staging \
DRIFT_BACKUP_ROOT=/srv/drift-staging/backups \
DRIFT_BACKUP_AUTH_FILE=/srv/drift-staging/secrets/mongo-tools.yaml \
DRIFT_BACKUP_RELEASE_ID="$REVIEWED_RELEASE_SHA" \
  tools/ops/staging_mongo_backup.sh
```

The script refuses a missing directory, missing config, non-full SHA, or a database other than `drift_staging`/`drift_ivc_*`; it creates a mode-0600 `.archive.gz` plus `.manifest` containing the checksum. Ensure MongoDB Database Tools are installed or run a pinned `mongo:7` tools container with the backup directory and auth file mounted read-only where possible. The directory itself must be writable by the invoking operator; do not make root-owned artifacts that the operator cannot restore.

## Restore verification and emergency restore

First verify `sha256sum` against the manifest and retrieve the **off-host** copy into an isolated restore sandbox. For a routine restore test, restore to a separate `drift_ivc_*` database or isolated Mongo container, never overwrite staging. Mongo tools command shape:

```sh
mongorestore --config /path/to/isolated-mongo-tools.yaml \
  --archive=/path/to/verified.archive.gz --gzip --stopOnError
```

An archive retains its source database namespace. If restoring into a different database on the same server, use reviewed `--nsFrom`/`--nsTo` mappings. Compare exact expected record IDs and values, counts, all required indexes (including unique flags), and application startup/readiness. The read-only `go run ./cmd/check-schema` command from `server-go/` reports missing/incompatible indexes; its `--provision` mode is restricted to disposable `drift_ivc_*` databases. An emergency restore into `drift_staging` needs a maintenance window, halted writes, a fresh snapshot of the current state, explicit target verification, and operator approval. Never run an unreviewed `--drop`, `docker compose down --volumes`, or a production restore.

## Phase IV-C local rehearsal evidence

On isolated synthetic Mongo `drift_ivc_backup_rehearsal`, two identifiable records and `kind_1` were backed up to `archive/phase_iv_c_local_backup/drift_ivc_backup_rehearsal_20261009T193814Z_88e81355688a.archive.gz` (396 bytes, SHA-256 `26366d4e12ee8ed502d7be35cffd17d799ce2ec349f9e1488d4d585a5f53cb92`). A local same-host copy matched the checksum. The exact source database was dropped, restored from the retained archive with `--stopOnError`, and both values and `_id_`/`kind_1` indexes matched. The adjacent ignored manifest records the checks. **True off-host copy and staging-host restore remain BLOCKED.**
