# Phase IV-G Local Distribution Readiness

**Target: `LOCAL_FIRST_DISTRIBUTION`.** This report is about a private localhost installation, not public staging or production. The original GGUF remains the only supported model; the Phase III-J candidate is research-only. Phase III is frozen and the final holdout was not used.

## 1. Source

The frozen starting `main` was `3fa0f61004cea771c116590516646a00589463c8`. A fresh GitHub clone resolved to that SHA with no `.env`, `node_modules`, virtualenv, or GGUF. It could render Compose but its hard-coded container names collided with another installation and its frontend published on all host interfaces. PR #26 merged normally at `92982bbbdff95d1b0bdb0ab644dac49b6f280e14` on 2026-10-11. Its exact-head software, integration, and E2E jobs passed, as did the post-merge jobs on that `main` SHA. Local `main` matched `origin/main` with a clean worktree. The rejected model and sealed holdout were not used.

## 2. Supported Runtime

The measured runtime is Linux x86-64, Docker Engine 29.8.1, Compose 5.5.1, 15 GiB physical RAM plus 8 GiB swap. Normal installation needs Git and Docker/Compose; Go, Node, Python, MongoDB, and llama.cpp are built or run in containers. Windows Docker Desktop/WSL and macOS have not been tested. The optional GPU overlay uses Compose `!override` and therefore needs Compose v2.24.4+; normal CPU/core Compose does not use that feature.

## 3. Clean Clone

The candidate was cloned anew from GitHub into a temporary directory and checked at its exact branch SHA. No existing repository-local `.env`, dependencies, model, or Mongo volume was copied. An ignored mode-0600 `.env` was made from `.env.example` with two different 64-character random secrets, a unique Compose project, and alternate loopback UI/API ports. `docker compose up -d --build --wait db inference backend frontend` built three app images and reached all container health checks in **1m16s**. Docker base/build layers were warm, so this is not a cold-network download benchmark. The clone used no host Go/Node/Python installation for runtime. Browser test dependencies were installed only for verification.

After merge, a second fresh GitHub clone resolved to `92982bbbdff95d1b0bdb0ab644dac49b6f280e14`, initially clean and without `.env`, `node_modules`, virtualenv, or GGUF. An independently generated ignored mode-0600 `.env` used a separate Compose project and loopback ports 5177/5007. The same Compose command built and reached healthy core services in **40 seconds** with warm Docker layers. Its model-free Chromium E2E suite passed **4/4**. The test stack was then stopped without deleting its Mongo volume. The original-GGUF CPU smoke was already completed in the first independent clone of the exact PR head later merged unchanged; it was not repeated on the laptop after the user's power-safety instruction.

## 4. Configuration

`.env.example` is the sole normal local template. JWT and inference keys are required and fail closed; the setup guide gives a random-value command. Model, GPU, file storage, rate limit, project name, and port settings are separate optional/advanced settings. Secrets, model files, and backups remain outside Git. Staging config remains an explicitly separate, future public-host concern.

## 5. Model-Free Startup

Frontend `/` returned 200; Go `/health` and `/ready` returned 200; authenticated inference `/live` returned 200 and its model `/health` correctly returned 503 with no GGUF. All four existing Chromium E2E tests passed, including registration, project/requirement/baseline creation, and an unavailable-inference error with no saved fabricated analysis. The core app was usable without weights.

## 6. Model Setup

