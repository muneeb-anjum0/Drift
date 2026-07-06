# Runtime Testing

This guide uses the routes that are actually registered in the DriftLedger codebase.

## Why `/api/drift/analyze` Returned Route Not Found

The main Go router registers the application API under:

```text
/api/v1
```

The original project drift route is:

```text
POST /api/v1/drift/analyze
```

That route is authenticated and expects project/baseline IDs, not raw `baseline_requirement` and `new_client_message` fields.

For manual model testing, DriftLedger also exposes:

```text
POST /api/v1/drift/analyze-direct
POST /api/drift/analyze
```

`/api/drift/analyze` is a compatibility shortcut for the raw baseline/message payload.

## Actual Backend Routes

Health:

```text
GET /health
```

Auth:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/logout
```

Workspaces:

```text
POST /api/v1/workspaces
GET /api/v1/workspaces
GET /api/v1/workspaces/:workspaceId
PATCH /api/v1/workspaces/:workspaceId
DELETE /api/v1/workspaces/:workspaceId
```

Projects:

```text
POST /api/v1/projects
GET /api/v1/projects
GET /api/v1/projects/:projectId
PATCH /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId
```

Activities:

```text
GET /api/v1/activities
GET /api/v1/activities/:workspaceId
```

Requirements:

```text
GET /api/v1/requirements/project/:projectId
POST /api/v1/requirements
POST /api/v1/requirements/extract
POST /api/v1/requirements/baseline
GET /api/v1/requirements/versions/:projectId
GET /api/v1/requirements/:requirementId
PATCH /api/v1/requirements/:requirementId
DELETE /api/v1/requirements/:requirementId
```

Drift:

```text
POST /api/v1/drift/analyze-direct
POST /api/v1/drift/analyze
POST /api/v1/drift/save
GET /api/v1/drift/project/:projectId
GET /api/v1/drift/:driftAnalysisId
DELETE /api/v1/drift/:driftAnalysisId
POST /api/drift/analyze
```

Change requests:

```text
POST /api/v1/change-requests/generate
POST /api/v1/change-requests
GET /api/v1/change-requests/project/:projectId
GET /api/v1/change-requests/:changeRequestId
PATCH /api/v1/change-requests/:changeRequestId
DELETE /api/v1/change-requests/:changeRequestId
```

Files:

```text
POST /api/v1/files/upload
GET /api/v1/files/project/:projectId
GET /api/v1/files/:fileId
DELETE /api/v1/files/:fileId
```

Development only:

```text
GET /api/v1/debug/routes
```

## A. Start Stack

```powershell
cd D:\Desktop\Projects\Drift\Drift-app
docker compose up --build
```

Detached mode:

```powershell
docker compose up --build -d
```

## B. Check Containers

```powershell
docker compose ps
```

Expected services:

```text
drift-frontend
drift-backend
drift-inference
drift-llama
drift-db
```

## C. Check Logs

```powershell
docker compose logs -f llama
docker compose logs -f inference
docker compose logs -f backend
docker compose logs -f frontend
```

## D. Check Health Endpoints

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
```

## E. Test Inference Service Directly

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8000/predict-drift" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
    "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?"
  }'
```

Expected label:

```text
unchanged
```

## F. Test Backend Model Route

Use this unauthenticated runtime test route for raw baseline/message checks:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/drift/analyze" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
    "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?"
  }'
```

Expected shape:

```json
{
  "success": true,
  "message": "Drift model analysis completed",
  "data": {
    "label": "unchanged",
    "confidence": 0.95,
    "reasoning": "...",
    "changed_elements": []
  }
}
```

The authenticated project-analysis route is:

```text
POST /api/v1/drift/analyze
```

It expects:

```json
{
  "projectId": "...",
  "baselineVersionId": "...",
  "inputText": "...",
  "inputType": "client_message"
}
```

## G. Test Frontend

Open:

```text
http://localhost:5173
```

Exact app pages:

```text
/login
/register
/dashboard
/workspaces
/projects
/projects/:projectId
/settings
```

The model sandbox is not a standalone route. It is inside:

```text
http://localhost:5173/projects/:projectId
```

Steps:

1. Log in.
2. Open a project at `/projects/:projectId`.
3. Ensure the project has requirements and a baseline.
4. Open the Drift Analysis section.
5. Scroll to Model sandbox.
6. Paste the baseline requirement.
7. Paste the new client message.
8. Click Analyze.
9. Confirm label, confidence, reasoning, and changed elements render.

The frontend API client uses:

```text
VITE_API_BASE_URL=/api/v1
POST /api/v1/drift/analyze-direct
```

## H. Test Multiple Label Cases

| Expected | Baseline requirement | New client message | Why |
| --- | --- | --- | --- |
| unchanged | The system shall allow admins to export monthly reports as CSV. | Can admins download the same monthly report from the reports page? | Same report and format, only access wording changes. |
| added | The app shall allow users to reset passwords by email. | Add SMS password reset too. | Adds a new reset channel. |
| modified | Reports shall export as CSV. | Can reports export as PDF instead? | Changes output format. |
| removed | The dashboard shall show revenue by month. | Remove the revenue chart from the dashboard. | Removes an existing dashboard requirement. |
| contradiction | Users shall be able to delete archived projects. | Actually, users should not be able to delete archived projects. | Directly conflicts with baseline permission. |
| ambiguous | The app shall support two-factor authentication. | Maybe make security more modern and easier somehow. | Vague security request without a concrete requirement. |

## Automated Runtime Test

```powershell
python tools\test_runtime_stack.py
```

The script checks:

1. llama.cpp health
2. inference health
3. direct inference prediction
4. backend health
5. backend `/api/drift/analyze`
6. frontend root

## Docker Environment

Backend:

```env
DRIFT_INFERENCE_URL=http://inference:8000
```

Inference:

```env
DRIFT_LOCAL_ENGINE=gguf
DRIFT_LLAMA_SERVER_URL=http://llama:8080
```

llama model path:

```text
/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

## GTX 1060 Max-Q Runtime Tuning

Current defaults:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

The FastAPI `/health` field `cuda_available:false` only describes the FastAPI container. In GGUF mode, the model runs in `drift-llama`, not in `drift-inference`.

The current llama logs do not show CUDA layer offload lines, and throughput is around 8-9 generated tokens/sec, so treat the current runtime as CPU-only or mostly CPU-bound. This is acceptable for local testing because the Q3_K_M model is answering successfully.

For GPU acceleration later:

1. Confirm Docker Desktop can pass NVIDIA GPUs.
2. Confirm `docker compose logs llama` shows CUDA backend and GPU offload.
3. Keep `DRIFT_LLAMA_GPU_LAYERS=16` first.
4. Reduce to `12`, `8`, or `0` if VRAM crashes.
5. Increase only if VRAM headroom exists.

## Final Verification Commands

```powershell
docker compose config --quiet
docker compose up --build
python tools\test_runtime_stack.py
python tools\smoke_test_inference.py
python tools\eval_q3km_smoke.py
```

App checks:

```powershell
npm run build
cd server-go
go test ./...
```
