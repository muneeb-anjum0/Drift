# Drift

## Mission

Protect project scope by turning client messages into clear requirement-drift decisions before work quietly expands.

## Vision

Make scope comparison, approvals, and change-request writing feel like one calm workflow instead of scattered notes.

## What It Is

DriftLedger is a portfolio SaaS app for requirements, baselines, drift analysis, saved history, change requests, approvals, documents, and in-app Q4 model evaluation.
It also includes a demo Billing/Plan area for SaaS presentation polish.

## Stack

- React, Vite, TypeScript, Tailwind
- Go/Gin API
- MongoDB
- FastAPI inference wrapper
- llama.cpp running `Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)`

## Run

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health`
- Approvals: `http://localhost:5173/approvals`
- Billing: `http://localhost:5173/billing`

Stop:

```bash
docker compose down
```

## Model Artifact

The only supported local runtime artifact is:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

Large model files are ignored by Git.

## Useful Checks

```bash
npm run build
cd server-go && go test ./...
python tools/check_local_drift_setup.py
python tools/test_q4km_config.py
python tools/test_approval_workflow.py
python tools/evaluate_q4_quality.py --help
```

Focused notes live in `docs/`.
