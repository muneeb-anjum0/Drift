# Local Model Setup

DriftLedger runs requirement drift inference locally. The default local engine is GGUF Q4_K_M served by llama.cpp.

## Important: Quantization Is Not Training

The DriftLedger LoRA has already been trained. Q4_K_M and Q3_K_M are post-training quantization formats. The local setup does this:

```text
merge trained LoRA into Qwen2.5-7B-Instruct
convert merged model to F16 GGUF
quantize F16 GGUF to Q4_K_M
```

No training data or holdout/evaluation files are used at runtime.

## Paths

Base model:

```text
models/base/Qwen2.5-7B-Instruct
```

Adapter zip:

```text
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip
```

Extracted adapter:

```text
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA
```

Generated merged model:

```text
models/merged/DriftLedger-Qwen2.5-7B-Merged
```

Generated quantized model:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

Q3_K_M remains available as a lighter fallback:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

## Build Q4_K_M

Run the full pipeline:

```powershell
cd "D:\Desktop\2. PROJECTS\Drift\Drift-app"
python -m pip install -r tools\requirements-q3km.txt
python tools\build_q4km_model.py
```

Manual steps:

```powershell
python tools\merge_lora_to_base.py
python tools\setup_llama_cpp.py
python tools\convert_merged_to_gguf.py
python tools\quantize_gguf_q4km.py
```

Force only the Q4 quantization step:

```powershell
python tools\quantize_gguf_q4km.py --force
```

The merge step uses system RAM and may need more than 16GB. If it fails locally, run the same commands on a stronger machine and copy back `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`.

## Verify Files

```powershell
python tools\check_local_drift_setup.py
```

The adapter must contain:

- `adapter_config.json`
- `adapter_model.safetensors`
- `tokenizer.json`
- `tokenizer_config.json`

The check fails until the Q4_K_M GGUF exists when `DRIFT_LOCAL_ENGINE=gguf`.

## Q3_K_M Fallback

Q4_K_M usually improves quality over Q3_K_M, but it uses more RAM/VRAM and may be slower. On a GTX 1060 Max-Q 6GB, it may be tight or CPU-bound. If the PC freezes, crashes, or becomes too slow, set:

```env
DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
VITE_DRIFT_MODEL_LABEL=Qwen2.5-7B + DriftLedger LoRA (GGUF Q3_K_M)
```

## Start Docker

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Inference health: `http://localhost:8000/health`
- llama.cpp server: `http://localhost:8080`

## Troubleshooting

- Q4_K_M GGUF missing: run `python tools\build_q4km_model.py`.
- Merge out of memory: perform merge/quantization on a larger machine and copy the final GGUF back.
- Adapter missing: place the zip under `models/adapters/`.
- CUDA out of memory in Docker: lower `DRIFT_LLAMA_GPU_LAYERS`.
- Docker cannot see project files: ensure Docker Desktop has access to the project drive.
- Backend cannot reach inference: confirm `drift-inference` and `drift-llama` are up.
