# DriftLedger Model Card — Baseline V0 through Phase III-D Evidence

## Purpose and boundary

DriftLedger classifies the semantic relationship between one baseline software requirement and one new client message. Its output is untrusted input to deterministic Go validation, retrieval, scoring, aggregation, authorization, and persistence. It must not make product-state decisions.

The implemented labels are `added`, `modified`, `removed`, `contradiction`, `ambiguous`, and `unchanged`. They describe requirement drift; confidence is a model-provided score and is not a calibrated probability.

## Identity

- Base: `Qwen/Qwen2.5-7B-Instruct` at revision `a09a35458c702b33eeacc393d103063234e8bc28`.
- Adapter: recovered DriftLedger v5 PEFT LoRA, rank 16, alpha 32, SHA256 `97dd550561f64f4d07880079e1b8df60642a8ea5e195bc1fc1982548a88df4af`.
- Runtime: merged GGUF Q4_K_M, SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`.
- Conversion: CPU-only llama.cpp `b11151` / `bd4f514db14d87fded667787a7a963bfbaa98e89`.

The complete machine-readable identity is in [model-artifact-manifest.json](model-artifact-manifest.json).

Baseline V0 remains the reference artifact. Phase III-B did not change the model weights or quantization. A combined `V1-candidate` changed deterministic retrieval normalization, the task prompt, and postprocessing behavior on the local experiment branch; it was rejected on final heldout retrieval and was not promoted, merged, pushed, or tagged as a release.

## Training information

Recovered checkpoints show one LoRA epoch ending at step 1041 and a final recorded evaluation loss of 0.067127. The training dataset, its hash, its split methodology, and whether any current evaluation examples were held out are **unknown**. Consequently, no evaluation set can yet be claimed held out from adapter training.

## Runtime tested

Baseline V0 uses CPU only, GPU layers 0, device offload disabled, one llama slot, six CPU threads, context 768, deterministic temperature 0, top-p 1, and at most 120 generated tokens. Hardware is an Intel Core i7-8750H (6 cores/12 threads) with approximately 15 GiB RAM and 8 GiB zram swap.

Initial smoke evidence: model load reached readiness in about 5.4 seconds at approximately 3.02 GiB container memory. A direct completion produced 41 tokens at 4.48 tokens/s in 15.94 seconds; an authenticated Go-to-FastAPI smoke inference completed in 10.36 seconds.

On the balanced 48-case `drift-raw-dev` 1.0.0 development corpus, the raw model achieved 66.7% accuracy and 66.9% macro F1. Mean latency was 12.75 seconds, p95 15.90 seconds, with 4.92 generated tokens/s. All outputs were contract-parseable, while 52.1% were strict JSON without recovery. This corpus is not proven held out because the training data is unknown; metrics are baseline development evidence, not a generalization claim.

Six representative cases produced identical labels, confidences, and raw output hashes across three temperature-zero repetitions. With one llama slot, 1/2/4 concurrent clients all completed, but throughput stayed flat while mean latency increased from 7.35 to 18.58 seconds. The eight-case contaminated full-system regression passed 8/8 at 30.90 seconds average latency.

## Phase III-B candidate evidence

The accepted isolated prompt P1 defines mutually exclusive label boundaries and treats compared fields as untrusted business content. On the 48-case development corpus it improved raw accuracy from 32/48 (66.7%) to 36/48 (75.0%) and macro F1 from 0.669 to 0.756. Strict JSON improved from 52.1% to 100%, contract parsing remained 100%, and p95 latency rose 3.4% from 15.90s to 16.44s. Removed recall remained only 50%.

On the frozen 24-case final raw set, the same unchanged artifact with P1 improved from 17/24 (70.8%, macro F1 0.691) to 19/24 (79.2%, macro F1 0.786). Contract parsing was 100% for both, strict JSON improved from 70.8% to 100%, and p95 latency was 13.62s for V0 versus 13.60s for P1. Four V0 errors were corrected, two correct V0 cases regressed, and the small-sample bootstrap intervals overlap.

Postprocessing PP1 prevents scenario-specific presentation rules from overwriting a validated semantic label. It changed no label on either the 48-case P1 development replay or the 24-case final P1 output. This removes V0 development's net -1 postprocessing regression while retaining grouping and enrichment.

The combined candidate was rejected because its accepted development retrieval change did not generalize to the frozen retrieval final set. V0 reached every expected requirement in 5/12 queries (45.8% model-input recall); V1 reached all expected requirements in 4/12 (37.5%). Therefore the raw prompt gain is measured evidence, but the integrated V1 configuration is not an accepted successor.

## Phase III-C retrieval evidence

Phase III-C restored exact V0 retrieval while preserving P1 and PP1, added scorer-native traces, and expanded retrieval development from 24 to 60 queries. The expansion has 54 positive queries, six zero-target hard negatives, and 74 expected requirement links. It is synthetic, single-author, and development-only.

R0 delivered 48/74 expected links to the model (64.9% micro recall), reached all targets for 34/54 positive queries, produced 32 false exposures, and selected 1.33 requirements/query. The selected development candidate R5 adds conservative verb-suffix normalization and a compact business-domain alias vocabulary. It delivered 59/74 links (79.7%), reached all targets for 42/54 queries, produced 37 false exposures, and selected 1.60 requirements/query. All six zero-target cases remained unselected. R5 remains below the existing 90% overall and 85%-per-size acceptance gates: small/medium/large micro recall is 68.0%/92.0%/79.2%.

R5 was therefore a **development-selected retrieval candidate, not a promoted V2**. At the end of Phase III-C, the Phase III-B final sets were closed and no new independently reviewed retrieval set existed. Downstream R5 + raw/P1/PP1 inference was not run. P1 and PP1 source stayed unchanged, and retrieval-specific normalization was explicitly isolated from PP1 grouping.

## Phase III-D independent retrieval check

After the Phase III-C development selection, 40 synthetic queries across four new medium-sized projects received user-supplied review decisions (35 confirmed, five revised) and were frozen before R0/R5 execution. The reviewer identifier was supplied as `independent-reviewer-gpt-5.6-sol`; this record does not independently prove human identity or reviewer independence. Original adapter-training overlap also remains unknown. The complete [Phase III-D report](phase_iii_d_final_report.md) retains the proposed and reviewed labels, hashes, case-level traces, and limitations.

R0 and R5 each delivered 25/42 reviewed expected requirement links and fully reached 16/32 positive queries. R5 created one additional false exposure, selecting `bm-images` for `bm-q08` without a new correct hit. Both had zero selections on eight hard negatives. R5 **failed** the predeclared independent generalisation gate and remains unpromoted. Only medium-sized projects were measured; no small/large claim is supported.

The predeclared V3 end-to-end prerequisite was therefore false. No Phase III-D model inference, oracle ablation, P1/PP1 independent effect, or model latency was measured. These missing measurements are not model failures. Retraining remains **NOT YET JUSTIFIED** because retrieval omitted 17/42 expected links, and new semantic model errors after correct delivery have not been isolated with reviewed end-to-end labels. No weights, prompt, postprocessor, or model configuration changed.

## Phase III-E retrieval-only evidence

The reviewed Phase III-E set spans three new projects with 8, 16, and 32 requirements. The frozen R6-S1 small CPU sentence encoder recovered 22/36 reviewed target links, versus 20/36 for both R0 and R5, but failed the unchanged retrieval acceptance gates: 61.1% overall, 90% small, 50% medium, and 50% large. Its two-link gain over R5 does not establish generalisation. The [Phase III-E report](phase_iii_e_final_report.md) records the independent review, frozen identities, false exposures, categories, and uncertainty. R6 remains an offline research candidate; the Go production retriever, P1, PP1, Q4_K_M artifact, and CPU configuration were not changed or promoted.

Because the R6 prerequisite failed, Phase III-E did not invoke this 7B model or measure oracle retrieval, raw classification, PP1, V3, or end-to-end quality. No new model-quality or retraining claim follows from a retrieval-only test. Retraining remains **NOT YET JUSTIFIED**.

Retraining is **NOT YET JUSTIFIED**. Deterministic retrieval remains below gate, the model improved materially from prompting alone, training provenance is missing, and there is no clean training corpus or independent future test.

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
- P1 improved the tested label boundary but still missed 5/24 final raw cases, including one modification, one contradiction, two ambiguous cases, and one unchanged case.
- Retrieval remains the promotion blocker. Development-only improvements did not generalize under the final all-expected-reach gate.
- Phase III-B final sets are closed to future tuning. They are prospective relative to this phase but synthetic, single-author, and not provably independent of the missing adapter-training corpus.
- Phase III-C R5 aliases were selected on synthetic development data; the Phase III-D protected retrieval check found no target-reach gain and one extra false exposure, so independent generalisation was not supported.
- R5 still misses 15/74 expected links: eight below threshold, four at the specific-match gate, and three under top-k competition.
- Requirement status exists in snapshots, but inactive/rejected filtering has no defined baseline contract; immutable historical baseline semantics currently include every snapshotted non-empty requirement.
