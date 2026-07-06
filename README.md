# DriftLedger

DriftLedger is a full-stack SaaS platform for detecting requirement drift, documenting scope changes, and generating client-ready change requests.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Go/Gin
- Database: MongoDB
- Drift inference: FastAPI wrapper plus llama.cpp GGUF inference by default
- Model source: local `Qwen2.5-7B-Instruct` base model plus the trained DriftLedger LoRA adapter

The active backend lives in `server-go/`.

## Current Model Runtime

The default runtime is now GGUF:

```env
DRIFT_MODEL_MODE=local
DRIFT_LOCAL_ENGINE=gguf
DRIFT_GGUF_MODEL_PATH=models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
DRIFT_LLAMA_SERVER_URL=http://llama:8080
```

`Q3_K_M` is not training. It is quantization after merging the already trained DriftLedger LoRA adapter into the Qwen base model.

The build flow is:

```text
Qwen/Qwen2.5-7B-Instruct + DriftLedger LoRA
  -> merged Hugging Face model
  -> F16 GGUF
  -> Q3_K_M GGUF
```

## Required Local Files

Base model:

```text
models/base/Qwen2.5-7B-Instruct
```

Adapter zip:

```text
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip
```

Quantized runtime model:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

Large model files are ignored by Git.

## Build The Q3_K_M Model

After the base model and LoRA zip are present:

```powershell
cd D:\Desktop\Projects\Drift\Drift-app
python -m pip install -r tools\requirements-q3km.txt
python tools\build_q3km_model.py
```

That command validates files, merges the LoRA, builds llama.cpp if needed, converts to GGUF, and quantizes to Q3_K_M. If your machine does not have enough system RAM for the merge, run the same repo and command on a larger machine or free notebook, then copy this file back:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

## Validate

```powershell
python tools\check_local_drift_setup.py
```

The check intentionally fails when `DRIFT_LOCAL_ENGINE=gguf` and the Q3_K_M GGUF file is missing.

## Docker

The Compose stack is named `Drift`.

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health`
- llama.cpp health/UI: `http://localhost:8080`

Stop:

```powershell
docker compose down
```

Docker mounts `./models` into the containers at `/app/models`.

## Smoke Tests

After Docker is running:

```powershell
python tools\eval_q3km_smoke.py
python tools\smoke_backend_direct.py
```

Manual inference call:

```powershell
curl.exe -X POST http://localhost:8000/predict-drift `
  -H "Content-Type: application/json" `
  -d "{\"baseline_requirement\":\"The system shall allow admins to export monthly reports as CSV.\",\"new_client_message\":\"Can admins download the same monthly report from the reports page?\"}"
```

## GPU Notes

Your 6GB GPU is too small for the previous PEFT 4-bit runtime. GGUF Q3_K_M through llama.cpp is the intended local path for this machine. Start with:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

If startup fails with CUDA out of memory, lower `DRIFT_LLAMA_GPU_LAYERS` to `12`, then `8`, then `0`.

## More Docs

- `docs/local_model_setup.md`
- `docs/model_inference.md`
- `docs/docker.md`
- `docs/gguf_q3km_setup.md`
