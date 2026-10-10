# Staging Data Custody

**Design only; staging has not been deployed.** Initial staging is a separate single-host Compose project named `drift-staging` using **synthetic/test data only**. No production database, production bucket, or final-holdout corpus may be attached. The release source must be clean and reviewed before the staging preflight can pass.

## State locations and owners

| State | Defined staging location | Custody rule |
| --- | --- | --- |
| MongoDB records and indexes | Docker named volume `drift-staging_staging-mongo-data`, mounted at `/data/db` inside `drift-staging-db`; database name `drift_staging` | Dedicated root credentials in ignored `.env.staging`. Backend URI is fixed to the in-project `db` host and `drift_staging` database; no external/production Mongo URI can be interpolated from the overlay. Resolve the physical mount with `docker volume inspect drift-staging_staging-mongo-data` on the staging host. |
| In-app evaluation reports | Docker named volume `drift-staging_staging-reports`, mounted at `/app/reports` in Go | Treat reports as potentially sensitive; do not sync into Git or public logs. Confirm retention before first deployment. |
| Uploaded files | **None initially**. `STAGING_FIREBASE_STORAGE_ENABLED=false`; API upload endpoints return the existing disabled-storage error. | Do not reuse a production GCS bucket or credential. A later upload-enabled stage requires a staging-only bucket, service account with least privilege, object backup/retention, and separate approval. |
| Model | A dedicated host file at `/srv/drift-staging/models/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`, supplied through `STAGING_ORIGINAL_GGUF` and mounted read-only into inference and llama.cpp | Preflight checks SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`, exact basename, non-symlink, and outside the source checkout. The rejected candidate is not mounted. Preserve an independently recoverable original copy. |
| Backups | Staging-host directory `/srv/drift-staging/backups/`, outside Compose volumes and source checkout | Operator-owned, encrypted-at-rest storage with restricted permissions and an off-host copy before any destructive maintenance. Each backup receives a UTC timestamp, release ID, SHA-256, and restore-test record. This path must be provisioned; it does not exist merely because this document names it. |
| Configuration/secrets | Ignored `.env.staging` in the staging checkout; externally controlled secret backup | Never commit, print in logs, or copy from production. The tracked `.env.staging.example` contains no credential values. Limit access to release operators. |

Compose `name: drift-staging` and distinct container names avoid collisions with the local `Drift` project. The overlay removes host bindings for Mongo, Go, inference, and llama.cpp; only frontend HTTP binds loopback pending a separately reviewed TLS terminator. The internal subnet gives each current service an explicit unique IP and leaves the configured future ingress IP free; all must be changed together if the host subnet conflicts. `docker-compose.staging.yml` requires the original GGUF source and nonempty staging secrets. The initial storage backend is deliberately disabled, so uploaded-file backup semantics are **not** covered by a Mongo dump.

## Isolation checks before first use

1. Provision a separate staging host or explicitly isolated VM and the dedicated model/backup paths. Do not point `STAGING_ORIGINAL_GGUF` into the source checkout, a production mount, or the rejected-candidate directory.
2. Copy `.env.staging.example` to ignored `.env.staging`; set a dedicated HTTPS origin, full reviewed Git SHA, independent JWT/inference/Mongo credentials, and the absolute original-model path. Use URL-safe Mongo username/password because Compose builds a fixed local Mongo URI.
3. Run `python3 tools/verification/check_staging_env.py --env-file .env.staging`. It fails on placeholders, a dirty checkout, wrong SHA, enabled GCS, or an in-repository model path. Keep the checker output, not the secret file, with release evidence.
4. Render `docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml --profile model config --quiet`; inspect sanitized ports, mounts, project name, and database target. Never publish full rendered config because it contains secrets.
5. Confirm the named volumes do not contain prior data before first creation. On an existing staging installation, treat them as valuable and back them up before any reset.

## Backup, restore, and reset boundary

Back up the `drift_staging` database with authenticated `mongodump` to a uniquely named archive under `/srv/drift-staging/backups/`; hash it and copy it off-host. Do not put passwords on an operator shell command line or into the backup filename. Restore-test into a **separate disposable namespace or isolated test Mongo container**, compare record IDs/counts and indexes, and record the result. The exact credential-safe command and retention boundary are in the [backup/restore runbook](staging_backup_restore.md). Phase IV-C retained a local synthetic rehearsal archive, but true off-host custody remains unverified.

For a reset, first verify project name `drift-staging`, exact volume identity, a successful recent backup/restore test, and written operator approval. Stop only staging services, then remove or recreate **only** the explicitly identified staging database/volume; never use a broad `docker volume prune` or `docker compose down --volumes` on an ambiguous project. Preserve model and backup files. A reset is **not** performed in Phase IV-B. Restores must never target production. See [staging rollback](staging_rollback.md) for application/configuration rollback boundaries.
