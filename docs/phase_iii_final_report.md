# Phase III Model Engineering Report

Status: **Baseline V0 evidence complete; no optimized candidate promoted.** Date: 2026-10-01.

## Decision

Keep Baseline V0 as the reproducible reference artifact, but do not describe it as production-quality or independently held-out. Raw development accuracy is 66.7%, macro F1 is 66.9%, retrieval delivers all expected requirements for 66.7% of queries, and canonical postprocessing is net negative by one case. The system is operationally bounded and recoverable on CPU, but semantic quality and retrieval do not meet the post-baseline candidate gates.

No prompt, adapter, retrieval threshold, taxonomy, expected label, postprocessing rule, or model weight was tuned during baseline measurement. There is no final candidate to compare or promote.

## Evidence status

| Area | Status | Result |
|---|---|---|
| Model identity and provenance | VERIFIED | Qwen2.5-7B-Instruct revision `a09a354...` plus recovered LoRA SHA256 `97dd550...`; training dataset UNKNOWN. |
| Reconstruction | VERIFIED | CPU-streamed base conversion, LoRA conversion, merge, and Q4_K_M quantization are scripted and hashed. |
| Evaluated artifact | VERIFIED | `DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`, 4,683,074,112 bytes, SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. |
| CPU-only execution | VERIFIED | Device offload disabled, GPU layers 0, no Docker devices, one slot, six threads, context 768. |
| Dataset provenance | PARTIALLY VERIFIED | New corpora are versioned and prospective; independence from unrecovered training data cannot be proven. |
| Historical regression | VERIFIED / CONTAMINATED | Go-direct 8/10; full pipeline 8/8. Cases occur in repository rules/tests. |
| Raw model quality | VERIFIED ON DEVELOPMENT DATA | 32/48, accuracy 66.7%, macro F1 66.9%, 95% bootstrap interval 52.1–79.2% accuracy. |
| Retrieval | VERIFIED ON DEVELOPMENT DATA | Recall@1 68.8%, Recall@3 81.3%, MRR 0.837; model-input recall 66.7%. |
| Postprocessing | VERIFIED ON DEVELOPMENT DATA | 1 correction, 2 introduced errors, 45 no effect; net -1 case. |
| Structured output | VERIFIED | 25/48 strict JSON; 48/48 normalized contract parse; no unknown labels, missing fields, range errors, or truncation. |
| Calibration | VERIFIED ON DEVELOPMENT DATA | ECE 0.214, correctness Brier 0.255; two high-confidence wrong answers at 0.95. |
| Stability | PARTIALLY VERIFIED | Six cases × three runs: labels, confidences, and exact outputs stable in all six. |
| CPU performance | VERIFIED ON THIS HOST | Load ~5.4s; raw p50 12.50s, p90 15.55s, p95 15.90s; 4.92 generated tokens/s. |
| Concurrency | PARTIALLY VERIFIED | 1/2/4 clients succeeded; one slot queued work, throughput stayed ~0.13–0.14 req/s. |
| Failure recovery | VERIFIED | llama unavailable produced explicit 503/502, no persisted analysis, readiness restored in 8.17s. |
| Quantization quality cost | UNVERIFIED ON CURRENT HARDWARE | F16 artifact is 15.24 GB and was not loaded on a 15 GiB workstation. |
| GPU quality, latency, VRAM | NOT TESTED IN PHASE III | No GPU/CUDA/Vulkan model operation was performed. |
| Dedicated multi-change recall | UNVERIFIED | Existing full-system cases can select multiple requirements, but no dedicated labeled multi-change corpus was run. |
| Changed-elements set quality | UNVERIFIED QUANTITATIVELY | Raw values are preserved; no independent set-level ground truth exists. |
| Reasoning and hallucination | PARTIALLY VERIFIED | Single-reviewer inspection of 48 outputs found one clear fabricated conflict rationale (`same_gov_01`) and several misleading explanations tied to wrong labels; no formal multi-review score. |

## Identity and reconstruction

The base model is `Qwen/Qwen2.5-7B-Instruct` at revision `a09a35458c702b33eeacc393d103063234e8bc28`. The protected recovered adapter is LoRA rank 16, alpha 32, dropout 0.05 over q/k/v/o/gate/up/down projections. The final adapter and checkpoint 1041 are byte-identical. llama.cpp is tag `b11151`, commit `bd4f514db14d87fded667787a7a963bfbaa98e89`.

