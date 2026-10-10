# Model Pipeline

**Status:** This is the existing runtime and historical reconstruction guide, not authorization to build, train, replace, or evaluate a new model. Phase III research is frozen; retain the original GGUF. The Phase III-J candidate was rejected and the reviewed development set is closed for future tuning. See [Model Research Status](model_research_status.md) before any model-related work.

Model work is separate from normal software development. Standard setup, verification, and CI neither download nor run weights.

## Runtime artifact

The supported local runtime artifact is:

```text
models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
```

The build inputs are `models/base/Qwen2.5-7B-Instruct` and the DriftLedger LoRA adapter under `models/adapters/`. The low-memory build lazily converts each source to GGUF, performs a tensor-streaming LoRA merge, and then quantizes the merged F16 GGUF to Q4_K_M. Quantization is packaging, not training.

Large artifacts and the recovered top-level `Model/` directory are local-only. Do not move, edit, or commit them as part of software work.

## Build tooling

On a machine intended for model construction:

```bash
python -m pip install -r tools/model/requirements-local-model.txt
make model-build
```

The orchestrator validates existing inputs and skips valid completed stages. Its sequential stages are `setup_llama_cpp.py`, `convert_sources_to_gguf.py`, `merge_gguf_lora.py`, and `quantize_gguf_q4km.py`. Each generated final filename is reached through a temporary file. Never run these model-heavy stages concurrently.

The llama.cpp checkout is pinned at `b11151` and placed under `tools/model/vendor/llama.cpp` (ignored by Git). The Phase III build is CPU-only. The legacy `merge_lora_to_base.py` PyTorch path is not used: it caused a verified host OOM on this 15 GiB workstation.

Before a rebuild, stop unnecessary containers and inspect `free -h` and large processes. On Linux systems with systemd, a user scope can add a defensive memory boundary around an individual stage. Do not blindly copy a limit to a machine with different resources.

## Start model execution explicitly

CPU:

```bash
docker compose --profile model up -d llama
```

The effective CPU profile explicitly sets GPU layers to zero, disables device offload, uses one parallel slot, mounts model files read-only, and applies a 7 GiB container memory limit. Baseline V0 uses context 768 and six CPU threads.

NVIDIA GPU:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile model up -d llama
```

The default stack is CPU-safe and leaves llama.cpp stopped. GPU execution and the GPU Compose override were not used for Phase III.

## Verify configuration and runtime

Configuration-only checks do not invoke the model:

```bash
python tools/verification/check_local_drift_setup.py
python tools/verification/test_q4km_config.py
```

The artifact identity and measured reconstruction resources are in [Model Artifact Manifest](model-artifact-manifest.json). Baseline limitations and evidence are in [Model Card](model-card.md) and [Phase III Model Evidence](phase_iii_evidence.md).

Commands that require a running model are explicit:

```bash
make model-smoke
make model-eval
```

The evaluation command writes CLI reports under `reports/evaluation`; the in-app evaluation keeps its current run in application memory. Model quality and latency are never inferred from model-free contract tests.

## Runtime contract

FastAPI constructs the existing Qwen chat prompt, calls llama.cpp `/completion`, and accepts `content`, `response`, or `text` from its response envelope. The normalized prediction contains `label`, `confidence`, `reasoning`, and `changed_elements`. Go independently revalidates that contract before using it in a preview.

See [Configuration](configuration.md) for environment variables and [Verification](verification.md) for the boundary between software confidence and model-quality evidence.
