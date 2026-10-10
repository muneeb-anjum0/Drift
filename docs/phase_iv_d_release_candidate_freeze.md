# Phase IV-D Release Candidate Freeze

## 1. Status

This is a reviewed source-scope and local-verification record, **not deployment authorization**. The immutable revision is the commit containing this report; check `git rev-parse HEAD` on `release/phase-iv-d-candidate` and the PR checks for its remote-CI result. The commit cannot embed its own SHA. Do not infer remote-CI success or target-host readiness from this committed record.

## 2. Starting State

Started on `phase-3/targeted-retraining` at `88e81355688ad2daf21ffcc7fac95d26823477ca`, with 22 modified and 42 untracked entries, zero staged files. The selected original GGUF matched SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. The rejected Phase III-J adapter remains research-only. The final holdout was not sought, read, or restored. Existing ignored model, archive, virtualenv, and local-secret material was left in place and not staged.

## 3. Worktree Classification

Every starting entry was classified before staging. The exact included paths are in the [manifest](release_candidate_manifest.md) and the three scoped commits; no blanket `git add` was used.

| Class / disposition | Starting entries |
| --- | --- |
| A — historical Phase III reports/provenance, retained deliberately | `docs/model_research_status.md`, the 15 new `docs/phase_iii_j_*.md` and `docs/phase_iii_k_post_rejection_analysis.md`, plus edits to `docs/phase_iii_e_development_report.md`, `docs/phase_iii_j_baseline_outcome.md`, and `docs/phase_iii_j_probe_runbook.md`. Interim plans remain explicitly historical, not renewed training authority. |
| B — Phase IV/current documentation, retained | `docs/phase_iv_a_repository_and_release_readiness.md`, `docs/phase_iv_b_release_candidate_readiness.md`, `docs/phase_iv_c_release_blocker_remediation.md`, manifest, five staging runbooks, readiness gate, and this report. Historical A/B/C reports are evidence, not current staging approval. |
| C/D — production source and security/runtime fix, retained | Go config/proxy/CORS/security/router/Mongo edits; Go toolchain and module lock; frontend dependency lock. The production impact is fail-closed proxy trust, development-only localhost CORS, direct-TLS-only HSTS, and deterministic Mongo index checking. No model or research gate changes. |
| E/F — staging configuration and test/tooling, retained | Staging env example, Compose overlays, ingress template, CI workflow, Playwright config, Go schema checker/tests, staging env/ingress tests, and backup script. Templates contain placeholders only and remain undeployed. |
| B/F — repository navigation and build-context control, retained | Root and docs READMEs, development/limitations/model-pipeline docs, `.gitignore`, `.dockerignore`. |
| H — local-only research tooling, excluded | All 11 untracked files in `tools/phase3j_label_only/` are preserved unchanged under a local `.git/info/exclude` rule and omitted from Docker build context. They are not required by staging; a separate research-provenance decision may track them later. |
| G/H — generated/private, excluded | Ignored GGUF, adapters, Kaggle/CPU-screen evidence, archives, `.env` files, local virtualenv, Node dependencies, build/browser outputs, and synthetic backup artifacts. No payload was removed. |

The new historical Phase III plans are retained because later decision documents link to them; they are candidates for *navigation* consolidation, not deletion of evidence. Phase IV-A/B/C reports similarly remain as dated status history. The conversion-environment report contains a historic machine path as an identity record; it is not a portable setup instruction. All 34 changed/new Markdown files had valid relative links at the local verification point.

## 4. Final Release Scope

The three-commit boundary is (1) Phase III model decision/provenance, (2) repository documentation and ignore controls, (3) staging/security source, configuration, tests, operations, and Phase IV-B/C/D evidence. No GGUF, adapter, archive, private reviewed case, final-holdout payload, real `.env`, certificate, or credential belongs in the commit or image context. The base branch already contained six earlier Phase III commits not on `origin/main`; PR reviewers must inspect the *full* PR diff, not only these three new commits.

## 5. Local Verification

