# Phase III-J Label-Only CPU Development Screen Result

## 1. Status

**DEVELOPMENT REJECT.** The frozen Phase III-J label-only candidate completed exactly three 124-case CPU Q4_K_M development passes. All 372 outputs were structurally valid and the two repeats matched pass 1 exactly. Pass 1 scored **114/124 correct (91.94%)**, but three predeclared requirements failed: macro F1 **0.777456 < 0.78**, reviewed ambiguous correct **0/2 < 2/2**, and added→modified **2/24 > 1/24**. This is a measured gate failure, not an inconclusive execution. The candidate must not be promoted or automatically retrained.

## 2. Candidate Identity

The evaluated artifact was `models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf`, **4,683,074,112 bytes**, Q4_K_M, SHA-256 `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f`. The selected adapter SHA-256 was `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`; the training evidence ZIP SHA-256 was `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f`. The original comparator GGUF SHA-256 was `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. Both GGUFs were rehashed after the screen and retained as read-only, reflinked evidence copies. No candidate weights or quantization were changed.

## 3. Protocol Identity

The screen ran on the same Intel Core i7-8750H host as the [frozen original-model baseline](phase_iii_j_label_only_baseline_result.md). Branch `phase-3/targeted-retraining`, HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`, and the pre-existing dirty worktree were recorded before inference. The development JSON SHA-256 was `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`; the frozen P1-L1 prompt SHA-256 was `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470`; the approved development-gate JSON SHA-256 was `cadc64da3c89e1c450cbee8096d4bc64d54101cb74559343fbcd363106bb8967`. The original baseline runner SHA-256 was `fb4b5599b8a8633da2ca5b36a980c83f3b0026967b4ec3ca15a9d2fecf0edc7d`.

The candidate used the same `ghcr.io/ggml-org/llama.cpp:server-b11151` image ID `sha256:fffcc1af1105bafc713a47b6680fb7cf5856ed43ea2e9e8bca5a62bbd6365edf`, executable build 11151 / commit `bd4f514db`, CPU-only `--n-gpu-layers 0 --device none`, context 768, six threads, one slot, internal port 8080, read-only model mount, 7 GiB container memory and 8 GiB memory+swap limits. `/props` reported `Q4_K - Medium`, context 768, one slot, and default top-k 20. An isolated **host** port 8081 was used to leave the original service untouched; this did not change the internal server port, flags, prompt, or request. The original server was idle in the recorded resource checks and produced no logs during the screen.

Each request used the frozen P1-L1 text from an empty assistant turn, `n_predict=32`, temperature 0, top-p 1, top-k 20, seed 1729, `stop=["<|im_end|>","<|im_start|>"]`, and `stream=false`. No grammar, forced prefix, repair, retry, case exclusion, or postprocessing was used. The strict duplicate-key-aware parser and first-pass scorer were imported unchanged from the frozen baseline runner. Actual llama.cpp tokenizer outputs matched the original server on **132/132 pre-inference probes**: all 124 full development prompts, six canonical label JSON strings, and both stop tokens. The [protocol manifest](../archive/phase_iii_j/label_only_candidate_cpu_screen_v1/protocol_manifest.json), [tokenization audit](../archive/phase_iii_j/label_only_candidate_cpu_screen_v1/tokenization_audit.json), server properties, container inspection, and logs preserve these checks.

## 4. Structural Validity

| Pass | Strict-valid | Invalid |
| --- | ---: | ---: |
| 1 (primary) | 124/124 | 0 |
| 2 | 124/124 | 0 |
| 3 | 124/124 | 0 |

The contract was exactly one complete JSON object with one canonical lowercase `label` key and no other text or keys. This is P1-L1 structure, **not** compliance with the unchanged production four-field P1 contract.

## 5. Global Metrics

The primary pass had **114/124 correct**, accuracy **0.9193548387**, and six-class macro F1 **0.7774561748**. The second and third passes had the same counts and scores; they were not averaged into the primary score. The macro F1 threshold was 0.78, so the measured value misses by **0.0025438252**. Invalid outputs would count as wrong; there were none.

Confusion matrix (reviewed truth by raw predicted label):

