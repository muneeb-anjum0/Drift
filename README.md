# DriftLedger

## Mission

Help teams catch requirement drift before small client requests quietly become unpaid scope.

## Vision

Make scope changes easy to compare, explain, approve, and document from the first message to the final change request.

## What It Does

DriftLedger is a full-stack app for managing requirements, freezing baselines, analyzing client messages for drift, and generating change-request drafts.

Project workspaces are organized into Requirements, Drift Analysis, History, Change Requests, and Documents.

Saved drift analyses are post-processed into grouped client-facing changes before they are saved or used for change requests.
Project-level model results are aggregated by primary client intent, so related baseline requirements become affected modules instead of noisy duplicate changes.

## Stack

- React, Vite, TypeScript, Tailwind
- Go/Gin API
- MongoDB
- FastAPI inference wrapper
- llama.cpp GGUF runtime for local DriftLedger model inference

## Structure

```text
client/              Frontend app
server-go/           Backend API
services/inference/  Model inference service
models/              Local model assets, ignored by Git
tools/               Setup and validation scripts
docs/                Supporting notes
```

## Run

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health`

Stop:

```bash
docker compose down
```

## Local Model

The local runtime expects the quantized GGUF model at:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

Large model files are intentionally not committed.

## Useful Checks

```bash
npm run build
go test ./...
python tools/test_runtime_stack.py
python tools/test_change_request_generation.py
```

More setup notes live in `docs/`.
