# Phase IV-B Release Candidate Readiness

## 1. Status

**RELEASE_CANDIDATE_BLOCKED — no staging deployment authorized.** This report records local verification of the dirty `phase-3/targeted-retraining` worktree at source HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`. It does not freeze a release revision, commit, tag, push, merge, or deploy. Phase III remains **FROZEN**; the model decision is **KEEP_EXISTING_PRODUCTION_MODEL**; the rejected Phase III-J candidate is **RESEARCH ARTIFACT ONLY**. The reviewed development set is closed for future tuning. The final holdout is **SEALED / NOT USED FOR PHASE IV** and is not available locally.

## 2. Release Candidate Scope

The [proposed manifest](release_candidate_manifest.md) names exact paths and review groups. The next reviewed release should contain only current source, configuration, tests, verification tooling, and authoritative documentation. The production model is the existing original `DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`, SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`; it is an externally custodied runtime asset, **not** a Git or image artifact. No GGUF, private archive, Kaggle output, local environment, secret, or final-holdout payload is in scope. The proposed staging topology has not been launched.

## 3. Worktree Review

The initial audit showed the required branch/HEAD above, **zero staged files**, and the dirty status listed below. `git diff` of all tracked changes and content/status review of untracked documentation and tooling were performed before Phase IV-B edits. A path's presence below does **not** authorize staging it automatically.

| Initial changes (complete grouping) | Class | Disposition / review result |
| --- | --- | --- |
| `.gitignore` | D tooling/configuration | **Keep/revise:** preserve the existing Phase III-K private archive ignore; add the nonsecret staging-example exception only. |
| `.dockerignore` | B Phase IV-A documentation/release hygiene | **Keep/revise:** exclude private evidence, model binaries, and local outputs from image context; permit only the nonsecret staging example. |
| `README.md`, `docs/README.md`, `docs/model_research_status.md`, `docs/known-limitations.md`, `docs/model-pipeline.md`, `docs/phase_iv_a_repository_and_release_readiness.md`, `docs/staging_readiness_gate.md` | B Phase IV-A documentation | **Keep/revise:** current-status navigation and explicit staging blockers; corrected the gate with observed Phase IV-B evidence. Superseded action text is not authority. |
| `docs/phase_iii_j_baseline_outcome.md`, `docs/phase_iii_j_probe_runbook.md`; `docs/phase_iii_j_corrective_training_proposal.md`, `docs/phase_iii_j_label_only_baseline_plan.md`, `docs/phase_iii_j_label_only_baseline_result.md`, `docs/phase_iii_j_label_only_candidate_freeze.md`, `docs/phase_iii_j_label_only_conversion_and_cpu_screen_plan.md`, `docs/phase_iii_j_label_only_conversion_environment.md`, `docs/phase_iii_j_label_only_conversion_result.md`, `docs/phase_iii_j_label_only_cpu_development_screen_result.md`, `docs/phase_iii_j_label_only_final_gate_translation.md`, `docs/phase_iii_j_label_only_retraining_proposal.md`, `docs/phase_iii_j_label_only_training_outcome.md`, `docs/phase_iii_j_label_only_training_runbook.md`, `docs/phase_iii_j_model_output_contract_review.md`, `docs/phase_iii_j_structural_failure_probe.md`, `docs/phase_iii_k_post_rejection_analysis.md` | A Phase III evidence/documentation | **Exclude from the staging application commit; preserve and review separately** as dated research provenance. The Phase III-K decision and CPU development screen govern current status; interim proposals/gates are inactive. No evidence content was normalized or deleted. |
| `tools/phase3j_label_only/P1-L1.json`, `README.md`, `build_package.py`, `conversion_requirements.in`, `conversion_requirements.txt`, `development_gate_label_only_v1.json`, `phase3j_label_only.py`, `requirements.txt`, `test_phase3j_label_only.py`, `training_config_label_only_v1.json`, `verify_conversion_environment.py` | D tooling/configuration (historical research only) | **Exclude from staging release commit; preserve for separate provenance review.** The conversion lock and verifier bind the historical environment; neither is a runtime dependency or permission to reconvert/retrain. |
| `tools/phase3j_label_only/__pycache__/`, local virtual environments, Node dependencies, build output, Playwright output, logs, private archives, GGUFs, Kaggle/download ZIPs | E generated/local-only | **Ignore permanently as local artifacts**, retain private evidence outside Git; do not remove historical evidence merely to clean status. |

