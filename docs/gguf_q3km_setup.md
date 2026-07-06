# GGUF Q3_K_M Setup

`Q3_K_M` is quantization after merging. It is not model training.

## Pipeline

1. Start with the local base model:

```text
models/base/Qwen2.5-7B-Instruct
```

2. Start with the trained LoRA adapter zip:

```text
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip
```

3. Merge the adapter into the base model:

```powershell
python tools\merge_lora_to_base.py
```

Output:

```text
models/merged/DriftLedger-Qwen2.5-7B-Merged
```

4. Convert the merged model to F16 GGUF:

```powershell
python tools\setup_llama_cpp.py
python tools\convert_merged_to_gguf.py
```

Output:

```text
models/gguf/DriftLedger-Qwen2.5-7B-F16.gguf
```

5. Quantize to Q3_K_M:

```powershell
python tools\quantize_gguf_q3km.py
```

Output:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
```

The one-command version is:

```powershell
python -m pip install -r tools\requirements-q3km.txt
python tools\build_q3km_model.py
```

## Expected Size

Q3_K_M for a 7B model is usually several GB, much smaller than the original safetensors base model. Exact size varies with tokenizer/config metadata and GGUF format version.

## 6GB GPU Settings

Use these defaults first:

```env
DRIFT_LLAMA_CTX_SIZE=768
DRIFT_LLAMA_GPU_LAYERS=16
DRIFT_LLAMA_THREADS=6
DRIFT_LLAMA_MAX_TOKENS=120
```

If VRAM is still too tight, reduce GPU layers. With `DRIFT_LLAMA_GPU_LAYERS=0`, llama.cpp runs on CPU RAM.

## Validation

```powershell
python tools\check_local_drift_setup.py
python tools\eval_q3km_smoke.py
```

`check_local_drift_setup.py` must pass before Docker startup is expected to work in GGUF mode.
