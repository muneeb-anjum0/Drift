# Development and Setup

## Prerequisites

- Node.js 22
- Go 1.26.6 (or Docker for the Go commands)
- Python 3.13+
- Docker with Compose

Copy `.env.example` to `.env`, then set independent random values of at least 32 characters for `JWT_SECRET` and `DRIFT_INFERENCE_API_KEY`. Never commit `.env`.

## Install and run

```bash
make setup
make run
```

`make run` builds and starts MongoDB, FastAPI, the Go API, and the frontend. It deliberately does not start llama.cpp or load model weights.

| Service | Local address |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Go API liveness | `http://127.0.0.1:5000/health` |
| Go API readiness | `http://127.0.0.1:5000/ready` |
| FastAPI | `http://127.0.0.1:8000` (internal key required) |
| MongoDB | `mongodb://127.0.0.1:27017` |

Stop the stack with `docker compose down`. Data remains in the named MongoDB volume unless volumes are explicitly removed.

## Repository map

| Path | Purpose |
| --- | --- |
| `client/` | React application and Playwright journeys |
| `server-go/` | Authoritative Go API and Go tests |
| `services/inference/` | FastAPI model adapter and model-free contract tests |
| `tools/model/` | Explicit model artifact construction tooling |
| `tools/verification/` | Runtime, regression, and model evaluation commands |
| `docs/` | Authoritative engineering and product documentation |
| `.github/workflows/` | Hosted CI |

Top-level Compose files remain at the root because they are the primary local deployment entrypoint. Language manifests remain where their build tools require them.

## Common work

```bash
make lint
make test
make build
make verify
```

Real-Mongo invariants and browser workflows are separate commands:

```bash
MONGO_TEST_URI=mongodb://127.0.0.1:27017 make test-integration
make test-e2e
```

`MONGO_TEST_URI` must point to disposable MongoDB. Integration tests create and drop uniquely named databases.

## Optional services

The default stack keeps the model stopped. When suitable hardware and the GGUF artifact are available, follow [Model Pipeline](model-pipeline.md). Firebase/Google Cloud Storage is also optional; see [Firebase Storage](firebase_setup.md).

## Container notes

The backend and inference service use read-only root filesystems, dropped capabilities, `no-new-privileges`, PID limits, and loopback-only host bindings. The frontend is served by Nginx. The CPU and GPU Compose configurations can be syntax-checked without starting anything:

```bash
docker compose config --quiet
docker compose -f docker-compose.yml -f docker-compose.gpu.yml config --quiet
```
