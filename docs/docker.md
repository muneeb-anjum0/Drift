# Docker

The Compose stack is named `Drift`.

Services:

- `drift-frontend`: React app served by Nginx
- `drift-backend`: Go/Gin API
- `drift-inference`: FastAPI normalization wrapper
- `drift-llama`: llama.cpp server loading Q4_K_M
- `drift-db`: MongoDB

## Required Model

Place or build:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

The base model folder is not required at runtime. It is only needed if you rebuild the GGUF artifact.

## Start

```powershell
docker compose up --build
```

Stop:

```powershell
docker compose down
```

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health`
- llama.cpp health: `http://localhost:8080/health`

The backend calls `http://inference:8000` inside Docker. The inference wrapper calls `http://llama:8080`.

## GPU Notes

Q4_K_M can run on CPU, but it is slow. For a 6GB NVIDIA GPU, start with:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

If Docker runs out of VRAM, lower `DRIFT_LLAMA_GPU_LAYERS` to `12`, `8`, or `0`.

## Reports

Evaluation reports are written under:

```text
reports/evaluation
```

The backend mounts this folder at `/app/reports` so the `/evaluation` page can read the latest report.

## Troubleshooting

- Missing model: restore or build `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`.
- Backend cannot reach inference: check `docker compose logs inference backend`.
- Inference cannot reach llama.cpp: check `docker compose logs llama`.
- Bad model JSON: run `python tools\smoke_test_inference.py`.
- Evaluation page empty: run `python tools\evaluate_q4_quality.py` after Docker is up.
