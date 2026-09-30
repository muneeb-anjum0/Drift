# Phase III Model Evidence

Status: Baseline V0 preparation, 2026-09-30. This document is cumulative and distinguishes verified evidence from inference and unknowns.

## Recovery and resource incident

Verified kernel evidence identifies the interrupted operation as the legacy CPU PyTorch LoRA merge. At 2026-09-30 19:57:04 the kernel OOM killer terminated Python PID 1073676 while checkpoint shard 2 of 4 was loading. The process had 7,755,124 KiB anonymous RSS and approximately 4.5 GiB of swap entries. Docker had already stopped cleanly, llama.cpp had not started, no evaluation had begun, and no partial merged output existed. The legacy path is no longer the default build path.

Reconstruction resumed sequentially with cgroup limits and several GiB of desktop headroom. Lazy base conversion, lazy LoRA conversion, tensor-streaming merge, and Q4_K_M quantization each completed on CPU with zero process swaps. Peak RSS was approximately 3.84 GiB, 0.91 GiB, 1.57 GiB, and 3.51 GiB respectively.

## Verified identity and provenance

The base revision, adapter identity, exact artifact hashes, llama.cpp commit, conversion stages, runtime settings, and code identities are recorded in [model-artifact-manifest.json](model-artifact-manifest.json). `Model/` remained read-only and ignored. Generated weights remain under ignored `models/` paths.

Training data provenance is **unknown**. No recovered dataset was found. The final adapter equals recovered checkpoint 1041 by SHA256. The adapter configuration verifies PEFT LoRA over Qwen2.5-7B-Instruct; the v5 label is inferred from the recovered directory name.

## CPU-only runtime proof

Effective container arguments were:

```text
--ctx-size 768 --n-gpu-layers 0 --device none --threads 6 --parallel 1
```

The container had no Docker device requests. Startup logs stated that no usable GPU was found and that llama.cpp was compiled without GPU support. Logs reported one slot and context 768. `nvidia-smi` showed no compute process. The model mount was read-only and the llama container was bounded to 7 GiB RAM and 8 GiB combined RAM/swap.

## Conservative smoke results

Before model load, host memory availability was 11,545,321,472 bytes and swap use was 2,372,562,944 bytes. Readiness transitioned from HTTP 503 to 200 about 5.4 seconds after container start. After load, host memory availability was 8,184,639,488 bytes and llama used about 3.018 GiB.

The first and only direct smoke request used the unchanged prompt and decoding configuration. It returned valid JSON with label `added`, confidence 0.8, 41 predicted tokens, 4.48 predicted tokens/s, and 15.94 seconds request latency. Measured llama memory peaked at about 3.054 GiB; host memory availability remained above 8.1 GB and swap stayed near 2.26 GB.

One subsequent authenticated Go `analyze-direct` request proved the Go → FastAPI → llama.cpp path. It returned normalized label `added`, confidence 0.87, in 10.36 seconds. Llama memory peaked at about 3.064 GiB. No benchmark or concurrency test had run at this point.

## Leakage warning

The existing historical examples recur in source, tests, and UI material. `drift_postprocess.go` contains deterministic compensation aligned with several canonical cases. The historical benchmark remains valuable as a frozen regression measurement, but it is not independent held-out evidence and must not be used alone to claim model quality.

## Pending evidence

Baseline V0 metrics, per-class metrics, confusion matrix, larger dataset results, retrieval measurement, postprocessing ablation, adversarial robustness, calibration, repeated-run stability, failure recovery, and concurrency characterization remain pending. GPU results are **not tested in Phase III**.
