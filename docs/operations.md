# Operations Evidence and Recovery

These procedures target the current single-host Docker Compose deployment. They do not imply a public-production deployment has been completed.

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

## MongoDB backup and restore

Use a deployment-controlled backup destination with appropriate encryption and retention. For a local disposable database:

```bash
docker compose exec db mongodump --db driftledger --archive=/tmp/driftledger.archive --gzip
docker compose cp db:/tmp/driftledger.archive ./backups/driftledger.archive
```

Restore only into a new or explicitly disposable database first:

```bash
docker compose cp ./backups/driftledger.archive db:/tmp/driftledger.archive
docker compose exec db mongorestore \
  --archive=/tmp/driftledger.archive \
  --gzip \
  --nsFrom='driftledger.*' \
  --nsTo='driftledger_restore_check.*'
docker compose exec db mongosh --quiet driftledger_restore_check --eval 'db.getCollectionNames()'
```

Never use `--drop` against valuable data without an independently verified backup and explicit operator intent.

Phase II exercised dump, deletion, restore, record validation, and cleanup against a uniquely named disposable database. The restored sentinel record count was `1`.

## Bounded non-model load baseline

On the local development laptop with warm Docker containers and the model stopped, 200 GET requests at concurrency 20 produced:

| Target | Statuses | p50 | p95 | Maximum |
| --- | --- | ---: | ---: | ---: |
| Backend liveness | all `200` | 7.60 ms | 13.54 ms | 16.15 ms |
| Backend readiness (includes Mongo ping) | all `200` | 8.04 ms | 25.69 ms | 35.47 ms |
| Frontend root | all `200` | 6.73 ms | 12.88 ms | 17.95 ms |

These are local smoke-load observations, not capacity or production-latency claims. Authentication, mutation workflows, GCS, and actual inference performance remain unbenchmarked.

## Post-deployment smoke test

With `.env` loaded locally:

```bash
curl --fail http://127.0.0.1:5173/
curl --fail http://127.0.0.1:5000/health
curl --fail http://127.0.0.1:5000/ready
curl --fail -H "X-Drift-Inference-Key: $DRIFT_INFERENCE_API_KEY" http://127.0.0.1:8000/live
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:5000/api/v1/projects
```

The protected endpoint should return `401`. Check model readiness separately; `503` is expected when llama is intentionally stopped.

## Container-security evidence

The backend and inference containers use read-only root filesystems, dropped Linux capabilities, `no-new-privileges`, PID limits, and loopback-only host bindings. The frontend applies runtime response headers. MongoDB and Nginx retain their upstream image runtime users, and the backend currently starts as the image default user because its bind-mounted evaluation report directory must remain writable. Moving all services to verified non-root users is a deployment-hardening gap, not a completed claim.