The original GGUF is 4,683,074,112 bytes. Its source and ignored clean-clone copies both hashed to `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. It was placed at `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`. CPU llama startup loaded it; after restarting inference (required when the adapter first started without the file), authenticated model `/health` changed to 200. A synthetic CSV→PDF addition returned HTTP 200 and label `added` in 21.02 seconds. This is a smoke test, not model-quality evaluation. No public download URL is asserted; users need authorized custody of the original file.

## 7. Networking

The candidate's rendered Compose config published only frontend and backend on `127.0.0.1`. Mongo, inference, and llama.cpp had no host port bindings. Fixed `container_name` entries were removed so two installations can use distinct Compose project names. The browser calls Go through the frontend proxy. Host/Docker-socket control remains outside Drift's threat model.

## 8. Functional Workflow

On the isolated candidate clone, a real browser registered a synthetic user, created a project and requirement, established baseline version 1, ran a synthetic model-backed analysis, saved it, generated and saved a change request, then reopened a new browser session and logged back in to find the request. A second synthetic user got HTTP 403 for the first user's project; an anonymous call got 401. No customer or research-corpus data was used.

## 9. Persistence

After the initial model-free E2E run, `docker compose down` followed by `docker compose up -d --wait db inference backend frontend` preserved the complete synthetic Mongo collection snapshot: SHA-256 `d90299b9d5d825e88244f09736e454eb4021d92c37d0e14a4f7ab9136b0e4304` before and after. This exercised recreation of containers/network without deleting the named volume. A physical host reboot was not performed; the same stop/start path is the local equivalent tested here.

## 10. Backup / Restore

`mongodump --archive --gzip` created a 2,501-byte local archive of 20 synthetic documents, SHA-256 `1e728fedbc7319176360a51b8cc0a0c35c7681d21b11c29bf508f44ef15d6491`. With app writes stopped, one synthetic requirement was deleted, then `mongorestore --drop --nsInclude='driftledger.*'` restored all 20 documents and indexes with zero failures. The full collection snapshot returned to the pre-backup SHA. The archive stayed outside Git and the checkout. Default uploaded-file storage is disabled; external file storage would need its own backup.

## 11. Update / Reset

The candidate clone pulled branch revision `ec2d9a4` by `git pull --ff-only` and ran `docker compose up -d --build --wait ...`. The synthetic collection snapshot stayed byte-identical at SHA-256 `63c9eefa15fa8d78ca4980d211da5ae5a9543e7e63bd29aa9d3ce329fb7cff6d`. This was a non-schema update; compatibility across a future schema migration is not claimed. `docker compose down` preserves data, whereas `down --volumes` is documented as destructive. No destructive volume reset was performed.

## 12. CPU / GPU

CPU model load and synthetic inference passed before the user's later power-safety instruction. At idle after inference, observed llama memory was about 3.59 GiB under its 7 GiB container limit, with inference about 41 MiB. These are measurements on this host, not universal minimums; model-enabled use needs materially more memory/disk than the core app. The host has an NVIDIA GTX 1060 Max-Q (6 GiB) and NVIDIA Docker runtime. The prior GPU override still passed `--device none` and zero GPU layers; the candidate override removes that CPU-only flag and defaults to 16 layers. The CUDA container image was pulled and the original model reported loaded, but **no GPU synthetic inference or offload verification was completed**. The user reported laptop power-delivery concerns and instructed us not to use the GPU. The GPU test and both synthetic test stacks were stopped without deleting volumes. GPU mode remains **NOT TESTED** as an end-to-end route and is not required for CPU/core local readiness.

## 13. Security

The local network bindings were checked from rendered Compose and running containers. The inference endpoint requires its separate backend key; JWT is required by Go; tenant and anonymous access were rejected as above. A local user with host/Docker authority can still inspect `.env`, volumes, and containers. The stack is not a hardened public deployment. No final-holdout or candidate-model artifact was mounted.

## 14. Documentation

The root README now gives a short Docker-first quick start and points to [one local setup guide](development.md). That guide covers secrets, model-optional/model-enabled startup, CPU/GPU, data-preserving stop, backup/restore, update, destructive reset, and troubleshooting. The historical [server staging gate](staging_readiness_gate.md) remains intact; DNS, public TLS, VPS, and public ingress are explicitly `NOT_APPLICABLE_TO_LOCAL_RELEASE`, not silently passed.

## 15. Local Release Gate

| Local criterion | Status | Evidence / gap |
| --- | --- | --- |
| Clean reviewed `main` and required exact-head CI | PASS | PR #26 merged at `92982bbb…`; software, integration, and E2E passed on both PR head and resulting `main`; local main matched origin. |
| Fresh clone without hidden host-language/runtime artifacts | PASS | Isolated GitHub clone and Compose build/start; base Docker layers warm. |
| Safe local configuration and ignored secrets | PASS | Two independent random values, mode-0600 `.env`, no Git inclusion. |
| Model-free core app and explicit model-unavailable behavior | PASS | Health split and Chromium E2E 4/4. |
| Original GGUF identity and CPU model load | PASS | Exact SHA, model health 200, synthetic inference 200. |
| Normal restart preserves data | PASS | Collection snapshot SHA unchanged after `down`/`up`. |
| Local backup and exact restore | PASS | Archive/checksum, deletion, 20-document/index restore, snapshot SHA match. |
| Local network/auth/tenant boundaries | PASS | Only loopback UI/API; internal ports absent; cross-tenant 403; anonymous 401. |
| Safe non-schema update and explicit reset boundary | PASS | Fast-forward update retained snapshot; destructive reset documented. |
| Authoritative test suites | PASS | Local frontend, Go, inference, Compose, and browser checks passed; exact-head and post-merge CI software/integration/E2E passed. |
| Accurate clone/run documentation | PASS | README and consolidated local setup guide matched a second fresh merged-main clone. |
| Windows/macOS portability | NOT TESTED | Not claimed as supported; Linux x86-64 is measured. |
| Optional NVIDIA GPU inference | NOT TESTED | Stopped at user's power-safety request before synthetic inference/offload verification; not a CPU/core gate. |

Public-host-only DNS/TLS/firewall/VPS/ingress, off-host *staging* backup, and target-host rollback are `NOT_APPLICABLE_TO_LOCAL_RELEASE`. They remain unpassed in the historical staging record.

## 16. Decision

**LOCAL_DISTRIBUTION_READY for the verified Linux x86-64 Docker Compose path.** The merged source, post-merge CI, second fresh-clone model-free startup, first fresh-clone original-model CPU smoke, product workflow, persistence, backup/restore, local boundaries, and documentation satisfy the local gate. Windows/macOS and end-to-end NVIDIA GPU operation are **NOT TESTED** and are not claimed as supported. No further model test was run after the user's power-safety instruction. This decision does not authorize public deployment, rejected-model promotion, or final-holdout access.
