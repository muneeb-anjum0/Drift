# Verification Guide

Drift separates ordinary software verification from model-quality evaluation. Standard verification never downloads or starts model weights.

## Command surface

Run `make setup` once on a machine with Node 22, Go 1.26, Python 3.13, Docker, and Docker Compose. Then use:

| Command | Purpose |
| --- | --- |
| `make run` | Build and start MongoDB, inference wrapper, backend, and frontend without llama.cpp. |
| `make lint` | ESLint, Go formatting/vet, and Ruff checks. |
| `make test` | Go unit tests and model-independent inference tests. |
| `MONGO_TEST_URI=mongodb://127.0.0.1:27017 make test-integration` | Real-Mongo tenant, authorization, concurrency, and cascade invariants. |
| `make test-e2e` | Playwright user journeys against a running stack. |
| `make build` | Frontend, Go, Python syntax, and Compose configuration checks. |
| `make verify` | Standard non-model pull-request verification, including dependency scans. |
| `make model-smoke` | Explicit real-model smoke test; requires a running model profile. |
| `make model-eval` | Explicit model-quality evaluation; never part of standard CI. |

`make verify` assumes `make setup` has created `.venv`. Model commands are intentionally separate.

## Verification matrix

| Domain | Existing executable evidence | Important remaining gap | Risk |
| --- | --- | --- | --- |
| Authentication | Strict JWT unit tests; middleware integration tests for missing, malformed, valid, and nonexistent users | Browser token remains in localStorage | Medium for public hosting |
| Authorization | Role policy tests and real-Mongo viewer/owner API checks | No membership-management feature exists to test | High, covered for current routes |
| Tenant isolation | Real-Mongo cross-tenant GET/PATCH/DELETE tests with valid IDs | Expand whenever new tenant-owned routes are added | High, covered for representative resource paths |
| Baselines | Real-Mongo 12-way concurrent creation, unique index, snapshot completeness | Standalone Mongo cannot make all collections transactional | High, retry semantics accepted |
| Approvals | Transition unit tests and concurrent approve/reject integration test | Injected database failure after transition is not simulated | High, atomic state/history update covered |
| Cascades | Real-Mongo complete and repeated project cascade test | Storage failure uses unit-level behavior unless test GCS exists | High, database path covered |
| Files | Content spoof, size, empty/name, and DOCX-structure tests | Real isolated GCS/Firebase bucket unavailable | High, cloud path unverified |
| Inference boundary | API-key, input-bound, timeout, connection, and hostile-output tests | Actual model quality is separate | High, software contract covered |
| Health/readiness | Runtime probes and Compose health checks | External monitoring is deployment-specific | Medium |
| Frontend workflows | Auth guard, registration, project creation, requirement/baseline flow, unavailable-model state | Full approval UI journey remains valuable | Medium |
| Configuration | Fail-closed config tests and Compose validation | Hosted-production cookie strategy is undecided | High, current local deployment documented |
| Deployment | Container builds, health checks, non-model E2E CI | No staging environment or public TLS deployment | Medium |

## Failure contracts

- Mongo unavailable: backend liveness remains available, readiness returns `503`, database-backed operations fail, and readiness recovers after Mongo returns.
- Inference wrapper unavailable: backend readiness stays healthy because inference is optional to the rest of the product; drift inference returns an explicit failure and is not saved.
- Model unavailable: inference liveness remains `200`, model readiness is `503`, and unrelated product flows remain usable.
- Storage unavailable: upload/delete fails rather than reporting false success. Metadata is retained when object deletion fails; uploaded objects are compensated when metadata insertion fails where possible.

## CI boundaries

`.github/workflows/verify.yml` runs three independent jobs:

1. software lint, type checking, builds, unit tests, audits, and Compose validation;
2. Mongo-backed invariant tests against a disposable database;
3. full-stack Playwright tests with no llama/model container.

Actual model evaluation is intentionally excluded because it requires large local artifacts and potentially a GPU. A mocked llama boundary proves software handling, not model quality.

## Accepted and unverified debt

- `localStorage` JWT storage is accepted only for the current local/FYP/demo deployment. Public hosting requires a coordinated HttpOnly/Secure/SameSite cookie and CSRF design.
- Rate limiting is per backend process. Multi-instance deployment requires shared enforcement or a gateway.
- Cascades are retry-safe, not cross-collection transactional, while standalone Mongo remains intentional.
- GCS/Firebase integration is **UNVERIFIED** without credentials and an isolated test bucket. Never test against a production bucket.
- The unused OpenPGP transitive advisory is not imported or reachable; revisit when its upstream dependency provides a fix.
- Model artifact construction, runtime quality, and expanded evaluation are **UNVERIFIED** in this pass because the model was not run locally.

## Adding routes safely

Every new tenant-owned endpoint should add an authorized case, unauthorized-role case, non-member/cross-tenant case, and unauthenticated case. Any new model-generated field must be validated before persistence.
