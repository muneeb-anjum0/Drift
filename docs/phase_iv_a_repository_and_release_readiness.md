# Phase IV-A Repository and Release Readiness

## 1. Current State

Audit date: 2026-10-09. Branch `phase-3/targeted-retraining`; HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`. The worktree was already dirty when Phase IV-A began: `.gitignore`, two Phase III-J docs, 15 untracked Phase III-J/K docs, and the untracked `tools/phase3j_label_only/` package. Those changes are preserved. Phase IV-A changed only `.dockerignore`, root `README.md`, `docs/model-pipeline.md`, `docs/known-limitations.md`, and the new `docs/README.md`, `docs/model_research_status.md`, `docs/staging_readiness_gate.md`, and this report. No commit, push, tag, deployment, training, or final-holdout access occurred.

The selected original GGUF, rejected Phase III-J GGUF, and training evidence ZIP were present and SHA-256 matched their recorded identities (see [model research status](model_research_status.md)). The saved CPU-screen inventory file and Phase III-K analysis inventory file also matched their recorded hashes. The Phase III-J final payload was **not** opened or searched. Its historically documented Downloads path was absent, and no Phase III-J final file is part of the tracked project; physical custody cannot be independently certified from this workspace. Treat it as **sealed and untouched, location unverified**, not as a usable test resource.

## 2. Repository Inventory

`git ls-files` returned **956 tracked files**: `evaluation/` 551, `client/` 116, `tools/` 106, `server-go/` 101, `docs/` 58, `services/` 10, `models/` 2, and 12 top-level/CI files. The current documentation tree also has untracked Phase III-J/K records. This inventory classifies both tracked sources and relevant ignored local areas; it does not read sealed final content.

| Class | Current location / ownership | Assessment |
| --- | --- | --- |
| A. Production application | `client/`, `server-go/`, `services/inference/` | Runtime boundaries are recognizable; product authority belongs to Go. |
| B. Frontend | `client/src/`, `client/public/`, `client/nginx.conf`, `client/Dockerfile` | React/Vite UI and Nginx serving/proxy config. `client/dist/` and `node_modules/` are generated/ignored. |
| C. Go backend | `server-go/cmd/api`, `server-go/internal/`, `server-go/Dockerfile` | Auth, tenancy, persistence, workflow, and API. Go toolchain absent locally during this audit. |
| D. Inference service | `services/inference/` | FastAPI prompt/parse/normalization boundary with test file; llama.cpp is optional external runtime. |
| E. Model/runtime assets | `models/` manifests; ignored `models/gguf/`, `models/base/`, `models/adapters/`; ignored `Model/`; vendored llama.cpp checkout/build ignored | Original GGUF selected; candidate GGUF rejected. Binaries must remain out of Git and Docker build contexts except explicit runtime mounts. |
| F. Tests | `client/e2e/`, `server-go/internal/**/*_test.go`, `services/inference/test_app.py`, `tools/verification/test_*.py` | Distinct browser, unit, Mongo integration, inference, and research-contract tests. |
| G. CI/CD | `.github/workflows/verify.yml` | Software, integration, and E2E jobs. No release/deployment workflow; latest remote job state not checked. |
| H. Deployment | `docker-compose.yml`, `docker-compose.gpu.yml`, component Dockerfiles, `client/nginx.conf`, `Makefile` | Single-host local Compose with optional model/GPU override; no separate staging manifest. |
| I. Scripts/tooling | `tools/verification/`, `tools/model/`, `tools/phase3j_kaggle/`, untracked `tools/phase3j_label_only/` | Research scripts are versioned by phase; no byte-identical tracked Python duplicates found. `smoke_inference.py` and `smoke_test_inference.py` have overlapping names/roles requiring owner review before consolidation. |
| J. Research/evaluation | `evaluation/phase_*`, frozen gates/manifests, research tools | Largest tracked area; history and frozen protocols should remain traceable, not treated as deployable runtime. |
| K. Documentation | root `README.md`, `docs/`, ADRs | Previously lacked a current index/status entry point; now indexed. Historical next-action text can be stale. |
| L. Archive/evidence | ignored `archive/phase_iii_j/`, `archive/phase_iii_k/`, `archive/drift-dataset-kaggle-v5-cumulative/` | Private, large, locally preserved evidence; no deletion or Git add. Docker exclusions now cover all three. |
| M. Obsolete/duplicate/generated | `client/dist/`, `node_modules/`, `.venv/`, caches, `client/test-results/`, ignored reports | Generated output is ignored. No proven duplicate script or historical report safe for deletion; older plans are superseded instructions, not disposable evidence. |
| N. Secrets/configuration | `.env.example`, `server-go/.env.example`, ignored `.env`, Compose environment, CI example values | Examples are placeholders; local secrets not read. Basic tracked-pattern scan found no common credential marker, not proof of exhaustive secret clearance. |
| O. Local-only artifacts | GGUFs, LoRA/ZIPs, `Model/`, HF cache, reports, local Compose volumes | Their custody and reproducibility need explicit release handling; do not commit, copy into images, or assume another host has them. |

Issues found: the `Drift`/`DriftLedger`/`phase_iii_j` naming mix reflects historical phases but obscures ownership; `docs/model-card.md` and `docs/phase_iii_final_report.md` stop before the current rejection; Phase III-J interim proposals/results describe actions later superseded; old evaluation criteria are not current label-only gates. Many historical links point into ignored `archive/` and resolve only on a custodian's machine; that is a portability/custody issue, not a reason to delete evidence or invent replacement data. Research experiment directories are historical, not demonstrably abandoned or safe to remove. No tracked final-holdout payload or obvious committed real secret was identified by this scoped audit. Generated files are ignored, while private archives and model binaries should **never** be committed.

## 3. Target Structure

Preserve the current domain-separated layout. A wholesale `apps/`/`internal/`/`tests/` move would break build contexts, import paths, CI, and many frozen evidence references without a demonstrated benefit. The target is:

```text
client/                  browser app, UI build, browser tests
server-go/               authoritative API and Go tests
services/inference/      inference adapter and its tests
models/                  tracked manifests; ignored local binaries
tools/                   verification and phase-scoped research tooling
evaluation/              frozen protocols and tracked evaluation metadata
docs/                    current index, operations, decisions, historical reports
archive/                 ignored private source/evidence custody
.github/                 CI; future release automation if separately designed
docker-compose*.yml      local single-host topology; staging definition still needed
```

No file move is proposed for Phase IV-A. The reason is reference stability: frozen hashes, package paths, docs, CI, and model runtime paths currently depend on these locations. A later owner-reviewed change may (1) place new staging configuration under a dedicated `deploy/` directory **because** local and staging must not share implicit settings, and (2) separate new release evidence from historical `archive/` **because** release artifacts need explicit custody. Neither move is authorized or performed here.

## 4. Documentation State

The root [README](../README.md) now explains the engineering system and authority boundaries with a Mermaid diagram. The new [documentation index](README.md) routes current architecture, setup, authorization/security, tests, operations, model runtime, and historical evidence. [Model research status](model_research_status.md) is the single current entry point for the frozen decision. The [staging gate](staging_readiness_gate.md) is objective and evidence-based. [Model pipeline](model-pipeline.md) now states its non-authorization boundary, and [known limitations](known-limitations.md) no longer presents Phase III as the next active phase. No historical report was rewritten or deleted.

Current authoritative docs are the architecture, local development/configuration, security/ADRs, verification, operations, status, and gate documents **within their stated scope**. Historical Phase II/III reports are evidence; Phase III-J plans/runbooks and the unapproved label-only final-gate translation are superseded as active instructions. `docs/model-card.md`, `docs/phase_iii_final_report.md`, `docs/model-acceptance-criteria.md`, and some “next phase” language are dated and should point to the current status when next revised. `docs/firebase_setup.md` is incomplete for a real hosted staging credential/permission review. No byte-identical documentation duplicate or safe obsolete deletion was established. See the index for document-by-document routing.

## 5. Model Research Freeze

**FROZEN.** Keep existing original GGUF SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. The Phase III-J candidate SHA-256 `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f` failed its matched CPU development screen on three conjunctive criteria and is research-only. Phase III-K concluded `NEW_DATA_ONLY_PHASE_JUSTIFIED`; the current reviewed development set is closed for future tuning. The sealed final is untouched. New independent, consistently adjudicated data and a separate decision would be required before any further model research; this phase grants none. The application still has the historical four-field inference contract. Classification is a model suggestion; parsing is FastAPI/inference; product rules, persistence, authorization, workflow, display, and scoring remain outside model authority.

## 6. Configuration / Secrets Review

Tracked `.env.example` and `server-go/.env.example` contain example/placeholder configuration, not observed real credentials. Local `.env` exists and is ignored; its contents were not read. Git tracks no `.env`, private key, or service-account JSON by their expected names. A basic tracked-file marker scan for common credential patterns found no matches; a full secret and image-layer scan remains required. `.gitignore` already excludes GGUFs, archives, credentials, caches, and generated outputs; Phase IV-A additionally excluded `archive/phase_iii_k/` and the cumulative Kaggle archive from Docker build context alongside the existing Phase III-J exclusion. The pre-existing `.gitignore` Phase III-K line was not altered by Phase IV-A.

Go configuration fails startup when required JWT or internal inference key is absent/weak/default. Compose sets empty defaults for those variables, so operators must supply independent values. `MONGO_URI` is a local internal `mongodb://db:27017`; hosted authentication/TLS has not been specified. Firebase/GCS is optional and disabled by default; when enabled it requires a bucket and application credentials, with custody/permissions unverified. `DRIFT_GGUF_MODEL_PATH` defaults to the original model inside `/app/models/gguf/`. Local Compose hardcodes `CLIENT_URL=http://localhost:5173`, serves the frontend on host port 5173, and sets `APP_ENV=production` even for local use. This is **not** a staging/prod environment separation. Required/optional variables are described in [configuration](configuration.md); target-specific values must be documented without exposing secrets.