| Truth ↓ / prediction → | added | modified | removed | contradiction | ambiguous | unchanged | INVALID |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| added | 22 | 2 | 0 | 0 | 0 | 0 | 0 |
| modified | 1 | 35 | 2 | 1 | 0 | 0 | 0 |
| removed | 1 | 0 | 23 | 0 | 0 | 0 | 0 |
| contradiction | 0 | 0 | 0 | 15 | 0 | 1 | 0 |
| ambiguous | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| unchanged | 0 | 0 | 0 | 0 | 0 | 19 | 0 |

## 6. Per-Class Metrics

| Class | Support | Correct | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| added | 24 | 22 | 0.916667 | 0.916667 | 0.916667 |
| modified | 39 | 35 | 0.897436 | 0.897436 | 0.897436 |
| removed | 24 | 23 | 0.920000 | 0.958333 | 0.938776 |
| contradiction | 16 | 15 | 0.937500 | 0.937500 | 0.937500 |
| ambiguous | 2 | 0 | 0.000000 | 0.000000 | 0.000000 |
| unchanged | 19 | 19 | 0.950000 | 1.000000 | 0.974359 |

Zero-prediction ambiguous precision and F1 are set to zero by the frozen scorer. The two-case ambiguous support limits generalization, but **both misses are actual measured gate failures** and cannot be treated as missing evidence.

## 7. Directed Confusions

| Directed error | Candidate | Approved maximum | Result |
| --- | ---: | ---: | --- |
| removed→modified | 0/24 | 3/24 | Pass |
| contradiction→modified | 0/16 | 2/16 | Pass |
| added→modified | **2/24** | **1/24** | **Fail** |
| modified→ambiguous | 0/39 | 5/39 | Pass |

## 8. Ambiguous-Class Behavior

Neither reviewed ambiguous case was identified: **0/2**, versus the required **2/2**. Both were predicted modified. There were **0 false ambiguous predictions** on the other 122 cases, passing the `≤6` false-positive cap. The original baseline found both ambiguous cases but made 14 false ambiguous predictions. The candidate shifted that error pattern; zero false positives do not compensate for zero true positives under the approved gate.

## 9. Repeatability

Pass 2 and pass 3 each matched pass 1 on **124/124 exact raw strings**, **124/124 parsed labels**, and **124/124 structural-validity statuses**. Accuracy spread and macro-F1 spread were both zero. All pass files contain `DV0001`–`DV0124` once, in order, with reviewed truth unchanged. There were no individual-case retries.

## 10. Comparison to Original Baseline

This is a directly paired **development-only** comparison under the same P1-L1 prompt, six-class scorer, 124 reviewed cases, CPU image/build, and decoding settings. The original baseline had 90/124 correct (72.58%) and macro F1 0.6954; the candidate gained **24 correct cases**, **19.35 percentage points** of accuracy, and approximately **0.0821 macro F1**. Removed→modified improved 6/24→0/24; contradiction→modified 3/16→0/16; modified F1 0.5797→0.8974; false ambiguous 14→0. Added→modified worsened 1/24→2/24, and true ambiguous correct worsened 2/2→0/2. These gains do not override the conjunctive gates. The earlier Kaggle GPU adapter diagnostic (115/124, macro F1 0.782753, ambiguous 0/2) is context only, not a matched CPU Q4_K_M comparison or promotion result.

## 11. Development Gate Evaluation

| Criterion | Required | Observed | Result |
| --- | ---: | ---: | --- |
| Structure, each of 3 passes | 124/124 | 124/124 each | Pass |
| Accuracy | ≥100/124 | 114/124 | Pass |
| Macro F1 | ≥0.78 | **0.777456** | **Fail** |
| Modified correct / F1 | ≥27/39; ≥0.68 | 35/39; 0.897436 | Pass / Pass |
| Removed correct / F1 | ≥19/24; ≥0.83 | 23/24; 0.938776 | Pass / Pass |
| Contradiction correct / F1 | ≥13/16; ≥0.84 | 15/16; 0.937500 | Pass / Pass |
| Added correct / F1 | ≥20/24; ≥0.86 | 22/24; 0.916667 | Pass / Pass |
| Unchanged correct / F1 | ≥18/19; ≥0.82 | 19/19; 0.974359 | Pass / Pass |
| True ambiguous correct | 2/2 | **0/2** | **Fail** |
| False ambiguous | ≤6 | 0 | Pass |
| Removed→modified | ≤3/24 | 0/24 | Pass |
| Contradiction→modified | ≤2/16 | 0/16 | Pass |
| Added→modified | ≤1/24 | **2/24** | **Fail** |
| Modified→ambiguous | ≤5/39 | 0/39 | Pass |
| Pass 2 raw / label / validity agreement | 124/124 each | 124/124 each | Pass |
| Pass 3 raw / label / validity agreement | 124/124 each | 124/124 each | Pass |

