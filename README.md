# Drift

## Mission

Protect delivery teams from silent scope creep by turning changing client requests into clear, reviewable requirement-drift decisions before extra work becomes unpaid work.

## Vision

Become the calm operating layer between approved scope and new client intent: requirements stay traceable, drift is explained, and every material change can move into an approval-ready request without scattered notes or guesswork.

## What It Is

DriftLedger is a portfolio SaaS app for requirement baselines, model-backed drift analysis, saved history, change requests, approvals, documents, billing presentation, and in-app Q4 model evaluation.

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

## Demo Data

The demo account can be populated with realistic workspaces, requirements, baselines, drift analyses, and approval decisions through the app API. Keep Mongo data safe by avoiding:

```bash
docker compose down -v
docker volume rm drift_mongo-data
docker volume prune
```
