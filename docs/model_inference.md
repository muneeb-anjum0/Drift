# Model Inference

DriftLedger compares one baseline requirement with one new client message and returns:

```json
{
  "label": "unchanged",
  "confidence": 0.95,
  "reasoning": "...",
  "changed_elements": []
}
```

Valid labels are `added`, `modified`, `removed`, `contradiction`, `ambiguous`, and `unchanged`.

## Runtime

The supported local runtime is:

```text
Qwen2.5-7B + DriftLedger LoRA merged into GGUF Q4_K_M
```

Runtime file:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

The base Qwen folder and LoRA adapter zip are not loaded at runtime when `DRIFT_LOCAL_ENGINE=gguf`. They are only build inputs for creating the GGUF file.

## Prompt Shape

The inference wrapper uses Qwen chat markers and instructs the model to return only JSON.

```text
baseline_requirement + new_client_message -> label/confidence/reasoning/changed_elements
```

Project-level analysis does not concatenate all requirements. The backend filters and analyzes relevant requirements one by one, then aggregates the output.

## API

Inference health:

```powershell
curl.exe http://localhost:8000/health
```

Direct inference:

```powershell
curl.exe -X POST http://localhost:8000/predict-drift `
  -H "Content-Type: application/json" `
  -d "{\"baseline_requirement\":\"The system shall allow admins to export monthly reports as CSV.\",\"new_client_message\":\"Can admins download the same monthly report from the reports page?\"}"
```

Backend raw model route:

```powershell
curl.exe -X POST http://localhost:5000/api/drift/analyze `
  -H "Content-Type: application/json" `
  -d "{\"baseline_requirement\":\"The system shall allow admins to export monthly reports as CSV.\",\"new_client_message\":\"Can admins download the same monthly report from the reports page?\"}"
```

Authenticated project route:

```text
POST /api/v1/drift/analyze
```

## Checks

```powershell
python tools\smoke_test_inference.py
python tools\test_model_route_consistency.py
python tools\test_project_requirement_analysis.py
python tools\test_change_request_generation.py
```

## Troubleshooting

- Missing Q4 GGUF: run `python tools\build_q4km_model.py`.
- llama.cpp request failed: check `docker compose logs llama`.
- Backend cannot reach inference: check `docker compose logs backend inference`.
- Noisy project labels: run `python tools\test_project_requirement_analysis.py`.