Every criterion is preserved in [gate_evaluation.json](../archive/phase_iii_j/label_only_candidate_cpu_screen_v1/gate_evaluation.json). No threshold was altered after seeing predictions.

## 12. Decision

**DEVELOPMENT REJECT.** Three validly measured, predeclared gates failed. The candidate remains a rejected development candidate, despite substantial paired improvement on accuracy and several high-priority class boundaries. There is no automatic second iteration, retraining authorization, final-gate translation approval, or production promotion.

## 13. Evidence Artifacts

The ignored local [evidence directory](../archive/phase_iii_j/label_only_candidate_cpu_screen_v1/) preserves the execution/protocol manifests, immutable GGUF copies, candidate runner, tokenizer audit, all 372 raw case records, full metrics and confusion matrix, gate and repeatability reports, independent validator, container configuration/properties/logs, and SHA-256 inventory. Key hashes:

| Artifact | SHA-256 |
| --- | --- |
| `execution_manifest.json` | `5255237c64cd4e2764f8415b2d7f65dcf8faaa654cb62f6d9bb887ae0d86bf73` |
| `protocol_manifest.json` | `9013a953fe6f1421b772c8d2a97e3cdaeb0e38886ba19b856acf04ffa0812678` |
| `tokenization_audit.json` | `f5eae675536339c6bd8c047948da3f448833f5416ca09d2e8c00261229ef7c7f` |
| `pass_1.jsonl` | `28a0bb2e86b2af64fdddf327ed98ed2c7754f3edec05f858d6c6062a29c473ad` |
| `pass_2.jsonl` | `2e602900159c803339a005d008bb03b24fc0f2a6f0ebf2172a00baf9749e2159` |
| `pass_3.jsonl` | `a515616269f75f50a9341954d1a54d8fcc9f972a0fc4e0062ae4237f58e73810` |
| `metrics.json` | `9aa1d119528b4393bcf42ba459008ecffe5ca86f36827c153bfd368119ee2c12` |
| `gate_evaluation.json` | `31a5f0b755b24aca46a82260c0e36f8bc6a78de495981963fa5953b1c56388b7` |
| `validation.json` | `bede82da08f3f859c9774a7c864b5fc3d66c0bd21738bfc1107d0eb2c07b490f` |
| `evidence_hashes_final.json` | `e04330abacff49e3c5c45bb6ca2c63e781ce79551f93dc905c9fc044581f5c2d` |

The final inventory hashes all 19 other evidence files, including both GGUF copies and the llama.cpp logs/configuration. This directory is excluded from Git; it is not a shared or final-holdout artifact.

## 14. Limitations

These are development-only results on 124 reviewed cases, including just two true ambiguous cases. Repeated exposure to the development partition is a selection risk; the sealed final was not used to offset or tune this result. Exact repeatability is specific to this artifact, fixed runtime, and cases. The isolated host port differed from the original baseline port but the image, internal server flags, CPU host, tokenizer outputs, prompt, request settings, parser, case order, and scoring matched. The existing production four-field contract and old final acceptance gate were not evaluated or changed. No inference latency or memory-based promotion claim is made here.

## 15. Final-Holdout Status

**SEALED AND UNTOUCHED.** The execution and validation scripts loaded only the reviewed development partition; no final rows, final predictions, or final metrics were accessed or produced. The translated label-only final gate remains proposed, not active.

## 16. Next Action

**Stop Phase III-J promotion. Do not retrain automatically.**
