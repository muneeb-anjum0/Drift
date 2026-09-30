# Model Pipeline

Model work is separate from normal software development. Standard setup, verification, and CI neither download nor run weights.

## Runtime artifact

The supported local runtime artifact is:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

The build inputs are `models/base/Qwen2.5-7B-Instruct` and the DriftLedger LoRA adapter under `models/adapters/`. The build merges those inputs, converts the merged model to F16 GGUF, then quantizes it to Q4_K_M. Quantization is packaging, not training.

Large artifacts and the recovered top-level `Model/` directory are local-only. Do not move, edit, or commit them as part of software work.

## Build tooling

On a machine intended for model construction:

```bash
python -m pip install -r tools/model/requirements-local-model.txt
python tools/model/build_q4km_model.py
```

The orchestrator validates existing inputs and skips valid completed stages. Individual stages are available as `download_base_model.py`, `merge_lora_to_base.py`, `setup_llama_cpp.py`, `convert_merged_to_gguf.py`, and `quantize_gguf_q4km.py` in `tools/model/`.

The llama.cpp checkout is pinned and placed under `tools/model/vendor/llama.cpp` (ignored by Git). Build CPU tools by default; use the explicit CUDA option only on a configured GPU host.

## Start model execution explicitly

CPU:

```bash
docker compose --profile model up -d llama
```

NVIDIA GPU:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile model up -d llama
```

The default stack is CPU-safe and leaves llama.cpp stopped. Increase GPU layers gradually only after confirming available VRAM.

## Verify configuration and runtime

Configuration-only checks do not invoke the model:

```bash
python tools/verification/check_local_drift_setup.py
python tools/verification/test_q4km_config.py
```

Commands that require a running model are explicit:

```bash
make model-smoke
make model-eval
```

The evaluation command writes CLI reports under `reports/evaluation`; the in-app evaluation keeps its current run in application memory. Model quality and latency are never inferred from model-free contract tests.

## Runtime contract

FastAPI constructs the existing Qwen chat prompt, calls llama.cpp `/completion`, and accepts `content`, `response`, or `text` from its response envelope. The normalized prediction contains `label`, `confidence`, `reasoning`, and `changed_elements`. Go independently revalidates that contract before using it in a preview.

See [Configuration](configuration.md) for environment variables and [Verification](verification.md) for the boundary between software confidence and model-quality evidence.
