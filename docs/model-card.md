# DriftLedger Model Card — Baseline V0

## Purpose and boundary

DriftLedger classifies the semantic relationship between one baseline software requirement and one new client message. Its output is untrusted input to deterministic Go validation, retrieval, scoring, aggregation, authorization, and persistence. It must not make product-state decisions.

The implemented labels are `added`, `modified`, `removed`, `contradiction`, `ambiguous`, and `unchanged`. They describe requirement drift; confidence is a model-provided score and is not a calibrated probability.

## Identity

- Base: `Qwen/Qwen2.5-7B-Instruct` at revision `a09a35458c702b33eeacc393d103063234e8bc28`.
- Adapter: recovered DriftLedger v5 PEFT LoRA, rank 16, alpha 32, SHA256 `97dd550561f64f4d07880079e1b8df60642a8ea5e195bc1fc1982548a88df4af`.
- Runtime: merged GGUF Q4_K_M, SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`.
- Conversion: CPU-only llama.cpp `b11151` / `bd4f514db14d87fded667787a7a963bfbaa98e89`.

The complete machine-readable identity is in [model-artifact-manifest.json](model-artifact-manifest.json).

## Training information

Recovered checkpoints show one LoRA epoch ending at step 1041 and a final recorded evaluation loss of 0.067127. The training dataset, its hash, its split methodology, and whether any current evaluation examples were held out are **unknown**. Consequently, no evaluation set can yet be claimed held out from adapter training.

## Runtime tested

Baseline V0 uses CPU only, GPU layers 0, device offload disabled, one llama slot, six CPU threads, context 768, deterministic temperature 0, top-p 1, and at most 120 generated tokens. Hardware is an Intel Core i7-8750H (6 cores/12 threads) with approximately 15 GiB RAM and 8 GiB zram swap.

Initial smoke evidence: model load reached readiness in about 5.4 seconds at approximately 3.02 GiB container memory. A direct completion produced 41 tokens at 4.48 tokens/s in 15.94 seconds; an authenticated Go-to-FastAPI smoke inference completed in 10.36 seconds.

On the balanced 48-case `drift-raw-dev` 1.0.0 development corpus, the raw model achieved 66.7% accuracy and 66.9% macro F1. Mean latency was 12.75 seconds, p95 15.90 seconds, with 4.92 generated tokens/s. All outputs were contract-parseable, while 52.1% were strict JSON without recovery. This corpus is not proven held out because the training data is unknown; metrics are baseline development evidence, not a generalization claim.

Six representative cases produced identical labels, confidences, and raw output hashes across three temperature-zero repetitions. With one llama slot, 1/2/4 concurrent clients all completed, but throughput stayed flat while mean latency increased from 7.35 to 18.58 seconds. The eight-case contaminated full-system regression passed 8/8 at 30.90 seconds average latency.

## Supported and unsupported use

Supported: local, review-assisted requirement-drift analysis under the validated contract. Unsupported: autonomous scope decisions, authorization, legal or safety-critical decisions, calibrated risk estimation, arbitrary chat, and claims about domains or languages not measured by a versioned dataset.

## Known limitations

- Ambiguous recall was 37.5%; removed recall 50%; added and contradiction recall 62.5%. The model strongly overpredicts `modified` on boundary cases.
- Confidence is not calibrated: development ECE was 0.214, and two incorrect predictions carried 0.95 confidence.
- Existing canonical postprocessing reduced accuracy by one case on the 48-case development corpus (one correction, two introduced errors).
- Production retrieval delivered every expected requirement to the model for 16/24 development queries (66.7%); a full-system miss may therefore precede model inference.
- Training/evaluation leakage cannot be excluded because training data is missing.
- The historical repository benchmark is contaminated as independent evidence: examples and expected semantics appear in deterministic postprocessing and tests.
- Raw-model quality must be reported separately from parsing, normalization, retrieval, and postprocessing.
- Prompt-injection-tagged development accuracy was 2/6; user-controlled pseudo-instructions remain a meaningful weakness.
- GPU quality, latency, and VRAM are not tested in Phase III.
- Higher-precision CPU inference is unverified: the 15.24 GB F16 artifact cannot be loaded with safe workstation headroom on this host.
