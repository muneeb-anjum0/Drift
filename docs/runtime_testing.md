# Runtime Testing

## Start

```powershell
docker compose up --build
```

## Health

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
```

Inference health should report:

```text
quantization_label: Q4_K_M
model_loaded: true
base_model_required: false
```

## Direct Model Check

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

## Backend Model Route

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

## Project-Level Regression

The model expects one requirement at a time. Project-level drift analysis filters requirements first, sends relevant requirements one by one, and aggregates the results.

Run:

```powershell
python tools\test_model_route_consistency.py
python tools\test_project_requirement_analysis.py
python tools\test_change_request_generation.py
python tools\test_approval_workflow.py
```

The monthly-report case should remain `unchanged` even when unrelated password-reset requirements exist in the same baseline.

## Approval Workflow Regression

Saved change requests move through a separate approval lifecycle:

```text
draft -> pending_approval -> approved/rejected/needs_revision
```

Run:

```powershell
python tools\test_approval_workflow.py
```

This verifies submit, approve, reject, approval history, and `GET /api/v1/change-requests/approvals`.

## Q4 Evaluation Report

After Docker is running:

```powershell
python tools\evaluate_q4_quality.py
```

Reports are written to:

```text
reports/evaluation
```

The frontend Evaluation page reads the latest JSON report:

```text
http://localhost:5173/evaluation
```

## Final Local Checks

```powershell
docker compose config --quiet
cd server-go
go test ./...
cd ..
npm run build
python tools\check_local_drift_setup.py
python tools\test_q4km_config.py
python tools\test_approval_workflow.py
python tools\evaluate_q4_quality.py --help
python -m py_compile tools\evaluate_q4_quality.py
```