No initial item was left in category F (unknown) after content review. There were no initial runtime/source edits (C); the new CORS change is explicitly Phase IV-B. The Phase IV-B changes to Compose, CI, env example, package lock, Playwright configuration, Go CORS, staging checker/tests, and operational documents are listed in the manifest. The only historical-document edit made here was a broken absolute *link* in `phase_iii_e_development_report.md`, replaced with a repository-relative link; original evidence prose and machine paths were retained as provenance. `docs/README.md` is a current index, not a duplicate of historical reports.

## 4. Staging Configuration

[`docker-compose.staging.yml`](../docker-compose.staging.yml) overlays the existing Compose topology with a distinct `drift-staging` project, internal authenticated Mongo URI/database, no host ports for Mongo/Go/inference/llama, loopback-only frontend HTTP, separate named volumes, and one read-only mount of the original model. [`.env.staging.example`](../.env.staging.example) uses blank sensitive values and a deliberately invalid HTTPS origin. [`check_staging_env.py`](../tools/verification/check_staging_env.py) rejects placeholder/weak secrets, unsafe Mongo credentials, wrong/linked/in-repository model paths or SHA, dirty/mismatched source, and storage enablement. The example is intentionally unable to pass preflight; actual secrets and target model copy are not present. Local config render and five checker unit tests passed. Docker Compose v2.24.4+ is required by overlay `!override`/`!reset` tags. The [configuration and monitoring design](staging_configuration.md) records API origin, auth, CORS, proxies, rate limits, health semantics, logging, ports, volumes, and restart policy. TLS ingress and trusted-proxy behavior remain blockers.

## 5. Data Custody

The [custody document](staging_data_custody.md) defines isolated `drift_staging` Mongo in `drift-staging_staging-mongo-data`, report state in `drift-staging_staging-reports`, uploads **disabled**, a separate original-model host file, and operator-owned `/srv/drift-staging/backups/` with off-host copy. These are planned staging locations, not a claim that a host or bucket has been provisioned. Initial staging data is synthetic/test only. The backend URI cannot be set to an external production Mongo address through the overlay. No staging reset, production-data copy, or final-holdout access occurred.

## 6. Build Results

| Area | Exact command / environment | Result |
| --- | --- | --- |
| Frontend | `npm ci --no-audit --no-fund`; `npm run lint`; `npm run typecheck`; `npm run build` | **PASS** after lockfile update. Node 22 image build also completed from that lockfile. |
| Go | `gofmt -l .`, `go vet ./...`, `go test ./...`, `go build -o /tmp/drift-api ./cmd/api` inside cached `golang:1.26.6-alpine` with `server-go` mounted read-only | **PASS** after CORS change. Host Go was absent. Version 1.26.6 agrees with `go.mod`, Dockerfile, and CI; no host toolchain was installed. |
| Inference | `.venv/bin/python -m pip check`; compileall; `.venv/bin/ruff check --exclude tools/model/vendor services/inference tools`; Python 3.13 Docker image build/start | **PASS**. Local test venv Python 3.14.7 differs from container Python 3.13; import/start was additionally verified in the built container. The ignored vendor checkout is excluded by the repository Makefile and from a clean CI checkout. |
| Containers | `docker compose config --quiet`; base+GPU, base+test, and base+staging profile config renders; `docker compose build frontend backend inference` | **PASS** locally, including frontend rebuild after dependency update and backend rebuild after CORS change. No staging stack was started. |

## 7. Test Results

