# Staging Rollback Procedure

**Local synthetic rehearsal completed; not executed on a staging host.** This is a procedure for a future controlled staging deployment, not permission to deploy or restore data now. It requires a reviewed previous release, saved immutable image identities, the matching ignored configuration snapshot, a verified original GGUF, and a tested Mongo backup. Do not use the rejected Phase III-J candidate as a rollback artifact.

## Freeze before a rollout

For each staging release, record the full Git SHA (`STAGING_RELEASE_ID`), frontend/backend/inference image IDs and digests, Compose files and rendered-config **hash** (not rendered secret-bearing content), original model SHA-256, Mongo backup ID/hash, health baseline, operator, and UTC time. Retain prior images locally or in an access-controlled registry. A mutable image tag alone is not rollback evidence. Preserve the previous `.env.staging` encrypted outside Git with an access audit. The staging preflight must pass on a clean checkout of the intended release.

## Application rollback

1. Stop new traffic at the external TLS terminator; leave the Mongo volume and backups intact. Record the failing release's logs and image IDs.
2. Select the previously reviewed Git SHA and its exact image digests. Restore the matching configuration snapshot to the ignored `.env.staging` on the staging host. Verify the snapshot does not reference production secrets/data and still selects the original GGUF.
3. From the clean previous-release checkout, run the staging preflight and `docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml --profile model config --quiet`. Never publish `docker compose config` output because it expands secrets.
4. Recreate **frontend, backend, and inference only** from the retained prior images with Compose `up -d --no-build --pull never --force-recreate frontend backend inference`. Check that the resolved image IDs match the recorded digests before reopening traffic. If the prior image is absent, stop; do not rebuild it from mutable dependencies and call that an exact rollback.
5. Confirm frontend HTTP, backend `/health` and `/ready`, inference authenticated `/live` and `/health`, an unauthenticated rejection, and a synthetic product request. Reopen traffic only after the gate's operational criteria pass.

The frontend and backend are rolled back together because built API URLs, CORS origin, and response assumptions can couple them. The inference service may be rolled back independently only if its contract is verified compatible with the backend. Do not use `docker compose down --volumes` for an application rollback.

## Model mount and runtime

The staging overlay mounts only the original `DriftLedger-Qwen2.5-7B-Q4_K_M.gguf` read-only. If model loading fails, stop the inference/llama path, inspect logs and mount permissions, and compare the host file SHA-256 with `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. Restore that exact original from a separately custodied copy if the file is missing or corrupt; then restart llama and inference and verify `/health`. Never relink or rename the rejected candidate into this path.

## Database and configuration

There is no general automatic schema rollback. Before any schema/index change, record a forward/backward compatibility decision and a verified backup/restore test. A failed application rollout should normally keep the existing Mongo data and return to a compatible prior app. If the data itself must be restored, first halt writes, preserve a fresh snapshot of the current failed state, restore the prior verified backup into an **isolated test namespace**, compare counts/IDs/indexes, obtain explicit operator approval, and only then plan the exact staging database restore. Never run an unreviewed `--drop` or target production.

Configuration rollback uses the prior encrypted `.env.staging` snapshot and the same reviewed origin, ports, secrets, rate limits, and storage mode. If credentials were compromised, rotate them through a separate security procedure rather than restoring a compromised secret. Uploaded-file storage is disabled in initial staging; a future GCS-enabled release needs its own bucket/object rollback plan.

## Failed deployment and evidence

If preflight, image identity, readiness, or post-rollout smoke fails, leave public traffic closed and classify the release as failed. Preserve sanitized logs, health results, image/config hashes, backup identity, and the rollback decision in a release record. The minimum staging monitoring signals and readiness distinctions are described in the [staging configuration](staging_configuration.md) and [gate](staging_readiness_gate.md). This document has not been rehearsed against a real staging environment, so target-host rollback remains **BLOCKED** until then.

## Phase IV-C isolated A→B→A rehearsal

`docker-compose.rehearsal.yml` created only the `drift-ivc-rehearsal` project with a synthetic Mongo volume, loopback frontend port 5176, no backend/inference/Mongo host ports, and the original GGUF read-only. The A/B image tags have distinct local image IDs and labels but the same application source; B changed `AUTH_RATE_LIMIT_REQUESTS` from 10 to 12. This proves Compose image/config rollback mechanics, **not** binary compatibility between two real reviewed releases or a target-host rollback.

| Revision | Frontend image ID prefix | Backend image ID prefix | Inference image ID prefix | Config | Observed result |
| --- | --- | --- | --- | --- | --- |
| A | `61f717c7f1d3` | `d78347b02599` | `bb63aaa82368` | Rate limit 10 | All five services healthy; UI 200, unauthenticated API 401, synthetic inference 200/`unchanged`. |
| B | `6c19ba8e8647` | `53b83b0fad75` | `2884256c8848` | Rate limit 12 | All five services healthy; UI 200, unauthenticated API 401, synthetic inference 200/`unchanged`. |
| A restored | same A IDs above | same A IDs above | same A IDs above | Rate limit 10 | All five services healthy; UI 200, unauthenticated API 401, synthetic inference 200/`unchanged`. |

The llama container and original read-only host-file mount were unchanged across the switches. The host GGUF hash was verified separately. No database migration was introduced in B. Mongo index changes are not generally reversible; a future release with schema changes needs forward/backward compatibility analysis or an explicitly approved data restore, not an automatic image rollback. The local A/B images are disposable rehearsal artifacts and are **not** proposed release identities.
