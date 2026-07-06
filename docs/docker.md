# Docker

The Compose stack is named `Drift` and runs:

- `drift-frontend`: React/Vite app served by Nginx
- `drift-backend`: Go/Gin API
- `drift-inference`: FastAPI normalization and backend-facing inference API
- `drift-llama`: llama.cpp `full-cuda` image running the Q3_K_M GGUF server
- `drift-db`: MongoDB

## Model Paths

Host paths:

```text
D:\Desktop\Projects\Drift\Drift-app\models\base\Qwen2.5-7B-Instruct
D:\Desktop\Projects\Drift\Drift-app\models\adapters\DriftLedger_v5_qwen2.5_7b_LoRA.zip
D:\Desktop\Projects\Drift\Drift-app\models\gguf\DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

Container paths:

```text
/app/models/base/Qwen2.5-7B-Instruct
/app/models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip
/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

Compose mount:

```yaml
- ./models:/app/models
```

## Start

Build the quantized model first:

```powershell
python -m pip install -r tools\requirements-q3km.txt
python tools\build_q3km_model.py
```

Validate local files:

```powershell
python tools\check_local_drift_setup.py
```

Start the full stack:

```powershell
docker compose up --build
```

Stop it:

```powershell
docker compose down
```

If your Compose version ignores the embedded name:

```powershell
docker compose -p Drift up --build
```

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Backend API: `http://localhost:5000/api/v1`
- Inference health: `http://localhost:8000/health`
- llama.cpp server: `http://localhost:8080`

The inference, llama.cpp, and MongoDB ports are bound to `127.0.0.1` for local diagnostics. Inside Docker, the backend calls `http://inference:8000`, and the inference wrapper calls `http://llama:8080`.

## GPU Tuning

For a 6GB NVIDIA GPU, start with:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

If CUDA runs out of memory, lower `DRIFT_LLAMA_GPU_LAYERS` to `12`, then `8`, then `0`.

## Troubleshooting

- `drift-llama` exits immediately: confirm `models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf` exists.
- Docker image cannot use GPU: install/update NVIDIA drivers, Docker Desktop GPU support, and NVIDIA Container Toolkit.
- Backend cannot reach inference: run `docker compose ps` and check `docker compose logs inference`.
- Inference cannot reach llama.cpp: check `docker compose logs llama`.
- Model outputs bad JSON: run `python tools\eval_q3km_smoke.py` and inspect labels.
