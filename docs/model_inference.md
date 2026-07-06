# DriftLedger Model Inference

DriftLedger inference compares a baseline requirement with a new client message and returns:

```json
{
  "label": "unchanged",
  "confidence": 0.95,
  "reasoning": "...",
  "changed_elements": []
}
```

Valid labels are `added`, `modified`, `removed`, `contradiction`, `ambiguous`, and `unchanged`.

## Runtime Modes In This Project

Default:

```env
DRIFT_MODEL_MODE=local
DRIFT_LOCAL_ENGINE=gguf
```

The FastAPI inference wrapper validates requests, calls llama.cpp at `DRIFT_LLAMA_SERVER_URL`, parses the model output, and returns normalized JSON. The llama.cpp server loads:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

PEFT is still present as a fallback/dev engine:

```env
DRIFT_LOCAL_ENGINE=peft
```

PEFT loads the base model plus adapter directly and normally needs a much larger GPU than 6GB. Use GGUF on this machine.

## Prompt Format

The wrapper uses Qwen chat markers:

```text
<|im_start|>system
You are DriftLedger...
<|im_end|>
<|im_start|>user
Baseline requirement:
...
New client message:
...
<|im_end|>
<|im_start|>assistant
```

The system prompt tells the model to return only valid JSON.

## API

Inference health:

```powershell
curl.exe http://localhost:8000/health
```

Prediction:

```powershell
curl.exe -X POST http://localhost:8000/predict-drift `
  -H "Content-Type: application/json" `
  -d "{\"baseline_requirement\":\"The system shall allow admins to export monthly reports as CSV.\",\"new_client_message\":\"Can admins download the same monthly report from the reports page?\"}"
```

Backend direct route:

```powershell
curl.exe -X POST http://localhost:5000/api/v1/drift/analyze-direct `
  -H "Content-Type: application/json" `
  -d "{\"baseline_requirement\":\"The system shall allow admins to export monthly reports as CSV.\",\"new_client_message\":\"Can admins download the same monthly report from the reports page?\"}"
```

Project baseline analysis is available at `POST /api/v1/drift/analyze` after login.

## Malformed Output Handling

If model output is malformed, the service tries to extract the first JSON object, validates the label, confidence, reasoning, and changed elements, then returns either normalized JSON or HTTP `502`.

## Smoke Tests

```powershell
python tools\eval_q3km_smoke.py
python tools\smoke_backend_direct.py
```

## Troubleshooting

- `Q3_K_M GGUF not found`: build or copy `models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf`.
- llama.cpp request failed: check `docker compose logs llama`.
- CUDA out of memory: reduce `DRIFT_LLAMA_GPU_LAYERS`.
- Bad JSON from model: lower temperature is already set to `0`; rebuild if the adapter merge used wrong files.
