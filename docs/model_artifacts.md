# Model Artifacts

## Runtime Artifact

DriftLedger local inference uses:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

This file is the merged DriftLedger LoRA quantized to Q4_K_M. It is not committed to Git.

## Build Inputs

Only needed when rebuilding the GGUF:

```text
models/base/Qwen2.5-7B-Instruct
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA
models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip
```

The Docker runtime does not need the base model folder when the Q4 GGUF exists.

## What Not To Commit

- GGUF model files
- Hugging Face base model cache
- extracted base model folders
- adapter zips unless explicitly intended

## Rebuild

```powershell
python -m pip install -r tools\requirements-local-model.txt
python tools\build_q4km_model.py
```
