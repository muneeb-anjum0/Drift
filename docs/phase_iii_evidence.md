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

One subsequent authenticated Go `analyze-direct` request proved the Go → FastAPI → llama.cpp path. It returned normalized label `added`, confidence 0.87, in 10.36 seconds. Llama memory peaked at about 3.064 GiB.

## Leakage warning

The existing historical examples recur in source, tests, and UI material. `drift_postprocess.go` contains deterministic compensation aligned with several canonical cases. The historical benchmark remains valuable as a frozen regression measurement, but it is not independent held-out evidence and must not be used alone to claim model quality.

The unchanged 10-case historical Go-direct benchmark initially failed before its first case because its health probe omitted the internal inference credential and received HTTP 401. That failed experiment is preserved in the report. Commit `372af75` added the credential and a regression test without changing cases, expected answers, prompt, decoding, or postprocessing. The rerun scored 8/10 (80%), averaging 11.39 seconds per case. Errors were `unchanged→added` and `added→modified`. See [historical_go_direct_v0.json](../evaluation/reports/historical_go_direct_v0.json).

## Raw-model development baseline

`drift-raw-dev` 1.0.0 is a prospective 48-case corpus balanced at eight cases per label across 16 domains. It contains 12 easy, 18 medium, 12 hard, and 6 adversarial cases. The dataset SHA256 is `5265b80a265ff7b1090ec1a6a7d4879a9b6e7a7d0a64123071af7b343fad31eb`. It was authored after adapter training, but it is **not proven held out** because the training set is missing. It is a development set and must not become the future sealed final test.

Sequential raw llama.cpp evaluation produced:

- 32/48 correct: accuracy 66.7%, macro F1 66.9%, bootstrap 95% intervals 52.1–79.2% accuracy and 50.4–78.8% macro F1.
- Recall: modified 100%, unchanged 87.5%, added 62.5%, contradiction 62.5%, removed 50%, ambiguous 37.5%.
- All 48 responses were recoverable by the production-compatible contract normalizer, but only 25/48 were strict JSON as returned. The others primarily appended a period or escaped newline. This separates 100% contract parse success from 52.1% strict-output compliance.
- Mean latency 12.75 seconds, p50 12.50 seconds, p90 15.55 seconds, p95 15.90 seconds, maximum 18.48 seconds, and mean generation 4.92 tokens/s. These are 48 sequential warm CPU requests with one slot.
- Confidence was overconfident: 10-bin ECE 0.214 and correctness Brier score 0.255. Two incorrect cases had confidence 0.95.
- Accuracy by difficulty was easy 11/12, medium 10/18, hard 9/12, adversarial 2/6. Prompt-injection-tagged cases were 2/6.

The main error cluster is overprediction of `modified`: three additions, three removals, three contradictions, and two ambiguous cases were assigned `modified`. Partial removals, explicit invariant exceptions, missing-detail ambiguity, and prompt-injection text are recurring weaknesses. The exact aggregate and per-case hashes are in [raw_model_dev_v1.summary.json](../evaluation/reports/raw_model_dev_v1.summary.json); the full local evidence artifact at evaluation time was `/tmp/drift-phase3-reports/raw_model_dev_v1.json`, SHA256 `bef0f7814a93c51002d9dfcbfb250389f7fda6f462257a75514e4f92c9ecf35f`.

## Postprocessing ablation

Applying the existing production `CleanDetectedChanges` rules to the same 48 raw predictions corrected one error, introduced two errors, and had no label effect on 45 cases. Accuracy fell from 32/48 (66.7%) to 31/48 (64.6%), a net contribution of -1 case. The correction and one introduced error both came from the broad `authentication method` term in the SMS-OTP canonical rule; the other introduced error came from the broad `filters` term in the interactive-report rule. This confirms that repository canonical rules are evaluation-specific model compensation, not a generally reliable classifier layer. The code has not been tuned or removed. See [postprocess_ablation_dev_v1.json](../evaluation/reports/postprocess_ablation_dev_v1.json).

## Resource observation

Before the 48-case sequential run, the host had 6.6 GiB available and 101 MiB swap in use; llama used about 4.78 GiB. After the run, the host had 5.8 GiB available and 85 MiB swap in use; llama used about 5.18 GiB. No request failed, the container remained below its 7 GiB limit, and concurrency remained one.

## Pending evidence

Retrieval measurement, full-system project evaluation, multi-change coverage, repeated-run stability, controlled failure recovery, and modest concurrency characterization remain pending. Higher-precision CPU comparison is impractical on this host and remains unverified. GPU quality, latency, and VRAM are **UNVERIFIED** and no model operation used the GPU.
