# Phase III-J Label-Only Baseline Plan

## 1. Objective

Predeclare a **development-only, oracle-requirement, raw-output** evaluation of the original DriftLedger model on the six-class label task. Its purpose is to decide whether a further *label-classification* fine-tuning experiment is worth designing, not to select a deployable model, prove generalization, or rescue the rejected Phase III-J adapter. No retrieval, Go postprocessing, confidence threshold, generated explanation, or extraction result enters the primary score.

**THIS DOCUMENT DOES NOT AUTHORIZE EXECUTION.** It records the protocol and decision rule before any label-only baseline generation. Approval or rejection of this plan is the next action.

## 2. Architectural Context

The approved direction makes the model responsible for only one of `added`, `modified`, `removed`, `contradiction`, `ambiguous`, and `unchanged`; Go remains authoritative for product decisions and presentation ([output-contract review](phase_iii_j_model_output_contract_review.md)). The old P1 prompt asks for four fields, while Phase III-J training supervised only the reviewed label continuation (`evaluation/prompts/P1.json`; `tools/phase3j_kaggle/phase3j.py:180-219`). The rejected adapter's 0/124 four-field structural result is not a label-only measurement ([baseline outcome](phase_iii_j_baseline_outcome.md)). This plan changes neither frozen P1 nor its acceptance gate; it specifies a separate, explicitly versioned research prompt/contract for a possible future run.

## 3. Model Under Test

Use the **pre-Phase-III-J original DriftLedger Qwen2.5-7B LoRA merged GGUF Q4_K_M**, not untuned Qwen, not the Phase III-J checkpoint-60 adapter, and not any newly trained or repaired model. Its historical SHA-256 is `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`; the documented local path is `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf` (`docs/model-card.md:9-16`; `docs/phase_iii_i_final_report.md:5-11`; `services/inference/config.py:10`). Historical lineage is base revision `a09a35458c702b33eeacc393d103063234e8bc28` plus recovered v5 adapter; the merged GGUF hash, not an assumed base-only artifact, is the execution identity.

Before any future inference, verify the complete model-file hash and record the llama.cpp build/image, tokenizer/model identity, CPU hardware, runtime parameters, and source revision. A missing or mismatched artifact makes the study inconclusive until separately resolved; do not substitute another quantization or download a different model under the same name. Historical Phase III-I used llama.cpp `server-b11151` / build `b11151-bd4f514db`, context 768, one slot, six CPU threads, zero GPU layers, and no device offload (`docs/phase_iii_i_final_report.md:9-11`). Reuse that runtime where available; any unavoidable difference must be fixed and recorded *before* predictions and limits historical comparison. No GPU is part of this plan.

## 4. Dataset Boundary

The only case-level input is `evaluation/phase_iii_j/frozen/reviewed_development_v1.json`, SHA-256 `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`. It contains 124 scored, reviewed pairs: added 24, ambiguous 2, contradiction 16, modified 39, removed 24, unchanged 19 (`evaluation/phase_iii_j/frozen/pretraining_manifest_v1.json`; `docs/phase_iii_j_training_package.md`). Give the model exactly each row's `baseline_requirement` and `message`; score against `review.reviewed_label`, never `proposed_label`. Check row count, IDs, partition flag, primary-scored status, allowed labels, and checksum before starting. Keep the fixed ID order for the primary pass; do not drop hard cases or relabel disagreements. Do not read the train partition for this evaluation, and do not read, enumerate, load, or hash the sealed final payload.

These cases are AI-authored and separately AI-reviewed, not human-adjudicated (`docs/phase_iii_j_methodology_deviation.md`). The original adapter's training data and any overlap with this new development set are not fully known (`docs/model-card.md:20-23`). The development partition was used for Phase III-J checkpoint selection and failure diagnosis. It is suitable for a bounded *screening* decision with a predeclared rule, not an independent estimate of deployment performance. Only two ambiguous cases make class-specific inference especially weak; no conclusion that ambiguity is solved may follow from 2/2.

## 5. Label-Only Output Contract

