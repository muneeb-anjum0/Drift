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

Initial smoke evidence: model load reached readiness in about 5.4 seconds at approximately 3.02 GiB container memory. A direct completion produced 41 tokens at 4.48 tokens/s in 15.94 seconds; an authenticated Go-to-FastAPI smoke inference completed in 10.36 seconds. These are two observations, not a latency distribution.

## Supported and unsupported use

Supported: local, review-assisted requirement-drift analysis under the validated contract. Unsupported: autonomous scope decisions, authorization, legal or safety-critical decisions, calibrated risk estimation, arbitrary chat, and claims about domains or languages not measured by a versioned dataset.

## Known limitations

- Model-quality metrics are pending Baseline V0 evaluation.
- Training/evaluation leakage cannot be excluded because training data is missing.
- The historical repository benchmark is contaminated as independent evidence: examples and expected semantics appear in deterministic postprocessing and tests.
- Raw-model quality must be reported separately from parsing, normalization, retrieval, and postprocessing.
- GPU quality, latency, and VRAM are not tested in Phase III.