## 7. Build / Runtime Review

`Makefile` supplies `setup`, `run`, `verify`, integration/E2E, and separate model commands. The frontend production build, lint, and typecheck passed locally. Nine FastAPI inference tests passed. Both CPU and GPU Compose configurations parsed. A local backend `/ready` response and llama.cpp `/props` for the original GGUF were observed, but this was not a fresh full-stack release build or staging model-load test. Go 1.26.6 is required by the module/CI; no `go` executable was on this host's PATH, so local Go build/vet/unit results remain unverified. No broad Docker rebuild was launched.

The default Compose stack starts frontend, backend, inference, and MongoDB **without** the optional llama profile. The backend and inference bind host loopback; the frontend binds host port 5173 on all interfaces. The llama image is tagged `server-b11151` and mounts `./models` read-only. Mongo uses a named local volume. The GPU override requests NVIDIA hardware but has not been exercised as a release path. Model file presence, startup ordering, memory, and availability on another host are manual dependencies. Cloud storage and recovery behavior were not validated here.

## 8. Test Inventory

| Suite | Authoritative command/source | Phase IV-A observation |
| --- | --- | --- |
| Frontend static/build | `npm run lint`, `npm run typecheck`, `npm run build` | All passed locally; build wrote ignored `client/dist/`. |
| Go formatting/vet/unit/build | `.github/workflows/verify.yml`; `make verify` | Not run locally (`go` unavailable); current CI status not inspected. |
| Mongo integration, including auth/tenant invariants | `MONGO_TEST_URI=... make test-integration`; `server-go/internal/integration/` | Exists; not rerun against disposable Mongo. |
| Inference unit/contract | `.venv/bin/python -m pytest -q services/inference/test_app.py` | 9 passed locally; one dependency deprecation warning. |
| Research verifier tests | `tools/verification/test_*.py`; selected files in CI | Inventory exists; not rerun wholesale. Freeze evidence is not release acceptance. |
| Playwright E2E | `npm run test:e2e`; `client/e2e/` | Exists and has CI job; not rerun locally or in staging-like configuration. |
| Security/auth tests | Go/inference tests, CI, manual staging negative tests | Some code coverage exists; full current auth/tenant and external-exposure pass unverified. |
| Backup/restore and failure recovery | [Operations](operations.md), integration tests, manual drills | Procedures and some historical local checks exist; no fresh staging-equivalent backup/restore or dependency-failure drill. |

