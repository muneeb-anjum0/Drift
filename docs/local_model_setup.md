# Local Model Setup

`Q4_K_M` is quantization after merging. It is not training.

## Runtime Artifact

Docker runtime uses only:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

The base model and adapter are build inputs, not runtime dependencies for GGUF mode.

## Build Inputs

Base model:

```text
models/base/Qwen2.5-7B-Instruct
```

Adapter:

```text
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA
```

Final output:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

## Build

```powershell
python -m pip install -r tools\requirements-local-model.txt
python tools\build_q4km_model.py
```

Manual build steps:

```powershell
python tools\merge_lora_to_base.py
python tools\setup_llama_cpp.py
python tools\convert_merged_to_gguf.py
python tools\quantize_gguf_q4km.py
```

## Verify

```powershell
python tools\check_local_drift_setup.py
python tools\test_q4km_config.py
```

## Start

```powershell
docker compose up --build
```

## Troubleshooting

- Missing GGUF: rebuild or restore `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`.
- Merge out of memory: run the build steps on a stronger machine and copy back the final GGUF.
- Docker GPU issue: reduce `DRIFT_LLAMA_GPU_LAYERS` or run CPU-only.