| Suite / command | Pass | Fail | Skip | Evidence / duration |
| --- | ---: | ---: | ---: | --- |
| `go test -count=1 -json ./...` in Go 1.26.6 container, counted from terminal test events | 87 pass events | 0 | 8 skip events | Includes nested subtests; Mongo-dependent cases skip without `MONGO_TEST_URI` and were run separately below. Backend config, middleware, service and repository unit tests passed. |
| `go test -count=1 -v ./internal/integration` against isolated authenticated Mongo | 6 top-level tests | 0 | 0 | 2.665 s; authorization, tenant separation, concurrent baseline/approval, cascade and injected partial-storage failure covered. |
| `.venv/bin/python -m pytest -q services/inference/test_app.py` | 9 | 0 | 0 | One Starlette deprecation warning; inference contract/auth tests. |
| `.venv/bin/python -m pytest -q tools/verification` | 83 | 0 | 0 | 0.21 s; includes five new staging-env checker tests and historical synthetic-fixture verification tests. No final-holdout payload accessed. |
| `PLAYWRIGHT_BASE_URL=http://localhost:5175 npm run test:e2e` against isolated test Compose | 4 | 0 | 0 | 13.5 s on the rebuilt frontend image; test Mongo held zero saved analyses after unavailable-inference UI path. |
| Backup/restore exact-record check | 2 records and index restored | 0 | 0 | Isolated Mongo rehearsal; details in §11. |

The repository has no separate frontend unit-test suite. `go test ./...` covers Go authorization unit tests; the Mongo integration command exercises tenant/concurrency/deletion/failure invariants. The local verification tests use fixtures and did not open the sealed final. Remote CI on a future reviewed revision is still required. No test was disabled or weakened to reach a pass.

The isolated `drift-ivb-test` Compose containers/network were stopped and removed after verification with `docker compose -f docker-compose.yml -f docker-compose.test.yml down` **without** `--volumes`; their synthetic test volumes were not deleted. Existing local development containers were not stopped.

## 8. Production Model Load

