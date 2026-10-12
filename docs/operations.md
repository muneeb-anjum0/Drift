# Operations and Recovery

These procedures target the current local single-host Docker Compose installation and a **proposed**, separately gated staging host. They do not imply public-production deployment. Never run restoration or volume deletion against valuable data without a verified backup and operator approval.

## Health semantics

- Backend `GET /health`: process liveness only.
- Backend `GET /ready`: MongoDB connectivity; inference is optional and does not make the whole product unready.
- Inference `GET /live`: FastAPI process liveness, protected by the internal service key.
- Inference `GET /health`: actual model/llama readiness, protected by the internal service key; returns `503` while the model is absent.

Observed in the Phase II local failure test:

| Operation | Evidence |
| --- | --- |
| Stop inference | Backend readiness `200`; frontend `200` |
| Restart inference | Inference liveness recovered to `200` |
| Stop MongoDB | Backend liveness `200`; readiness `503` |
| Restart MongoDB | Backend readiness recovered to `200` |
| Restart backend | Backend readiness recovered to `200` |

The llama/model profile was not started.

## Persistence and backup

The local Mongo `mongo-data` named volume survives `docker compose down`, normal updates, and container recreation; `down --volumes` does **not** preserve it. Reports are a separate mount. Optional uploaded objects, if GCS is enabled, require a separate bucket/object backup. Provider master keys and ignored `.env` files require separate secret custody. A Mongo dump alone is not full installation recovery.

Use a deployment-controlled backup destination outside the checkout, with restrictive permissions, encryption/retention appropriate to the data, an off-host copy where required, and a recorded SHA-256. The concrete local dump/restore commands and destructive-reset warning are in [development](development.md). For future staging, `tools/ops/staging_mongo_backup.sh` is restricted to staging/disposable databases and creates a dated hashed archive; its presence is not proof that off-host retrieval or target-host restore has been tested. For a **disposable** restore rehearsal only:

```bash
docker compose exec -T db mongodump --db driftledger --archive --gzip > /path/outside/checkout/verified.archive.gz
```

Restore only into a new or explicitly disposable database first:

```bash
docker compose exec -T db mongorestore \
  --archive --gzip \
  --nsFrom='driftledger.*' \
  --nsTo='driftledger_restore_check.*' < /path/outside/checkout/verified.archive.gz
docker compose exec db mongosh --quiet driftledger_restore_check --eval 'db.getCollectionNames()'
```

Verify restored IDs/counts/indexes against the source record. Never use `--drop` against valuable data without an independently verified backup and explicit operator intent. Staging should initially use synthetic data and separate volumes/database; do not restore production or sealed research data into it.

Phase II exercised dump, deletion, restore, record validation, and cleanup against a uniquely named disposable database. The restored sentinel record count was `1`.

## Bounded non-model load baseline

On the local development laptop with warm Docker containers and the model stopped, 200 GET requests at concurrency 20 produced:

| Target | Statuses | p50 | p95 | Maximum |
| --- | --- | ---: | ---: | ---: |
| Backend liveness | all `200` | 7.60 ms | 13.54 ms | 16.15 ms |
| Backend readiness (includes Mongo ping) | all `200` | 8.04 ms | 25.69 ms | 35.47 ms |
| Frontend root | all `200` | 6.73 ms | 12.88 ms | 17.95 ms |

These are local smoke-load observations, not capacity or production-latency claims. Authentication, mutation workflows, GCS, and actual inference performance remain unbenchmarked.

## Health, failure, and monitoring

With the local stack running, unauthenticated loopback probes can check the frontend and Go boundaries:

```bash
curl --fail http://127.0.0.1:5173/
curl --fail http://127.0.0.1:5000/health
curl --fail http://127.0.0.1:5000/ready
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:5000/api/v1/projects
```

The protected endpoint should return `401`. Inference and llama have no published local host ports; use an authorized in-network check/health log instead of assuming `127.0.0.1:8000` is reachable. Check model readiness separately; keyed inference `/health=503` is expected when llama is intentionally stopped. `docker compose ps` and `docker compose logs --tail=80 db backend inference frontend` reveal unhealthy or restarting services. Do not print secret-bearing rendered Compose configuration.

For staging, an operator must actually install and test polling/alerts for frontend HTTPS, backend `/health` and `/ready`, authenticated inference `/live` and `/health`, llama `/health`, Mongo ping, repeated 5xx/429, low disk, and restart loops. Backend `/health=200` with `/ready=503` means Mongo is unavailable; backend `/ready=200` does **not** mean inference loaded. Logs should be collected with access control and retention without raw provider text, keys, JWTs, or client documents. Alert delivery, retention, and on-call ownership remain unverified until a target host exists.

## Restart and rollback

`docker compose down` followed by `docker compose up -d --wait db inference backend frontend` reuses the local Mongo volume; a physical-host reboot is not claimed tested by this command alone. Restart inference after adding the original GGUF because its first model-load attempt may have occurred without the file. A future staging rollback must use the previously reviewed Git SHA, immutable image digests, matching configuration snapshot and original GGUF SHA, keep Mongo data intact for an application rollback, and verify health before reopening traffic. There is no automatic reverse schema/index migration. A data restore requires a fresh snapshot of failed state, an isolated test restore, exact record/index verification, and separate approval. Phase IV-C's A→B→A exercise was local/synthetic; target-host rollback is not verified. See [deployment](deployment.md).

## Container-security evidence

The backend and inference containers use read-only root filesystems, dropped Linux capabilities, `no-new-privileges`, PID limits, and loopback-only host bindings. The frontend applies runtime response headers. MongoDB and Nginx retain their upstream image runtime users, and the backend currently starts as the image default user because its bind-mounted evaluation report directory must remain writable. Moving all services to verified non-root users is a deployment-hardening gap, not a completed claim.
