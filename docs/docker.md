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

This starts the application services without loading the model. Start the CPU llama.cpp runtime only when needed:

```powershell
docker compose --profile model up -d llama
```

For NVIDIA CUDA, use the explicit GPU override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile model up -d llama
```

Stop:

```powershell
docker compose down
```

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health` (requires the internal inference key header)
- llama.cpp health: `http://localhost:8080/health`

The backend calls `http://inference:8000` inside Docker. The inference wrapper calls `http://llama:8080`.

Before creating or recreating the secured services, copy `.env.example` to `.env` and set independent random values for `JWT_SECRET` and `DRIFT_INFERENCE_API_KEY` (at least 32 characters each). The API fails startup if either required value is missing or still uses a known placeholder. For example, generate values with `openssl rand -hex 32`.

## GPU Notes

Q4_K_M can run on CPU, but it is slow. The checked-in default is CPU-safe:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=0
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

The default model image is CPU-only and requires no NVIDIA runtime. With `docker-compose.gpu.yml`, raise `DRIFT_LLAMA_GPU_LAYERS` gradually, for example `8`, `12`, then `16`. If Docker hangs or runs out of VRAM, return it to `0`.

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
