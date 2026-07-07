# GGUF Q4_K_M Setup

Q4_K_M is the only supported DriftLedger local runtime artifact.

## Build

```powershell
python -m pip install -r tools\requirements-local-model.txt
python tools\build_q4km_model.py
```

Pipeline:

```text
Qwen2.5-7B-Instruct + DriftLedger LoRA
merge locally
convert merged model to F16 GGUF
quantize F16 GGUF to Q4_K_M
```

Final output:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

Force only quantization:

```powershell
python tools\quantize_gguf_q4km.py --force
```

No training or evaluation files are used by runtime inference.
