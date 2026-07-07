# GGUF Q4_K_M Setup

`Q4_K_M` is quantization after merging. It is not training.

Q4_K_M is now the default DriftLedger local model because it should preserve more model quality than Q3_K_M while still being smaller than F16.

## Build

```powershell
cd "D:\Desktop\2. PROJECTS\Drift\Drift-app"
python -m pip install -r tools\requirements-q3km.txt
python tools\build_q4km_model.py
```

The build script reuses the existing local flow:

```text
Qwen2.5-7B-Instruct + DriftLedger LoRA
merge to local model folder
convert merged model to F16 GGUF
quantize F16 GGUF to Q4_K_M
```

Final output:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

Force only the quantization step:

```powershell
python tools\quantize_gguf_q4km.py --force
```

## Fallback

Q3_K_M is still kept for weaker PCs:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

To switch Docker back to Q3_K_M:

```env
DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
VITE_DRIFT_MODEL_LABEL=Qwen2.5-7B + DriftLedger LoRA (GGUF Q3_K_M)
```

Q4_K_M may use more RAM/VRAM and may be slower. On a GTX 1060 Max-Q 6GB, expect it to be tight or CPU-bound.
