# Phase II Engineering Evidence

Date: 2026-09-30. Environment: local Linux development laptop, Docker Compose, model profile stopped.

## Baseline audit classification

| Reported claim | Classification | Evidence |
| --- | --- | --- |
| JWT and backend-to-inference authentication, fail-closed secrets | VERIFIED | Source audit, JWT/config tests, Mongo-backed middleware tests, runtime `401` probe |
| Role/capability authorization | VERIFIED | Policy tests plus authenticated viewer/owner/cross-tenant API matrix |
| Atomic baseline numbering and approval decisions | VERIFIED | Unique index and repeatable real-Mongo concurrency tests |
| Retry-safe project/workspace cascades | VERIFIED | Real-Mongo complete/retry tests and injected storage-failure test |
| File content/size/DOCX controls | VERIFIED at unit boundary | Expanded content tests; real GCS remains unverified |
| Liveness/readiness and container health | VERIFIED | Runtime stop/restart probes and healthy Compose services |
| Dependency remediation | VERIFIED for reachable software paths | npm audit, pip-audit, and govulncheck executed |
| Existing frontend E2E | VERIFIED and expanded | Four Playwright journeys pass |
| Model inference and quality | UNVERIFIED | Deliberately not run; llama container remained stopped |
| Public-production readiness | UNVERIFIED | No hosted TLS/staging deployment or real GCS exercise |

## Changes made

- Added GitHub Actions software, Mongo integration, and no-model E2E jobs.
- Added `Makefile` commands for setup, run, lint, test, integration, E2E, build, verify, model smoke, and model evaluation.
- Added ESLint, Ruff, pytest, pip-audit, pinned direct Python runtime dependencies, and relevant documentation.
- Added real-Mongo security/integrity tests covering authentication, role restrictions, valid cross-tenant IDs, baseline concurrency, approval races, cascade retries, and storage-delete failure.
- Added FastAPI tests for service credentials, request bounds, hostile model output, timeout, connection failure, and valid responses.
- Tightened both FastAPI and Go model-output validation. Invalid or incomplete generated structures cannot proceed to product analysis.
- Expanded Playwright through requirement and baseline creation and the stopped-model error state.
- Excluded `Model/` and `.venv/` from Docker build context.

## Commands and passing results

```text
npm run lint                         PASS
npm run typecheck                    PASS
npm run build                        PASS
npm audit --audit-level=high         PASS, 0 vulnerabilities
python -m pytest ...                 PASS, 8 tests
ruff check services/inference tools  PASS
pip-audit -r requirements.txt        PASS, no known vulnerabilities
go test -count=1 ./...               PASS, including Mongo integration
go vet ./...                         PASS
govulncheck ./...                    PASS, 0 reachable vulnerabilities
docker compose config --quiet        PASS (CPU and GPU configurations)
docker compose build ...             PASS
npm run test:e2e                     PASS, 4 tests
git diff --check                     PASS
```

Runtime results:

- frontend `200`; backend live `200`; backend ready `200`;
- protected projects route without JWT `401`;
- inference live with internal key `200`;
- model readiness `503`, expected because llama is stopped;
- frontend/backend/inference/Mongo containers healthy; llama running count `0`;
- security headers observed in actual backend responses;
- backup/restore sentinel count after restore `1`;
- Mongo stop: backend live `200`, ready `503`; after restart ready `200`;
- inference stop: frontend and backend ready remained `200`; inference recovered to `200` after restart.

## Failing results encountered

Two initial Playwright assertions were ambiguous because text locators matched multiple elements. A third expected the wrong error phrase. The locators were made exact and aligned with the observed user-facing failure contract; the full suite then passed. No current required check is failing.

The Python test run emits one dependency-level Starlette warning about its TestClient transport. It does not affect test results or application runtime.

## Newly discovered issues

- The Go inference client previously relied too heavily on FastAPI validation and normalized some invalid values. It now independently enforces the response contract.
- The storage implementation was concrete, blocking deterministic failure injection. A narrow interface now enables recovery-semantics testing without changing runtime architecture.
- The Docker build context did not explicitly exclude the recovered top-level `Model/` directory. It now does.
- Existing frontend code had seven lint findings and model tools had four unused imports; all were resolved.

## Unverified and deferred

- Actual model artifact reconstruction, checksums, runtime inference, quality baseline, expanded quality dataset results, and model latency.
- Real Firebase/GCS upload, delete, URL authorization, and compensation against an isolated bucket.
- Hosted deployment, TLS/proxy behavior, external monitoring, and staging smoke tests.
- The GitHub-hosted workflow and branch-protection enforcement remain unverified until this change set is pushed and the workflow runs remotely.
- Full authenticated mutation-load benchmarks; current measurements cover bounded non-model probes only.
- All-container non-root execution. Existing capability/read-only controls remain, but the backend report bind mount and upstream images require a coordinated runtime-user change.
- LocalStorage JWT, process-local rate limits, standalone-Mongo retry semantics, and the unreachable OpenPGP transitive advisory remain accepted debt as described in `docs/verification.md`.

## Recommended next priority

Run the separately documented model artifact/evaluation workflow on suitable hardware, capture artifact checksums and evaluation provenance, and only then address quality findings. If hosted deployment becomes the goal, the next software priority is coordinated cookie/CSRF authentication and an isolated real-GCS integration environment—not additional infrastructure for its own sake.