Define a new, versioned research prompt, **P1-L1**, without editing `evaluation/prompts/P1.json`. Copy P1's comparison instruction, untrusted-content warning, six label definitions, boundary priority, and user-template baseline/message order verbatim. Replace only its four-field output sentence(s) with this fixed instruction:

> Return only a valid JSON object with exactly one key, `"label"`. Its value must be exactly one of `added`, `modified`, `removed`, `contradiction`, `ambiguous`, or `unchanged`. Do not include any other key or any text outside the object.

The existing user-template closing request, “Return only the required JSON object,” remains. No few-shot examples, forced `{"label":"` prefix, grammar/constrained decoder, retry, repair, JSON substring extraction, normalization of alternative labels, or API four-field wrapper is allowed in the primary measurement. Start generation at the empty assistant turn. A valid raw response must parse as **one complete JSON object** with exactly one `label` key and one canonical lower-case string value; JSON whitespace is allowed, but Markdown, trailing text, duplicate keys, extra fields, null, or wrong casing are invalid. A duplicate-key-aware strict parser is required for scoring. Invalid or truncated output counts as invalid *and* incorrect, with the raw text and reason preserved. No confidence, reasoning, or changed-elements field is generated, parsed, scored, or fabricated.

Hold P1's temperature 0, top-p 1, context 768, and two chat stop strings fixed; use one slot, CPU only, and a fixed 32-token output cap adequate for the one-field JSON. Record the runtime's top-k and seed behavior; set a fixed seed if supported and never rely on temperature zero alone as proof of determinism (`docs/phase_iii_i_final_report.md:9-11`). Freeze exact P1-L1 bytes and their hash before the first case. This is a *different output contract* from P1, so its structural rate is not a pass or relaxation of the old gate.

## 6. Metrics

Score the **first** raw result for all 124 rows, without majority vote or choosing a better repeat. Report:

- Accuracy = correct canonical labels / 124, including invalid outputs as wrong; macro F1 as the unweighted mean of all six class F1 values.
- Per-class support, true positives, false positives, false negatives, precision, recall, and F1. Zero-denominator precision/F1 is reported as zero with the convention stated, not omitted from macro F1.
- A six-row confusion matrix (reviewed truth) with six canonical predicted-label columns **plus an `INVALID` column**. Report the invalid reason counts separately.
- Strict label-only structural validity = valid one-key raw JSON / 124, independent of semantic accuracy. Do not count parser recovery as valid.
- Directed boundary counts with denominators: removed→modified / 24, contradiction→modified / 16, added→modified / 24; also their reverse directions, ambiguous correct / 2, ambiguous→modified / 2, and the full ambiguous prediction row. Report class imbalance and raw counts alongside percentages.
- Repeatability: exact raw-string agreement, valid/invalid agreement, and label agreement for each repeat versus the first pass; mismatches by ID. No consensus label replaces the primary prediction.

Report the exact scorer version, input/model/prompt hashes, inference settings, all raw responses, parsed outputs, and per-case score ledger in a durable development-only artifact location if execution is separately approved. A checksum of that artifact should be recorded. The present document produces none of those artifacts.

## 7. Historical Comparison Rules

