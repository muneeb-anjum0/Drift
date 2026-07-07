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
cd "D:\Desktop\2. PROJECTS\Drift\Drift-app"
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

## G.1 Frontend Regression: Main Panel Matches Model Sandbox

The Model sandbox and the main Drift Analysis panel both use the same Qwen GGUF model-backed route:

```text
POST /api/v1/drift/analyze-direct
```

The model was trained on one `baseline_requirement` plus one `new_client_message`, and it has no `unrelated` label. Project-level analysis must not concatenate every baseline requirement into one prompt or blindly classify every requirement. The backend now runs relevance filtering before model calls:

1. Read each requirement from the selected baseline version.
2. Score relevance with tokens, synonyms, and domain keywords.
3. Ignore unrelated requirements before model inference.
4. Send only relevant candidates to the local Qwen GGUF model.
5. Log the requirement title, status, model label, confidence, relevance score, and selected/displayed status.
6. Aggregate only relevant non-`unchanged` results into detected changes and drift score.

Unrelated requirements, such as password reset, should not pollute a monthly-report drift check.

Defaults:

```env
DRIFT_RELEVANCE_THRESHOLD=0.25
DRIFT_MAX_ANALYZED_REQUIREMENTS=3
```

Regression case:

```text
Baseline requirement:
The system shall allow admins to export monthly reports as CSV.

New client message:
Can we also let admins download the same monthly report from the existing reports page?
```

Expected result in both Model sandbox and main Drift Analysis:

```text
label=unchanged
```

Run the automated route consistency check:

```powershell
python tools\test_model_route_consistency.py
python tools\test_project_requirement_analysis.py
```

Expected output:

```text
PASS model routes agree on the monthly-report unchanged case
PASS project requirement analysis ignores unrelated baselines and returns unchanged
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
python tools\test_model_route_consistency.py
python tools\test_project_requirement_analysis.py
```

The script checks:

1. llama.cpp health
2. inference health
3. direct inference prediction
4. backend health
5. backend `/api/drift/analyze`
6. frontend root

The route consistency script checks:

1. inference `/predict-drift`
2. backend compatibility `/api/drift/analyze`
3. frontend-used `/api/v1/drift/analyze-direct`
4. all labels match the expected `unchanged` result for the monthly-report regression case

The project requirement analysis script checks:

1. an authenticated project baseline with password reset, monthly reports, invoice PDF export, admin 2FA, and subscription notifications
2. `POST /api/v1/drift/analyze`, not local duplicate aggregation
3. monthly report unchanged selects monthly reports and ignores password reset
4. SMS OTP selects password reset and ignores monthly reports
5. weekly/monthly report wording selects reporting and ignores password reset
6. ignored requirements do not expose noisy model labels

## Change Request Generation Regression

Saved analyses are cleaned before persistence and before change-request generation. The backend removes repeated reasoning, chooses the primary client intent from the message, groups duplicate requirement-level matches into one client-facing change, and keeps secondary requirements as affected modules instead of separate drift items.

This matters because the model analyzes one requirement at a time. For project-level analysis, the backend aggregates results after inference. The post-processing layer prevents related baseline requirements such as invoices, payment status, and notifications from becoming duplicate changes when the primary request is family member access.

Run:

```powershell
python tools\test_change_request_generation.py
```

The script creates a MediCare Clinic Portal test project and checks:

- same prescription PDF access stays unchanged/low and does not create a change request
- SMS OTP remains a grouped password reset addition
- explicit card payment removal still works
- family member portal access does not trigger false card-payment removal from `payment status`
- appointment cancellation window changes group into one modified change
- cancellation after scheduled time groups into one capped contradiction
- vague dashboard requests stay ambiguous and low effort
- clinic analytics summaries mention CSV and clinic analytics, not academic report cards

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
/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

Q3_K_M is still available as a manual fallback with `DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf`.

## GTX 1060 Max-Q Runtime Tuning

Current defaults:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

The FastAPI `/health` field `cuda_available:false` only describes the FastAPI container. In GGUF mode, the model runs in `drift-llama`, not in `drift-inference`.

The current llama logs may not show CUDA layer offload lines, so treat the runtime as CPU-only or mostly CPU-bound unless Docker logs prove GPU offload. Q4_K_M improves quality over Q3_K_M but may be slower or tighter on 6GB GPUs.

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
python tools\test_change_request_generation.py
```

`eval_q3km_smoke.py` is an older script name; it exercises the currently configured GGUF route.

App checks:

```powershell
npm run build
cd server-go
go test ./...
```
