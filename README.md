# Drift

Drift is a local-first workspace for detecting requirement drift before it becomes silent scope creep. Teams preserve an approved baseline, compare new client input against it, review explainable drift, and turn material changes into approval-tracked change requests.

## Architecture

```text
React browser UI
  -> Go/Gin API (product authority, tenancy, workflows, persistence)
       -> MongoDB
       -> FastAPI model adapter
            -> optional llama.cpp + DriftLedger Qwen GGUF
       -> optional Google Cloud Storage
```

The Go backend remains authoritative. Browser state and generated model output are untrusted; authorization and workflow transitions are enforced server-side. See [Architecture](docs/architecture.md) and [Security Boundaries](docs/security.md).

## Technology

- React, TypeScript, Vite, and Playwright
- Go, Gin, and the MongoDB driver
- Python, FastAPI, Pydantic, and httpx
- MongoDB and optional Google Cloud Storage
- llama.cpp with an optional local Qwen2.5-7B + DriftLedger LoRA Q4_K_M artifact
- Docker Compose and GitHub Actions

## Start without the model

Prerequisites are Node.js 22, Go 1.26.6, Python 3.13+, and Docker Compose.

```bash
cp .env.example .env
# Set independent JWT_SECRET and DRIFT_INFERENCE_API_KEY values (32+ characters).
make setup
make run
```

The frontend is available at `http://localhost:5173`. The default stack starts MongoDB, FastAPI, the Go API, and the frontend; it does not start llama.cpp or load model weights.

## Verify

```bash
make verify
MONGO_TEST_URI=mongodb://127.0.0.1:27017 make test-integration
make test-e2e
```

Standard verification never downloads or starts model weights. Model smoke and evaluation commands are intentionally separate.

## Documentation

- [Development and setup](docs/development.md)
- [Architecture](docs/architecture.md)
- [Verification and CI](docs/verification.md)
- [Configuration](docs/configuration.md)
- [Security boundaries](docs/security.md)
- [Operations and recovery](docs/operations.md)
- [Model pipeline and evaluation](docs/model-pipeline.md)
- [Known limitations](docs/known-limitations.md)
- [Product and demo guide](docs/product-guide.md)
- [Frontend style guide](docs/frontend-style-guide.md)
- [Architecture decisions](docs/decisions/)

Model artifacts, `.env`, caches, reports, and the recovered local `Model/` directory are intentionally excluded from the tracked software state.