| Evidence | Legitimate use | Direct metric comparison to this plan? |
| --- | --- | --- |
| Future candidate on the same 124 cases under identical P1-L1/scorer/runtime and frozen labels | Paired *development* comparison after a separately approved, predeclared candidate protocol. | **Yes, conditionally**; still not an independent final result, and repeated development selection risks overfit. |
| Phase III-I original-model oracle singleton: 73/90 correct, 80.89% macro F1, 90/90 old-contract valid; removed→modified 7/15 | Historical reason to set an approximately 80% adequacy target and watch removal. Same GGUF identity and semantic ontology, but different corpus/review, four-field P1, and generation budget. | **No** direct gain/loss or significance claim. Context only (`docs/phase_iii_i_final_report.md:23-55`). |
| Phase III-I.5 original-model oracle stress: 161/215 correct, 75.89% macro F1, 216/216 old-contract valid; removed→modified 16/43, contradiction→modified 15/28, added→modified 11/38 | Historical risk patterns and boundary-priority rationale. The corpus is deliberately adversarial/correlated with different supports and old contract. | **No** direct trend claim (`docs/phase_iii_i_5_final_report.md:21-55`). |
| Phase III-J rejected adapter: 0/124 valid under four-field P1, no locally preserved raw 124-case trace | Establishes rejection and why a clean label-only original-model baseline is needed. | Same development partition, **but no comparable semantic score**: different model and output contract; 0 macro F1 was driven by invalid structure (`docs/phase_iii_j_baseline_outcome.md`). |
| Phase III-B 48-case development/24-case final and Phase III-D/E retrieval or full-product studies | Background on old prompt/retrieval behavior only. Different samples, selection paths, contracts, or closed final status. | **No** pooled or longitudinal score comparison (`docs/model-card.md:26-78`). |
| Historical V5 synthetic benchmark, Go fixture/postprocessed results, any old four-field text reinterpreted as a label-only success, or sealed final data used for thresholds | Contaminated, task-mismatched, or forbidden for this decision. | **Invalid** as evidence of label-only generalization (`docs/model-card.md:81-90`; `docs/phase_iii_i_final_report.md:15-17`). |

No historical metric is silently re-scored through the new parser, and no prior closed corpus is reopened. If historical numbers disagree across reports, retain their original protocol and denominator rather than averaging them.

## 8. Retraining-Justification Gate

The following **screening gate is fixed before outputs**. It is intentionally a decision about whether a bounded label-training *proposal* is worth considering, not a modified Phase III-J acceptance gate or permission to train. The approximately 80% adequate macro-F1/accuracy level is anchored to the III-I oracle result; the lower material-deficit band is near the III-I.5 stress macro-F1. Directed-confusion triggers target the observed, product-relevant `modified` collapse. Counts are deliberately used because class supports differ and the ambiguous support is only two. These are policy thresholds, not confidence intervals or a claim of population prevalence.

**Prerequisites for either A or B:** exact identities/checksums and protocol; 124/124 strict-valid outputs on the primary pass; two full repeat passes with 124/124 strict-valid outputs and 124/124 exact label agreements with the primary pass. Record any raw-string differences even if labels agree. If a prerequisite fails, outcome **C — INCONCLUSIVE**; first diagnose prompt/runtime/structure, not weights. No retry of an individual failure is allowed.

Apply the following in order after prerequisites:

1. **B — RETRAINING JUSTIFIED (proposal only)** if *any* material semantic deficit occurs: removed→modified **at least 6/24**; contradiction→modified **at least 4/16**; added→modified **at least 6/24** *and* macro F1 below **0.80**; or accuracy **at most 89/124** *and* macro F1 below **0.75**. A B result means the correctly supplied requirement still exposes a substantial label-boundary problem worth a separately approved experiment; it does not imply that fine-tuning will fix it or authorize a run.
2. Otherwise **A — NO RETRAINING JUSTIFIED on current development evidence** only if accuracy is **at least 100/124**, macro F1 **at least 0.80**, removed→modified **at most 3/24**, contradiction→modified **at most 1/16**, added→modified **at most 3/24**, each of the other five classes has recall **at least 0.70**, and both ambiguous cases are correct. This is a high bar for spending more effort on weights, not a claim of production adequacy or robust ambiguous-class performance.
3. Every other valid, repeatable outcome is **C — INCONCLUSIVE**. In particular, borderline counts or one/both ambiguous errors without a material B trigger do not justify training from two ambiguous examples.

The bands are asymmetric on purpose: there is a gray zone rather than forcing every run into train/no-train. Do not revise cutoffs, switch primary metrics, choose a prompt variant, inspect selected errors to change their reviewed labels, or average repeats after seeing results. A result supporting B should be followed by review of whether errors are truly semantic and whether a feasible, separately reviewed target corpus exists; a retrieval miss is outside this oracle test. A result supporting A means *do not initiate label retraining from this evidence*, while leaving retrieval and product-contract work open.

