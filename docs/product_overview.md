# Product Overview

DriftLedger is a local-first SaaS-style workspace for requirement drift detection.

It helps teams preserve approved scope, compare new client input against requirement baselines, save drift analysis history, generate change requests, collect approvals, and evaluate the local Q4_K_M model runtime.

## Core Workflow

1. Create a workspace and project.
2. Add or extract requirements.
3. Freeze requirements into a baseline.
4. Run Drift Analysis against a new client message.
5. Save meaningful analysis results.
6. Generate a Change Request.
7. Submit it for Approval.
8. Review model quality in Evaluation.
9. Show Plan/Billing for SaaS-readiness polish.

## Local-First Architecture

- React frontend
- Go/Gin backend
- MongoDB app data
- FastAPI inference wrapper
- llama.cpp server
- Qwen2.5-7B + DriftLedger LoRA merged into GGUF Q4_K_M
- Docker Compose stack named `Drift`

The runtime does not load the base model and LoRA separately. The supported local artifact is the merged Q4_K_M GGUF file.

## Product Boundaries

DriftLedger is a portfolio/demo SaaS product. Billing is a themed demo surface and does not process real payments. Local data still lives in the configured app database, so “local-first” means the app and model runtime are intended to run on your machine or your own infrastructure.