No test was declared flaky based only on name or an absent run. Tests requiring Mongo, Docker, browser dependencies, cloud credentials, or model hardware have infrastructure prerequisites; do not classify a missing result as a pass. The workflow uses Node 22, Go from `server-go/go.mod`, Python 3.13, and Mongo 7; current CI status must be retrieved for a release revision.

## 9. Deployment Assumptions

The repository assumes local/single-host Docker Compose. Nginx serves the React build and proxies `/api/` to Go; Go calls internal FastAPI; FastAPI may call llama.cpp; Mongo persists to a Compose named volume. The optional model profile uses a local GGUF mount and CPU by default; `docker-compose.gpu.yml` adds an NVIDIA path. Optional Firebase/GCS storage is a backend integration, not evidence that the UI is deployed on Firebase Hosting. No Railway, managed cloud VM, external Mongo, public TLS reverse proxy, or production hosting platform is configured or verified. Choosing one is future design work, not a Phase IV-A inference.

## 10. Staging Readiness Gate

The [gate](staging_readiness_gate.md) is **NOT READY**. Narrow local checks passed, but the release revision is not clean/frozen, full CI and Go/integration/E2E results were not established, staging-specific config/secrets/TLS/data custody are undefined, and backup/restore/rollback/monitoring have not been exercised. Every required gate row needs reproducible evidence; no research result or local health probe substitutes for deployment validation.