## 9. Repeatability

Use the same verified artifact, frozen P1-L1, fixed hardware/runtime/settings, sequential row order, and fixed seed where supported for **three complete passes**. Pass one alone determines accuracy and confusion; passes two and three test agreement. Preserve each pass's raw text, output-token count, finish/truncation reason, parsed result, case ID, and timestamps. Compare raw bytes and canonical labels by ID; report both. Temperature-zero generation may still vary across implementation or hardware, so deterministic repeatability is an *observed requirement*, not an assumption. A label flip or invalid repeat yields C; a raw-text-only change is disclosed and investigated without selecting the prettier response. No pass is used to tune P1-L1 or the gate.

## 10. Failure / Inconclusive Conditions

Outcome C also applies to a wrong/missing model hash, changed development or P1 source hash, extra/missing rows, duplicate IDs, unsupported class, unavailable exact raw outputs, parser ambiguity, prompt/template mismatch, output truncation that prevents contract coverage, resource/runtime change mid-run, or an interrupted run whose first-pass status cannot be reconstructed. Do not classify an infrastructure failure as a semantic deficiency. If the original model's unknown training data could plausibly contain development examples, label any favorable result as *development evidence only*; positive independence cannot be claimed from the present provenance. The two ambiguous rows cannot establish population recall, and the 124 synthetic/reviewed rows cannot settle an end-to-end product decision. No post-result threshold adjustment is allowed to escape C.

## 11. Final-Holdout Boundary

The sealed final remains completely untouched. Its text, labels, file, and case list must not be opened for baseline design, threshold selection, prompt wording, error analysis, calibration, or migration planning. Existing frozen final acceptance gates remain unchanged and are **not** evaluated or weakened by P1-L1. The original-model baseline is development-only; even A is not a final-holdout pass or deployment approval.

## 12. Execution Plan

**Proposed only; do not perform under this document.** After explicit plan approval, a separately authorized execution would: (1) record hashes/versions and freeze P1-L1 bytes plus this gate; (2) validate only the reviewed development file and prepare a duplicate-key-aware raw scorer without modifying production code; (3) run the original GGUF CPU-only, one oracle pair at a time for three passes with the fixed settings; (4) archive raw outputs and compute the metrics exactly once from pass one; (5) apply A/B/C in the declared order and write a provenance-rich development report. Do not run the rejected adapter, train, use GPU, package a new model, change production APIs, touch final, or commit/push as part of this plan. If the runtime cannot match the planned identity/settings, stop and seek approval for a revised **pre-execution** protocol.

## 13. Decision Outcomes

- **A — NO RETRAINING JUSTIFIED:** The original model meets the declared development adequacy band; prioritize remaining retrieval/contract issues. Ambiguous-class and independent generalization uncertainty remain explicit.
- **B — RETRAINING JUSTIFIED:** The original model has a material, repeatable semantic boundary deficit under oracle delivery. Authorize *consideration of a new, bounded proposal* only; do not infer that a candidate would pass the unchanged final gate.
- **C — INCONCLUSIVE:** Evidence or protocol is insufficient, or performance falls in the gray band. Resolve the specific cause under a separately approved plan; do not convert C into automatic retraining or no-retraining.

The existing 124-case development partition is sufficient for this conservative screening distinction on supported classes only if the protocol is fixed beforehand. It is not sufficient for a robust ambiguous estimate (n=2), calibration, independent validation, product-wide gains, or repeated candidate/prompt selection. Subsequent work on the same development set would risk overfitting to it; any training proposal would need an independently justified validation strategy and separately authorized data/review work before stronger claims. This plan changes no dataset.

## 14. Authorization Boundary

This is a documentation-only design. **THIS DOCUMENT DOES NOT AUTHORIZE EXECUTION.** It authorizes no model calls, weights or code changes, dataset changes, package build, GPU use, final-holdout access, acceptance-gate change, production migration, training, commit, or push. Its only requested next action is human review of the plan.
