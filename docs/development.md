# Run Drift locally

Drift is a local-first application. The normal runtime needs Git, Docker Engine or Docker Desktop, and Docker Compose v2; it does **not** require host Go, Node, Python, MongoDB, or llama.cpp installations. This Compose path has been exercised on Linux x86-64. Windows with Docker Desktop/WSL and macOS are not yet verified; model image architecture and available RAM may differ. Do not expose the local stack to the Internet.

## First run without a model

```sh
git clone https://github.com/muneeb-anjum0/Drift.git
cd Drift
cp .env.example .env
```

Put **different** cryptographically random values of at least 32 characters into `JWT_SECRET` and `DRIFT_INFERENCE_API_KEY` in `.env`. On a system with OpenSSL, `openssl rand -hex 32` generates one value; run it twice and paste each result into the corresponding line. Do not paste secrets into issue reports or commit `.env`. Set `DRIFT_FRONTEND_PORT` if 5173 is already occupied, and set a unique `COMPOSE_PROJECT_NAME` if another Drift installation runs on the same Docker host.

```sh
docker compose config --quiet
docker compose up -d --build --wait db inference backend frontend
```

Open `http://localhost:5173` (or the selected port). `http://127.0.0.1:5000/health` reports API liveness and `/ready` reports Mongo readiness. The inference container is live but its keyed `/health` is **503** until the optional model is loaded. Registration, workspaces, projects, requirements, and baselines work without weights; analysis requests fail explicitly rather than inventing a result. The in-app Evaluation page also shows model load/health state. The first build may take several minutes and needs network access to pull base images and packages.

The browser reaches only the frontend. The Go API is also bound to host loopback at `127.0.0.1:5000` for local diagnostics; Mongo, inference, and llama.cpp have no published host ports. Local JWT, inference-key, tenant, and rate-limit boundaries still apply. A user with full control of the host or Docker socket can read local application data and secrets; Drift does not defend against that attacker.

## Optional original model

The model is **optional** for the core app and is not included in Git. No authorized public download URL is provided. Obtain the original artifact through its authorized custody channel, then place it at:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

It is 4,683,074,112 bytes (4.36 GiB). Its SHA-256 **must** be:

```text
11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9
```

Check it before startup with `sha256sum models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf` (or `shasum -a 256` on macOS). Do not start the model on a mismatch. The default in-container path in `.env` is `/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`; the filename matters because both inference and llama.cpp use that path. The ignored `models/` directory is bind-mounted read-only in llama.cpp. Do not use the rejected Phase III-J adapter.

CPU mode:

```sh
docker compose --profile model up -d llama
```

Wait until `docker compose --profile model ps` shows llama running, then inspect `docker compose --profile model logs --tail=50 llama` and the in-app Evaluation model status. The CPU configuration uses zero GPU layers and a 7 GiB llama container memory limit; plan for substantially more host RAM for the whole stack. The artifact alone needs over 4 GiB disk, in addition to images, Mongo, logs, and backups. CPU inference may be slow. The optional NVIDIA route requires a supported GPU and NVIDIA Container Toolkit:

```sh
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile model up -d llama
```

GPU execution is not a requirement for local use and must be verified on the user's machine. To disable the model while keeping the core app, run `docker compose --profile model stop llama`.

## Stop, restart, and data safety

`docker compose down` stops the stack but **preserves** the `mongo-data` named volume and the `.env` file. Restart with `docker compose up -d --wait db inference backend frontend`, then optionally start llama. An ordinary Docker/host restart followed by the same command should reuse the volume; verify with your own test data. `docker compose down --volumes`, `docker volume rm`, and deleting the project volume are **destructive resets**, not normal cleanup. Uploaded-file storage is disabled by default. Application reports under `reports/` are a separate bind mount and are not in the Mongo backup below.

## Local Mongo backup and restore

Keep backups outside the checkout and verify them before changing state. These POSIX-shell commands back up only the default `driftledger` database, not optional external file storage:

```sh
mkdir -p "$HOME/drift-backups"
backup="$HOME/drift-backups/driftledger-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
docker compose exec -T db mongodump --db driftledger --archive --gzip > "$backup"
sha256sum "$backup"
```

Record the checksum somewhere safe. A local backup does not protect against loss of the host disk; users may copy it to their own external drive or private backup service. To restore, first verify the archive checksum and intended Compose project/database, stop writes, and take a fresh backup of the current state. **The following replaces backed-up collections in `driftledger`:**

```sh
docker compose stop frontend backend inference
docker compose exec -T db mongorestore --drop --nsInclude='driftledger.*' --archive --gzip < /path/to/verified.archive.gz
docker compose up -d --wait db inference backend frontend
```

Check user/project records and indexes after restore. Never restore an untrusted archive or point this procedure at another installation's Compose project. If optional uploaded-file storage is enabled later, back up and restore its separate bucket as well.

## Update safely

Back up first, note `git rev-parse HEAD` and the project name, and read release notes for schema changes. With a clean checkout:

```sh
git pull --ff-only
docker compose config --quiet
docker compose up -d --build --wait db inference backend frontend
```

If using the model, start its profile again and recheck its SHA and health. `.env`, ignored model files, and named Mongo volumes are not replaced by `git pull` or image rebuilds. The current schema checker can detect incompatible indexes, but automatic schema rollback is not available; stop and investigate a mismatch rather than deleting a volume. The running source revision is `git rev-parse HEAD`; `docker compose images` shows the images for that Compose project. Do not treat a mutable image tag alone as immutable provenance.

## Verification and troubleshooting

Developers who want to run source-level checks also need Node.js 22, Go 1.26.9, Python 3.13+, and `make`. `make setup` installs those test dependencies, and `make verify` runs lint, unit tests, builds, audits, and Compose validation; Mongo integration and Playwright tests have separate setup. These are **developer verification** prerequisites, not runtime prerequisites.

| Symptom | First check |
| --- | --- |
| Docker/Compose missing or too old | `docker version`, `docker compose version`; staging overlay specifically needs Compose v2.24.4+, while normal local Compose uses v2. |
| Port 5173 occupied | Set `DRIFT_FRONTEND_PORT` in `.env`, then `docker compose up -d`; open that localhost port. |
| Backend not ready | `docker compose ps`; `docker compose logs --tail=80 db backend`; check `http://127.0.0.1:5000/ready`. |
| Model not configured | Core app is usable; the keyed inference health stays 503 and analysis is unavailable. |
| Model path/hash wrong | Check the exact filename, SHA-256, and read-only mount with `docker compose --profile model config --quiet` and `docker compose --profile model logs llama`. |
| Model out of memory or slow | Check `docker stats`, host memory/swap, and llama logs; CPU model mode needs substantially more resources than the core app. |
| NVIDIA runtime unavailable | Use CPU mode; check `docker info` and GPU toolkit separately. |
| Stale containers or permissions | Check `docker compose ps`, project name, and `docker compose logs`; never use `down --volumes` as a troubleshooting shortcut. |

The local-first distribution decision and evidence are in [Phase IV-G](phase_iv_g_local_distribution_readiness.md). Public DNS, TLS, ingress, and VPS checks in the historical [staging gate](staging_readiness_gate.md) are not local-release prerequisites.
