# Phase III-J Label-Only Baseline Result

## 1. Status

**Decision: RETRAINING JUSTIFIED — proposal only.** The predeclared development-only gate was triggered by **6/24 removed→modified** errors, exactly its threshold. This does not authorize training, imply that a new adapter would improve, pass the unchanged final acceptance gate, or be promoted. The original model, not the rejected Phase III-J adapter, was evaluated under the new label-only research contract. All three complete passes were structurally valid and exactly repeatable. The approved protocol is in [the plan](phase_iii_j_label_only_baseline_plan.md); no thresholds, prompt, parser, or decoding settings were changed after generation began.

## 2. Evidence Boundary

Execution began from branch `phase-3/targeted-retraining`, HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`, with the pre-existing dirty worktree recorded in the [execution manifest](../archive/phase_iii_j/label_only_baseline_v1/execution_manifest.json). The plan hash was `5b9bb9c3d403e376988f462a230397db16f2a00e7a0d7bde5da0b3c506f044d5`. The fixed prompt, strict duplicate-key-aware parser, scorer, three-pass runner, dataset order, decoding request, runtime identity, and A/B/C gate were frozen before the first generation; the runner hash was `fb4b5599b8a8633da2ca5b36a980c83f3b0026967b4ec3ca15a9d2fecf0edc7d`.

The ignored local evidence directory is `archive/phase_iii_j/label_only_baseline_v1/`; it contains the frozen manifest and prompt, evaluator, all 372 raw case records, and recomputed metrics. It is excluded from Git by `.gitignore:57`. No output was retried, repaired, regex-salvaged, excluded, or replaced by a repeat. The first pass is primary; passes two and three test repeatability. The model server remained CPU-only; no training, GPU use, adapter creation, or production API call occurred.

| Artifact | SHA-256 |
| --- | --- |
| `execution_manifest.json` | `3f6ce69f26e9f7fbe16e07ca68e3b8f5128bfd94e99205fb282289828bf07408` |
| `prompt_p1_l1.json` | `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470` |
| `runner.py` | `fb4b5599b8a8633da2ca5b36a980c83f3b0026967b4ec3ca15a9d2fecf0edc7d` |
| `pass_1.jsonl` | `cb6a8875bcc8eaf1e2bffc3c2bd041f2dc5aa2e95d4132c95af47c8ab806e878` |
| `pass_2.jsonl` | `2dea22b3219de26b1a67e7d8af41637d1687ad1f9df90b65529454552e60cda0` |
| `pass_3.jsonl` | `3f49aea0e9a60e57f3e82fd7b042c3cbac5e3c60500a915c75727152fcd3dc78` |
| `metrics_and_decision.json` | `d9c8e0bd4ecc9dfeae208a3f1222d29bd6409c5a13a614d298e67b09eeb83963` |

These are development evidence, not a new model artifact or independent final validation.

## 3. Model Identity

Original DriftLedger Qwen2.5-7B LoRA merged GGUF Q4_K_M at `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`. Its full-file SHA-256 was checked before and after inference: `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`, matching the historical original-model identity (`docs/model-card.md:9-16`; `docs/phase_iii_i_final_report.md:5-11`). It is **not** the untuned Qwen base or Phase III-J checkpoint-60 adapter.

The existing read-only model mount served the GGUF through llama.cpp image `ghcr.io/ggml-org/llama.cpp:server-b11151`, image digest `sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf`, executable build `11151` / commit `bd4f514db`, context 768, one slot, six CPU threads, `--n-gpu-layers 0`, `--device none`. No model weight was changed.

## 4. Development Dataset

Only `evaluation/phase_iii_j/frozen/reviewed_development_v1.json` was loaded for case-level evaluation. Its unchanged SHA-256 before and after was `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`. There were exactly **124 unique, scored, development-partition IDs**, fixed in order `DV0001`–`DV0124`, with no duplicates or omissions in any pass. Truth came from `review.reviewed_label`, not proposed labels. Support: added 24, ambiguous 2, contradiction 16, modified 39, removed 24, unchanged 19. The original adapter's unknown training-data provenance prevents a claim that these synthetic, separately AI-reviewed cases are independent of all historical model training.

## 5. Frozen Protocol

Research prompt **P1-L1** retained P1's requirement/message order, untrusted-content instruction, exact six-class definitions, and boundary priority, replacing only the four-field output instruction with the plan's one-key instruction. Frozen original P1 SHA-256: `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`; P1 itself was not edited. The prompt bytes and all 124 IDs are preserved in the evidence bundle.

The model was asked to emit only `{"label":"<canonical_class>"}` from an empty assistant turn, with no forced prefix, few-shot example, grammar, or constrained decoder. Strict scoring accepted one complete JSON object, exactly one canonical lower-case `label` key/value, and no other text or fields; duplicate keys were rejected. The request used temperature 0, top-p 1, top-k 20, seed 1729, 32 maximum output tokens, P1's two chat stop strings, and the fixed 768-token server context. Per-response generation settings and finish metadata are saved; no case hit the generation limit (maximum observed `tokens_predicted`: 9). The legacy four-field FastAPI/Go production contract and frozen gate were not used or changed.

## 6. Structural Validity

| Pass | Strict-valid | Invalid | Invalid categories |
| --- | ---: | ---: | --- |
| 1 (primary) | 124/124 | 0/124 | None |
| 2 (repeat) | 124/124 | 0/124 | None |
| 3 (repeat) | 124/124 | 0/124 | None |

This is **P1-L1 one-field** structural validity only. It is not a pass of the old four-field P1 acceptance gate.

## 7. Semantic Metrics

Primary pass: **90/124 correct = 72.58% accuracy; macro F1 = 0.6954 (69.54%)**. Invalid outputs count as wrong by protocol; there were none. Passes two and three independently produced the same 90/124 and 0.6954. Macro F1 is the unweighted mean across all six classes, including the low-support ambiguous class. Zero-denominator precision/F1 would be zero by the predeclared scorer; none of the reported classes required an omitted metric.

Confusion matrix (rows = reviewed truth; columns = raw predicted label):

| Truth ↓ / prediction → | added | modified | removed | contradiction | ambiguous | unchanged | INVALID |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| added | 20 | 1 | 0 | 0 | 1 | 2 | 0 |
| modified | 1 | 20 | 1 | 1 | 13 | 3 | 0 |
| removed | 0 | 6 | 17 | 0 | 0 | 1 | 0 |
| contradiction | 0 | 3 | 0 | 12 | 0 | 1 | 0 |
| ambiguous | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| unchanged | 0 | 0 | 0 | 0 | 0 | 19 | 0 |

The matrix, per-class counts, and decision are machine-readable in `metrics_and_decision.json`; an independent count over `pass_1.jsonl` confirmed 124 rows, 124 valid, 90 correct, and the targeted boundary counts.

## 8. Per-Class Results

| Reviewed class | Support | Correct | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| added | 24 | 20 | 95.24% | 83.33% | 88.89% |
| modified | 39 | 20 | 66.67% | 51.28% | 57.97% |
| removed | 24 | 17 | 94.44% | 70.83% | 80.95% |
| contradiction | 16 | 12 | 92.31% | 75.00% | 82.76% |
| ambiguous | 2 | 2 | **12.50%** | 100.00% | **22.22%** |
| unchanged | 19 | 19 | 73.08% | 100.00% | 84.44% |

The ambiguous row is not a success claim: while both reviewed ambiguous cases were found, **14 non-ambiguous cases were predicted ambiguous**, including **13/39 reviewed modified** cases. Its 2-case recall is too small for a robust class estimate, and low precision materially lowers macro F1. This diagnostic is separate from the predeclared B trigger; it does not alter the gate.

## 9. Boundary Confusions

| Directed error | Primary count / reviewed support | Gate context |
| --- | ---: | --- |
| removed→modified | **6/24 (25.00%)** | Meets B trigger `≥6/24` exactly. |
| modified→removed | 1/39 (2.56%) | Reverse direction, reported diagnostically. |
| contradiction→modified | 3/16 (18.75%) | Below B trigger `≥4/16`, above A allowance `≤1/16`. |
| modified→contradiction | 1/39 (2.56%) | Reverse direction. |
| added→modified | 1/24 (4.17%) | Below B trigger `≥6/24`; within A allowance `≤3/24`. |
| modified→added | 1/39 (2.56%) | Reverse direction. |
| ambiguous→modified | 0/2 | Both true ambiguous cases were correct; see false-positive warning above. |

The six removed→modified IDs, preserved in raw evidence, are `DV0001`, `DV0002`, `DV0062`, `DV0071`, `DV0106`, and `DV0118`. No case text is copied into this report. These are direct oracle-pair label errors, not retrieval misses; the AI-reviewed truth and synthetic design still limit generalization claims.

## 10. Repeatability

Against pass 1, passes 2 and 3 each had **124/124 identical raw strings, 124/124 identical parsed labels, and 124/124 identical valid/invalid statuses**. There were **zero per-case disagreements**. Accuracy range across passes was 72.58%–72.58%; macro-F1 range was 0.6954–0.6954. No repeat was averaged or substituted into the primary score. Determinism is observed for this fixed artifact/runtime/settings and these 124 cases, not promised for other hardware or prompts.

## 11. Historical Context

- **DIRECTLY COMPARABLE:** No existing historical label-only P1-L1 run on these same 124 cases exists. A future separately approved candidate using the identical cases, scorer, prompt, and runtime could form a paired *development* comparison, but this report does not make one.
- **CONTEXT ONLY:** Phase III-I used the same original GGUF on a different 90-case oracle corpus and old four-field P1: 73/90 correct, macro F1 80.89%, removed→modified 7/15. Phase III-I.5 used a different 215-scored-case adversarial corpus and old P1: 161/215 correct, macro F1 75.89%, removed→modified 16/43, contradiction→modified 15/28, added→modified 11/38 (`docs/phase_iii_i_final_report.md:23-55`; `docs/phase_iii_i_5_final_report.md:21-55`). These motivate the priority but cannot establish a gain or regression versus 72.58% here.
- **NOT COMPARABLE:** The rejected Phase III-J adapter's 0/124 strict four-field structural result is not a semantic label-only baseline. Earlier 48/24-case raw, V5 synthetic, retrieval/postprocessed, and closed-final metrics have different cases/contracts or contamination limits and are not pooled or re-scored (`docs/phase_iii_j_baseline_outcome.md`; `docs/model-card.md:26-90`).

## 12. Predeclared Gate Evaluation

The exact thresholds come from [plan §8](phase_iii_j_label_only_baseline_plan.md); B is checked before A after prerequisites. The frozen `gate` object and computed booleans are in the execution manifest and metrics evidence.

| Criterion | Required | Observed | Result |
| --- | --- | --- | --- |
| All passes structurally valid | 124/124 each | 124/124 each | Pass |
| Repeat labels equal first pass | 124/124 each | 124/124 each | Pass |
| B: removed→modified | ≥6/24 | **6/24** | **Triggered** |
| B: contradiction→modified | ≥4/16 | 3/16 | Not triggered |
| B: added→modified **and** macro F1 | ≥6/24 and <0.80 | 1/24 and 0.6954 | Not triggered |
| B: correct **and** macro F1 | ≤89/124 and <0.75 | 90/124 and 0.6954 | Not triggered |
| A: correct | ≥100/124 | 90/124 | Fail |
| A: macro F1 | ≥0.80 | 0.6954 | Fail |
| A: removed→modified | ≤3/24 | 6/24 | Fail |
| A: contradiction→modified | ≤1/16 | 3/16 | Fail |
| A: added→modified | ≤3/24 | 1/24 | Pass |
| A: recall of other five classes | ≥0.70 each | modified 0.5128 (lowest) | Fail |
| A: ambiguous correct | 2/2 | 2/2 | Pass, low support |

All B prerequisites passed, and one B semantic trigger passed. No cutoff was chosen or revised after observing the predictions.

## 13. Decision

**RETRAINING JUSTIFIED.** In this document, that means only that a bounded **label-classification training proposal may be prepared and reviewed**. It does **not** authorize training, hyperparameter search, a new adapter, final-holdout access, acceptance-gate changes, production migration, or promotion. Before any such proposal can become an experiment, the six removal misses and the strong modified→ambiguous false-positive pattern warrant semantic review without relabeling this frozen development set; data provenance, independent validation, and expected product gain must be addressed. This baseline alone does not show fine-tuning will solve either failure mode.

## 14. Limitations

This is development screening on 124 synthetic, separately AI-reviewed cases already involved in Phase III-J checkpoint/failure work, not independent validation. The original adapter's historical training corpus is not fully identified; independence cannot be certified. The label-only prompt/32-token cap differs from old four-field P1, so historical macro-F1 values are contextual only. The oracle pair isolates model classification but does not measure Go requirement selection, confidence-free decision policy, persistence, user-facing explanations, or end-to-end product quality. Ambiguous support is two; despite 2/2 recall, precision is 2/16. Structural validity and repeatability do not guarantee correctness. The B threshold was reached exactly, so its policy meaning should not be overstated as statistical significance.

## 15. Final-Holdout Status

The sealed final payload was **not opened, parsed, enumerated, hashed, or used**. Only pre-existing metadata in previously frozen documentation was available for context; none was used to construct or score this run. No final row or artifact was added to Git or the evidence bundle. Existing final acceptance gates, partitions, weights, and production code remain unchanged.

## 16. Next Action

Review the development-only result and, if desired, authorize **preparation of a bounded label-classification retraining proposal**. Do not train under this result report.