The local original GGUF and the file mounted in the existing local llama runtime both hashed to `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. The existing llama `/health` returned 200 and `/props` named the original model; authenticated inference `/health` returned 200 with `model_loaded=true` and `llama_connected=true`. A single synthetic baseline/new lamp-color request returned HTTP 200 with label `modified`. Unauthenticated inference `/health` returned 401. The rejected candidate's distinct local SHA was not loaded. This verifies a **local** runtime, not the unprovisioned dedicated staging mount. No Phase III corpus or final row was used.

## 9. Security Verification

`npm audit --audit-level=high` now reports **0 vulnerabilities** after the scoped dev-dependency update to `concurrently@9.2.5` / `shell-quote@1.12.0`; `pip-audit --requirement services/inference/requirements.txt` reports **0 known findings across 23 dependencies**. `govulncheck@v1.1.4 ./...` under the declared Go 1.26.6 exits nonzero: it reports affected standard-library paths and `golang.org/x/net@0.58.0` findings. The [official Go vulnerability record](https://pkg.go.dev/vuln/GO-2026-6617) names fixed Go 1.26.9 and `x/net` 0.60.0 for one reported issue. Findings require applicability review and a coordinated, tested version update; do not silently replace the repository-declared toolchain. This is a concrete release blocker. No configured container-image scanner or full history/credential audit was completed; a simple nonignored source-marker scan found no obvious private-key/API-key pattern.

Isolated checks confirmed missing/weak JWT and missing inference key fail backend startup before Mongo connection; absent/wrong inference key returns 401. Nginx emitted CSP, frame, content-type and referrer headers; unauthenticated project access returned 401. CORS now admits the configured origin and does not allow the legacy local Vite origin when `APP_ENV=staging`. Go rate-limit and role/capability tests pass, but Gin's trusted-proxy/client-IP configuration is not staging-hardened; `c.ClientIP()` under a TLS proxy needs explicit validation before public ingress. No external penetration test was run.

## 10. Dependency Failure / Recovery

Controlled **isolated** tests, not production data: pausing Mongo kept backend `/health=200` but changed `/ready` to 503; unpausing restored `/ready=200`. Missing or invalid JWT and missing inference key caused `invalid_configuration` startup failure. Inference with no llama remained live (`/live=200`) but returned `/health=503`, rather than a false ready state. The absent Docker DNS name made that check take about eight seconds, which needs a recovery-time review. Stopping isolated inference did not make Go `/ready` fail because that endpoint intentionally measures Go+Mongo, while analysis remained unavailable; inference was restarted successfully. Logs exposed useful failure messages without printing test secrets. Storage is disabled in the staging design; a real storage-unavailable drill is deferred until uploads are authorized. These checks do not establish a complete target-host failure/recovery rehearsal.

## 11. Backup / Restore

An isolated authenticated Mongo held database `drift_ivb_rehearsal`, collection `records`, IDs `ivb-001` (value 17) and `ivb-002` (value 29), plus index `kind_1`. `mongodump --db drift_ivb_rehearsal --archive=/backup/rehearsal.archive --gzip` wrote `/tmp/drift-ivb-backup.eExUF3/rehearsal.archive` (394 bytes), SHA-256 `7f87ed3c4c338ae345bd18d06e2eff6e9920b50da864aa6b01a21b5acd191971`, verified during the rehearsal. Both test records were deleted; `mongorestore --archive=/backup/rehearsal.archive --gzip` restored exactly both records and the index. No broad `--drop`, staging volume deletion, or production restore occurred. **The temporary archive was absent at final validation; it is not a retained backup.** Uploaded-file storage was disabled; any future GCS data needs an independent object backup and restore test. A durable staging-host/off-host rehearsal remains blocked by missing host and operator-owned backup custody.

## 12. Rollback

The [staging rollback procedure](staging_rollback.md) specifies retained image digests and matching config, frontend/backend/inference rollback, independent original-model recovery, schema/index compatibility checks, backup-first data recovery, smoke checks, and traffic containment. It excludes the rejected candidate. No staging release or actual rollback exists to rehearse yet; documentation is **PASS**, operational rollback is **BLOCKED**.

## 13. Monitoring

Docker service logs, Go JSON logs, Nginx proxy logs/headers, inference and llama logs, Mongo health, backend `/health` and `/ready`, inference `/live` and authenticated `/health`, and failure status codes provide the first-stage signals. The [minimum plan](staging_configuration.md) maps API-down, Mongo-down, inference-down, model-load failure, request failures, and restart loops to these signals. There is no deployed alert receiver, retention test, on-call owner, or restart-loop alert drill; monitoring is **defined but not verified**.

## 14. Staging Gate

The [29-criterion gate](staging_readiness_gate.md) has **17 PASS, 4 FAIL, 6 BLOCKED, 2 NOT TESTED**. `PASS` denotes only the cited local evidence, not a staging-host pass. The gate remains **NOT READY** and cannot be weakened to promote the rejected candidate or accommodate missing verification.

## 15. Remaining Blockers

1. Freeze a reviewed, clean source revision and immutable image identities; obtain remote CI evidence on that exact revision. Current HEAD excludes these changes.
2. Review and remediate applicable Go vulnerability findings for pinned Go 1.26.6 and `x/net` 0.58.0; rerun builds, tests, scan and images. The npm and Python audits alone are insufficient.
3. Specify and validate trusted proxies/client-IP behavior, dedicated TLS ingress, staging secrets and model custody without touching production data.
4. Establish Mongo index/schema compatibility and real staging backup/off-host restore, rollback and monitoring/alert rehearsals.
5. Complete an exhaustive secret/image scan and target-host model-load/failure-recovery evidence. Do not treat the local smoke as a staging deployment.

## 16. Release Candidate Decision

**RELEASE_CANDIDATE_BLOCKED.** There are concrete failed prerequisites, not merely missing measurements: the unreviewed dirty release source, nonzero Go vulnerability scan, unvalidated proxy-client-IP boundary, and unexercised schema/index rollback. The other blocked/not-tested gate rows independently prevent readiness. No commit, push, merge, tag, release, or staging/production deployment was performed.

## 17. Next Action

Resolve the listed release blockers before freezing a release candidate.