## 11. Blockers

1. **Critical — release source and artifact identity:** dirty worktree and untracked research deliverables; decide what belongs in a reviewed release revision without losing evidence. No uncommitted file may be an implicit deployment dependency.
2. **Critical — staging topology/security:** create a separately reviewed staging configuration, secret custody, ingress/TLS/origin policy, Mongo authentication/isolation, and private model mount. Local Compose cannot be exposed as-is.
3. **High — complete release verification:** run green CI, Go build/vet/unit, Mongo integration including auth/tenant invariants, Playwright E2E, inference contract/negative tests, and target model-load checks on the exact release revision.
4. **High — data safety and recovery:** define schema/index change strategy, durable volume or external Mongo policy, backup/restore rehearsal, retention, and rollback/recovery objectives.
5. **High — operational proof:** meaningful dependency readiness, logging/monitoring/alerts, restart and failure drills, resource limits, and operator ownership.
6. **Medium — evidence portability and documentation:** ignored archive links require custodian access; date older Phase III documents and clarify interim statuses; review overlapping smoke-script names before any deduplication. The Phase III-J final location cannot currently be independently verified and remains outside all staging work.

## 12. Recommended Cleanup

Only low-risk cleanup was made: authoritative status/index/gate/report docs, root README, two current-doc status pointers, and Docker-context exclusions for two private archives. Keep existing `.gitignore` and research edits intact. Next, review old docs for a concise “historical/superseded” pointer, resolve any broken links without moving evidence, and distinguish generated local output from tracked source in onboarding instructions. Do **not** delete scripts, archives, models, or reports based on apparent duplication; do not move frozen paths without a reference/provenance plan. Do not change the runtime or production four-field API under a documentation cleanup label.

## 13. Recommended Next Phase

Resolve the staging-readiness blockers in priority order before deployment. Freeze and review a source revision, design a separate staging topology and secret/data custody, run the complete test and security suite, rehearse backup/restore and failure recovery, then request controlled staging authorization. Deployment, operational validation, and production hardening are later phases; no such action is authorized by this report.