Reconstruction resource peaks were approximately 3.84 GiB for base conversion, 0.91 GiB for LoRA conversion, 1.57 GiB for streaming merge, and 3.51 GiB for quantization, all with zero process swaps. The legacy PyTorch merge is guarded because a prior attempt caused a verified host OOM while loading shard 2/4.

## Quality findings

Per-class precision / recall / F1 on `drift-raw-dev` 1.0.0 (8 cases per class):

| Label | Precision | Recall | F1 |
|---|---:|---:|---:|
| added | 1.000 | 0.625 | 0.769 |
| modified | 0.421 | 1.000 | 0.593 |
| removed | 0.800 | 0.500 | 0.615 |
| contradiction | 0.714 | 0.625 | 0.667 |
| ambiguous | 1.000 | 0.375 | 0.545 |
| unchanged | 0.778 | 0.875 | 0.824 |

The confusion matrix and every per-case result are machine-readable in [raw_model_dev_v1.summary.json](../evaluation/reports/raw_model_dev_v1.summary.json). The dominant pattern is overprediction of `modified`. Prompt-injection-tagged accuracy is 2/6. Paraphrase-tagged accuracy is 2/3; all eight `unchanged` cases yield 7/8 recall. Negation-tagged accuracy is 2/3 and double-negation-tagged accuracy is 3/3. These tag subsets are small and should not be overgeneralized.

Manual reasoning review found explanations generally grounded when the label was correct. Wrong cases often described the semantic change accurately but mapped it to the wrong taxonomy boundary. `same_gov_01` invented a download-timing conflict where both texts specify access after submission; `amb_reporting_01` treated injected pseudo-instructions as business intent. This supports explicit human review and non-authoritative model output.

## Retrieval and pipeline separation

Raw ranking reached 81.3% Recall@3, but the production relevance gate and cap reduced model-input recall to 66.7%. Eight of 24 queries lost at least one expected requirement before inference. Small-project model-input recall was 100%; medium and larger projects were each 50%. These are retrieval failures, not classifier failures.

The full-system historical suite passed 8/8, but its canonical rules encode the same scenarios. Its 30.90s mean latency reflects multiple sequential model calls and cannot establish independent quality. Postprocessing on the prospective raw corpus reduced accuracy from 66.7% to 64.6%.

## CPU and operational behavior

Test host: Intel Core i7-8750H, 6 cores/12 threads, approximately 15 GiB RAM, Fedora kernel 7.2.7, Docker Engine 29.8.1. Raw warm inference p50/p90/p95 was 12.50/15.55/15.90 seconds, maximum 18.48 seconds, at 4.92 generated tokens/s. During the 48-case run, llama remained under its 7 GiB cgroup limit and no request failed.

At 1/2/4 concurrent clients, all requests succeeded, but throughput remained flat because llama had one slot. Mean latency was 7.35/10.48/18.58 seconds, with a 30.33-second maximum at four clients. Controlled llama shutdown produced explicit failure and no state corruption. Restart caused zram use to rise, so further stress was stopped.

## Failed and negative experiments

- Legacy PyTorch LoRA merge: host OOM; replaced by bounded streaming GGUF reconstruction.
- First historical benchmark attempt: HTTP 401 before any case because the evaluation health request omitted its internal credential; fixed and regression-tested in `372af75`.
- Postprocessing ablation: net -1 correct case, preserved rather than hidden.
- Higher-precision comparison: not attempted because artifact size and host headroom made it unsafe.
- FastAPI restart and concurrency above four: not attempted after restart increased zram use.

## Remaining work before promotion

1. Create and freeze the independently reviewed final test described in [evaluation-strategy.md](evaluation-strategy.md).
2. Improve retrieval independently and validate it without increasing irrelevant model calls.
3. Measure a dedicated multi-change project corpus, changed-elements quality, and multi-review reasoning/hallucination quality.
4. Only then evaluate one isolated candidate change against Baseline V0 and the sealed test.
5. Keep Baseline V0 unless the candidate meets [model-acceptance-criteria.md](model-acceptance-criteria.md) without material regressions.

The cumulative evidence, exact commands, resource observations, and report links are in [phase_iii_evidence.md](phase_iii_evidence.md). Artifact provenance is in [model-artifact-manifest.json](model-artifact-manifest.json).