| Check | Result |
| --- | --- |
| `npm ci`, lint, typecheck, production build | PASS; 243 packages installed, build completed. |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities. |
| Containerized Go **1.26.9** `gofmt`, `go vet ./...`, `go test -count=1 ./...`, production build | PASS. |
| `govulncheck@v1.1.4 ./...` | PASS; 0 reachable/imported-package vulnerabilities, 1 uncalled module-level advisory remains visible. |
| Isolated authenticated Mongo integration and schema tests | PASS: `go test -count=1 ./internal/integration ./internal/database`. |
| Python import/dependency and test suite | `pip check` PASS; 96 tests PASS with one upstream Starlette deprecation warning. First-party Ruff PASS with the ignored local third-party llama vendor tree excluded; a clean CI checkout has no such vendor tree. |
| `pip-audit --requirement services/inference/requirements.txt` | PASS; no known vulnerabilities. |
| Isolated deployable Compose image build + Playwright | PASS; frontend/backend/inference built and healthy; 4/4 browser scenarios passed against the isolated model-unavailable test stack. |
| Staging Compose + static configuration/ingress | PASS; Compose renders with config-only placeholder values; staging checker/ingress tests are included in the 96 Python passes. A real staging preflight remains blocked by absent target secrets/model copy and cannot be represented by config rendering. |
| Synthetic Mongo backup/restore | PASS locally: inserted `_id=ivd-synthetic,value=42`, archived, mutated to 99, restored with `--drop --stopOnError`, then verified exact value 42 and `_id_` index in isolated `drift-ivd-mongo`. Prior retained Phase IV-C backup and A→B→A orchestration evidence remain intact. No off-host backup was tested. |
| Security/build-context, links, model SHA | Common private-key/token marker scan found no matching source file; `.dockerignore` excludes models, archives, local research tooling and secrets. 34 changed/new Markdown files had zero missing relative links. Original GGUF SHA matched the pinned value. Marker scans are not exhaustive. |

The local Ruff exclusion does not weaken CI: CI checks the entire first-party `tools` tree on a clean checkout. The local ignored `tools/model/vendor/llama.cpp` tree is a third-party checkout, absent from Git and the CI checkout. No tests or gates were weakened. No container CVE/SBOM scanner was configured; that check remains `NOT TESTED`.

## 6. Commit Structure

1. `e5ea2de3175605f830f9e8eb44c028c460aa5837` — Phase III research freeze/provenance, 19 documentation files.
2. `80f100f9b1a7e86c6b78c9207938b22a06d95665` — repository/docs consolidation, 8 files.
3. The commit containing this report — staging/security/release hardening. Its exact SHA is recorded by the PR/CI handoff, not in self-referential committed content.

For each commit, exact files were staged explicitly; the staged diff and `git diff --cached --check` were inspected. No force push, tag, merge, or deployment is authorized by this report.

## 7. Release Candidate Revision

Branch: `release/phase-iv-d-candidate`. Baseline: `88e81355688ad2daf21ffcc7fac95d26823477ca`. The authoritative immutable candidate identity is `git rev-parse HEAD` after commit 3; PR checks must reference *that exact SHA*. Application image digests are not target-host release digests and remain a separate staging prerequisite. A clean local worktree is required before pushing.

## 8. Remote CI

Remote `Verify` checks are `software`, `integration`, and `e2e`. This committed record is intentionally pre-CI and does not mark any check green by assumption. Verify run URL, exact SHA, conclusions, and branch-protection requirements live on the PR. If CI fails, diagnose and correct without weakening a test; a correction creates a new exact revision and requires rerun.

## 9. Staging Gate

See [the gate](staging_readiness_gate.md). The local Phase IV-D review removes the old *dirty/unreviewed worktree* cause only when the third commit exists and the branch is clean. Remote CI changes to `PASS` only from live checks on the exact SHA. Host-dependent rows do not change from local verification. The gate is still **NOT READY for deployment**.

## 10. Remaining Host-Dependent Blockers

Dedicated target host, public TLS/DNS/firewall validation, separate original-model custody and load, real staging secrets, retained image digests, actual off-host backup/retrieval, alert owner/delivery/retention, and target-host rollback are unresolved. Container CVE scanning remains untested without an approved scanner. Initial staging remains synthetic-only with uploaded-file storage disabled.

## 11. Decision

This source record is *pending remote CI*. `RELEASE_CANDIDATE_FROZEN` may be declared in the Phase IV-D handoff only after the exact pushed SHA has clean `software`, `integration`, and `e2e` checks and no release-content defect remains. It does **not** mean staging readiness or deployment approval. If CI is unavailable, the decision is inconclusive; if a required check fails, blocked.

## 12. Next Action

Review the full PR diff and exact-SHA CI evidence. If all required checks pass, request separate authorization for controlled target-host staging deployment and operational validation. Do not deploy during Phase IV-D.
