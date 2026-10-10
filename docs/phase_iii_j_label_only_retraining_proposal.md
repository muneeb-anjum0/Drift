# Phase III-J Label-Only Retraining Proposal

## 1. Status

**One bounded proposal, documentation only. THIS DOCUMENT DOES NOT AUTHORIZE TRAINING.** Branch `phase-3/targeted-retraining` was at HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca` when reviewed; the existing dirty worktree was preserved. The original pre-Phase-III-J model remains unchanged. The first Phase III-J adapter is rejected, and the masked-placeholder corrective design is withdrawn. No new model call, training run, package, config change, final-holdout access, promotion, commit, or push is part of this proposal.

The proposed experiment asks only whether supervising a **complete, label-only response** on the unchanged reviewed train partition yields a materially better six-class classifier than the [original-model label-only development baseline](phase_iii_j_label_only_baseline_result.md). One corrective training run may be requested after separate approval; this text itself authorizes none.

## 2. Evidence Basis

The approved [baseline plan](phase_iii_j_label_only_baseline_plan.md) and [result](phase_iii_j_label_only_baseline_result.md) used the original DriftLedger GGUF (`11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`) on 124 frozen development cases (`89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`) under strict P1-L1 `{"label":"<canonical_class>"}`. All three passes were 124/124 structurally valid and exactly repeatable; first-pass accuracy was **90/124 (72.58%)**, macro F1 **0.6954**. The predeclared proposal trigger, removed→modified **6/24**, was met exactly. Other relevant errors: contradiction→modified 3/16, added→modified 1/24, modified→ambiguous **13/39**, and 14 false ambiguous predictions overall. This is development screening, not independent final performance.

The prior Phase III-J run used 477 reviewed train and 124 development rows but selected a checkpoint by masked label-fragment loss and produced **0/124** valid old four-field development outputs. The preserved 12-case raw probe had 0/12 valid outputs and supports an output-supervision mismatch as a contributor, not its sole cause ([baseline outcome](phase_iii_j_baseline_outcome.md); [probe](phase_iii_j_structural_failure_probe.md)). The [teacher-forcing audit](phase_iii_j_corrective_training_proposal.md#teacher-forcing-and-masked-value-audit) established that masked artificial values still condition later supervised tokens. The [output-contract review](phase_iii_j_model_output_contract_review.md) found only `reviewed_label` has target supervision. None of these findings justifies generated confidence, reasoning, or changed elements.

Verified files: `evaluation/phase_iii_j/frozen/reviewed_train_v1.json` has **477** rows, SHA-256 `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658`; `reviewed_development_v1.json` has **124**, SHA-256 `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`. The frozen config is SHA-256 `4ef6911d9e7508184db146bdb7e49dec18b4e26ba2edfe7285b5fb9d774bc0a3`; the actual final gate is at `evaluation/phase_iii_j/frozen/acceptance_gate_v1.json`, SHA-256 `a78695c5c7d68df066ddae968bb18348ff08c5cccfbe404f6530aab1f2bf6962`. The request's `tools/phase3j_kaggle/acceptance_gate_v1.json` path does **not** exist; no replacement file is made. The original data are synthetic, AI-authored, and separately AI-reviewed—not human-adjudicated ([methodology deviation](phase_iii_j_methodology_deviation.md)).

## 3. Retraining Justification

The oracle-pair baseline isolates label classification from retrieval and shows a repeatable, product-relevant removal boundary error. Its 90/124 accuracy, 0.6954 macro F1, weak modified recall (20/39), and false ambiguous burden justify **designing one** controlled label-only experiment. The trigger does not show that fine-tuning will work: it sits exactly at the policy threshold, and some development labels may be semantically debatable under P1-L1. The experiment must be judged by a multi-criterion prospective development screen, not by structural validity alone or a small aggregate gain. Product integration remains a separate architecture/API task.

## 4. Model Task

Given exactly one baseline requirement and one new client message, output exactly one of `added`, `modified`, `removed`, `contradiction`, `ambiguous`, or `unchanged` in the strict one-key JSON object `{"label":"<canonical_class>"}`. The model is **not** asked to estimate confidence, explain its choice, or extract changed elements. Its prompt is the already approved P1-L1, whose six semantic definitions, untrusted-content warning, ordering, and user template preserve P1 task semantics; only the output instruction differs. Frozen P1-L1 prompt SHA-256: `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470` in the ignored baseline evidence. No prompt tuning or label-ontology change is proposed.

## 5. Training Target

For each unchanged reviewed training row, let `L = row["review"]["reviewed_label"]`. Construct the assistant response as the exact UTF-8 string `{"label":"` + `L` + `"}` followed by the tokenizer's actual `<|im_end|>`/EOS token. Example: `{"label":"removed"}<|im_end|>`. No spaces, prose, extra keys, marker strings, pseudo-labels, or hidden values enter the target. Train from the **plain P1-L1 assistant turn**, not a prefilled JSON prefix; inference must start from that same turn. Use the same six labels and row order/membership as frozen inputs. The entire five-token JSON response in the audited example, including opening syntax, field name, label, and closing brace, plus EOS must receive loss. Prompt tokens receive `-100`; pad tokens receive `-100` and attention mask zero. A structural token adjacent to the label is still a legitimate supervised target because there are no unsupported values in its causal history.

The historical [`encode_rows`](../tools/phase3j_kaggle/phase3j.py#L180-L191) instead appended `{"label":"` to a four-field P1 prompt, masked all prefix tokens, and supervised only `reviewed_label + '"'`; it taught neither the opening object nor closing brace/EOS. [`collate`](../tools/phase3j_kaggle/phase3j.py#L194-L204) masked padding but did not repair that missing target. Training and checkpoint selection must use a newly versioned full-response objective; old and new development losses are **not numerically comparable**. The proposal does not change that code yet.

## 6. Token-Level Loss Design

The following **read-only tokenizer audit** used the original rejected-run ZIP's saved `best_adapter/tokenizer.json` (SHA-256 `3fd169731d2cbde95e10bf356d66d5997fd885dd8dbb6fb4684da3f23b2585d8`), without loading weights or final data. For existing training row `TR0001`, P1-L1's plain prompt tokenizes to **299** tokens. Its first 299 `input_ids` are copied into `labels` as `-100` with attention mask 1. The response and EOS then tokenize as follows; these exact IDs must be reverified against the approved future tokenizer before any run:

| Position after prompt | Token ID | Decoded token | Loss label | Visible to later tokens? |
| ---: | ---: | --- | ---: | --- |
| 0 | 4913 | `{"` | 4913 | Yes |
| 1 | 1502 | `label` | 1502 | Yes |
| 2 | 3252 | `":"` | 3252 | Yes |
| 3 | 45756 | `removed` | 45756 | Yes |
| 4 | 9207 | `"}` | 9207 | Yes, for EOS |
| 5 | 151645 | `<|im_end|>` | 151645 | No later target |

Thus `input_ids = prompt_ids + [4913,1502,3252,45756,9207,151645]` and `labels = [-100] * 299 + [4913,1502,3252,45756,9207,151645]`. The response tokens decode exactly to `{"label":"removed"}`. The full sequence is 305 tokens. A read-only audit of **all 477 train and 124 development rows** under this tokenizer/P1-L1 found zero response round-trip mismatches and zero sequences over the unchanged 768-token limit; maximum total lengths including EOS were 365 train and 361 development. Future preflight must recheck exact tokenizer identity, full response/EOS round-trip, loss spans, length, and generation-from-empty-assistant alignment on every permitted row. It must fail closed on any mismatch; this proposal does not implement the encoder or run training.

## 7. Frozen Components

The **default one-intervention design** holds the following rejected-run choices fixed as identified in [`training_config_v1.json`](../evaluation/phase_iii_j/frozen/training_config_v1.json) and [`phase3j.py`](../tools/phase3j_kaggle/phase3j.py):

| Component | Retained value |
| --- | --- |
| Base/tokenizer | `Qwen/Qwen2.5-7B-Instruct`, exact revision `a09a35458c702b33eeacc393d103063234e8bc28`; no old/rejected adapter resume or stacking |
| Data | Same 477 train / 124 development bytes, row labels, partitions, family boundaries, and provenance; sealed final excluded |
| PEFT/quantization | 4-bit NF4 with double quantization and float16 compute; LoRA rank 16, alpha 32, dropout 0.05, bias `none`; q/k/v/o/gate/up/down projection targets |
| Optimization | `paged_adamw_8bit`, LR `2e-4`, linear scheduler, 12 warmup steps, 3 epochs, no early stopping or sweep |
| Batch/length | Per-device train batch 1, gradient accumulation 8 (effective batch 8), eval batch 1, maximum sequence length 768 |
| Reproducibility | Seed/data seed 1729, fp16, gradient checkpointing, zero dataloader workers, one CUDA device for the *future* run only |
| Selection | Evaluate/save once per epoch, at most three checkpoints, select lowest development loss under the **new** full-response objective; score only that one selected candidate on development |
| Evaluation semantics | Same six-class P1-L1 prompt bytes, strict raw one-key parser, oracle pairs, no Go postprocessing or malformed-output rescue |

The rejected run's `save_safetensors` compatibility issue and later `training_args.bin` export-guard error are operational hazards, not reasons to alter training hyperparameters. A future separately authorized implementation must version and validate export behavior without resuming or overwriting the rejected artifact. No optimizer, learning-rate, class-balance, or prompt-semantics change is justified by the observed structural mismatch.

## 8. Proposed Experiment Delta

**One coupled contract correction:** relative to the rejected Phase III-J experiment, replace four-field P1's output instruction with frozen P1-L1's one-field instruction **for both training and inference**, and replace fragment-only supervision with the complete label-only JSON+EOS target. The task definitions and input format remain unchanged. This is one output-contract/objective intervention, not an independent prompt sweep: training and inference must share the same response contract. The old four-field training config, code, package, and rejected adapter remain immutable; a future implementation needs new identities rather than in-place edits.

For clarity, the comparison to the **original** pre-III-J GGUF is a product screening comparison, not a pure ablation of training-target tokens: the original has an older adapter of incompletely known training provenance, and a candidate would require matched GGUF conversion/runtime for direct development scoring. The experiment can test practical candidate benefit under the fixed P1-L1 contract, but cannot attribute all differences to target construction alone. A single run, not repeated optimization against development, is proposed.

## 9. Class Distribution Analysis

Actual frozen counts, read from the reviewed files (not inferred from labels or historical narrative):

| Class | Train / 477 | Train share | Development / 124 |
| --- | ---: | ---: | ---: |
| added | 81 | 16.98% | 24 |
| modified | 156 | 32.70% | 39 |
| removed | 84 | 17.61% | 24 |
| contradiction | 82 | 17.19% | 16 |
| ambiguous | 6 | 1.26% | 2 |
| unchanged | 68 | 14.26% | 19 |

Modified is the **largest** training class and nearly 1.86× removed, yet the baseline has low modified recall and disproportionately predicts ambiguous for modified inputs. Ambiguous is the **smallest** class, yet the baseline predicts it **16 times** on development for only two true ambiguous rows. Simple frequency imbalance therefore does **not** explain ambiguous overprediction and is not sufficient evidence to rebalance. The larger modified share might contribute to removed→modified, but the strong modified→ambiguous direction points to semantic/annotation-boundary and prompt/transfer effects as well. These are hypotheses, not identified causes.

| Balancing option | Potential value | Why not in this one-run proposal |
| --- | --- | --- |
| Class-weighted loss | Could counter underrepresented classes. | Weighting six ambiguous examples could amplify uncertain/noisy boundaries and further raise false ambiguous predictions; changes the decision boundary and would distort any future uncalibrated class-score interpretation. |
| Weighted sampling / oversampling | Could expose rare examples more often. | Repeats only six ambiguous cases, increasing memorization, shifting effective class priors, and adding an independent sampling intervention; seed/reproducibility needs extra controls. |
| Undersampling | Could reduce modified dominance. | Discards reviewed data while modified recall is already poor; reduces evidence rather than repairing format. |
| Focal loss | Could focus hard mistakes. | Hardness may reflect label ambiguity, not learnable signal; adds a separate loss/hyperparameter intervention and complicates causal attribution. |

Recommendation: retain **unweighted causal-LM cross-entropy and original sampling/order**. No synthetic examples, pseudo-labels, under/oversampling, or class weighting. If later evidence warrants balancing, it needs a new review and experiment, not a silent addition to this run.

## 10. Modified-Class Analysis

The first-pass raw confusion matrix in the [baseline evidence](../archive/phase_iii_j/label_only_baseline_v1/metrics_and_decision.json) shows true modified support **39**: 20 correct (51.28% recall), **13→ambiguous (33.33%)**, 1→removed, 1→contradiction, 1→added (each 2.56%), and 3→unchanged (7.69%). Its F1 is **57.97%**. The most important modified failure is *not* collapse into removed but overuse of ambiguous. Removed→modified is separately 6/24; contradiction→modified is 3/16. P1-L1 distinguishes a decided surviving-behavior change from unresolved or hypothetical intent, but several reviewed-modified development messages contain explicit undecided/hedged language (for example IDs `DV0003`, `DV0052`, `DV0086`, `DV0113`). That creates a possible tension between reviewed labels and the prompt's ambiguous definition. It does **not** authorize relabeling, removing, copying, or prompt-editing those cases.

The observed pattern is compatible with several causes: limited ability to apply semantic boundaries, sparse ambiguous support, label-definition overlap or review noise, and a different original-adapter training distribution. It is **not** explained by the rejected adapter's incomplete target alone, because this baseline used the original model and a structurally valid label-only prompt. Nor does class count establish a causal bias: modified is well represented in train yet under-recalled on development. One target-contract correction can test whether a new supervised model improves these cases without pretending to resolve annotation uncertainty.

## 11. Ambiguous-Class Analysis

Only **6/477** training rows and **2/124** development rows are reviewed ambiguous. The six training examples span six domains and varied unresolved choices (timing, monetization, telemetry, maintenance, networking, eligibility) but share a broad *no settled change* theme; this is too small to establish within-class coverage or exceptional heterogeneity. P1-L1 defines ambiguous as insufficient, unresolved, hypothetical, or internally conflicting intent, which can overlap superficially with tentative language in reviewed-modified messages. The baseline found both true ambiguous cases but generated **14 false ambiguous predictions** (13 true modified, one true added): precision **2/16 = 12.5%**, recall **2/2**, F1 **22.22%**. The 2/2 recall is not a robust estimate of generalization.

No remedy based on those two development cases is proposed. Do **not** rewrite P1-L1, reinterpret the ontology, relabel reviewed-modified cases, invent ambiguous examples, or upweight the six ambiguous training rows in this iteration. The fixed objective and predeclared false-positive/modified→ambiguous gates below determine whether the candidate merits further review; a development miss is not an invitation to revise targets. If annotation tension makes the result uninterpretable, stop and request a separately authorized data-quality review that does not silently change this frozen experiment.

## 12. Development Gates

**Predeclared prospective screen; all conditions are required.** The comparator is the preserved first-pass original-model P1-L1 result on the same 124 IDs. A future selected candidate must first be converted to a single frozen GGUF Q4_K_M artifact and run through the same CPU llama.cpp build, host, P1-L1 bytes, case order, 32-token cap, greedy seed/settings, and strict parser, so runtime/quantization differences are bounded. A different or missing comparator protocol is **inconclusive**, not a pass. Candidate raw results and parser failures must be preserved; no wrapper, confidence filter, or Go postprocessing may repair them. The development truth and thresholds cannot be edited after results.

| Gate | Required candidate result | Baseline / rationale |
| --- | --- | --- |
| Structure | **124/124** strict-valid one-key JSON, zero duplicate/extra fields, markdown, suffixes, parser failures, or generation-limit truncation on each of three passes | Original P1-L1 was 124/124; old adapter's four-field failure cannot be repeated. |
| Global accuracy | **≥100/124 (80.65%)**, at least **+10** correct over 90/124 | Material +8.06 percentage points, not a one-case fluctuation. |
| Global macro F1 | **≥0.7800**, at least +0.0846 absolute over 0.6954 | Six-class improvement, including ambiguity, not accuracy alone. |
| Modified | **≥27/39 correct** (recall ≥69.23%) **and F1 ≥0.68** | Baseline 20/39, F1 0.5797; targets its largest supported-class weakness. |
| Removed | **≥19/24 correct** (recall ≥79.17%) **and F1 ≥0.83** | Baseline 17/24, F1 0.8095; protects the removal reason for retraining. |
| Contradiction | **≥13/16 correct** (recall ≥81.25%) **and F1 ≥0.84** | Baseline 12/16, F1 0.8276; protects the other high-impact boundary. |
| Added | **≥20/24 correct** (recall ≥83.33%) **and F1 ≥0.86** | No loss of correct cases from baseline 20/24; modest F1 tolerance for small count shifts. |
| Unchanged | **≥18/19 correct** (recall ≥94.74%) **and F1 ≥0.82** | At most one fewer correct than baseline 19/19; controls false drift. |
| Ambiguous | **2/2** reviewed ambiguous correct **and ≤6/122 false ambiguous predictions** (implies F1 ≥0.40 if both found) | Baseline 2/2 but 14 false positives; cuts false ambiguous by at least eight. Tiny true-class support remains a limitation. |
| Directed boundaries | removed→modified **≤3/24**; contradiction→modified **≤2/16**; added→modified **≤1/24**; modified→ambiguous **≤5/39** | Baseline 6, 3, 1, 13 respectively. Requires material removal and false-ambiguity improvement without added regression. |

These thresholds are **policy screens**, not statistical confidence bounds or evidence of population prevalence. A change from 90 to 91 correct, or from 0.6954 to 0.70 macro F1, is noise-level for this decision; a score meeting one or two rows but failing another does not advance. A fall below the baseline accuracy or macro F1, loss of more than the allowed correct cases, or increased targeted boundary errors is a semantic regression; a candidate failing any gate is rejected for final advancement, with gray/uncertain results investigated rather than optimized by another run. Selected-checkpoint development loss under the new full-response target is for the fixed checkpoint rule only, not a substitute for raw metrics.

## 13. Repeatability Gate

After the one checkpoint is selected and converted, use **three complete sequential raw passes** over the same 124 development IDs, just as in the approved baseline. Primary semantics come from pass 1 only. Each pass must have 124/124 valid structure; passes 2 and 3 must each match pass 1 on **124/124 exact raw strings, 124/124 labels, and 124/124 valid/invalid statuses**. Preserve all raw outputs and report per-case disagreement and metric spread; no majority vote, retry, or choice of a better pass. This strict threshold matches the observed original-model baseline; a mismatch is **inconclusive** for development advancement and stops this one-run proposal. If GPU checkpoint selection or GGUF conversion cannot yield the specified comparison runtime, stop rather than changing this gate after results.

## 14. Historical Comparison

The original GGUF's first-pass P1-L1 run on these same 124 development rows is the **directly comparable development screen** only if candidate conversion/runtime and parser match. Historical Phase III-I (73/90, macro F1 80.89%, old four-field P1) and III-I.5 (161/215, macro F1 75.89%, old P1) provide boundary-error context, **not** paired gains/losses. The rejected Phase III-J adapter's 0/124 old four-field structural validity is **not** a semantic comparator and its label-fragment loss is not comparable to a full-response loss. Historical V5 synthetic or postprocessed metrics are not independent evidence. No closed historical corpus is reopened or pooled.

Even same-124 development comparison is not a clean causal ablation of one training target: the original adapter's lineage/data are incompletely known, while the new candidate would be trained from the pinned base with the current reviewed train set. Do not call any observed gain a proven target-only effect or a final generalization result.

## 15. Development-Overfitting Risk

Train remains **477 train rows only**; development remains **124 screening rows only**, never token-supervised training data. It has already been inspected for the baseline and architecture decision, and its two ambiguous labels give little independent power. The proposed gates are fixed here before any candidate output, but still risk overfitting the research process to known failure directions. Do not edit prompt text using case-specific development errors, resample or relabel rows, choose a checkpoint by the desired confusion matrix, or run repeated training cycles until gates pass. The frozen checkpoint rule (lowest new-target development loss at the three epoch checkpoints) is the **only** model-selection step; after selection, one candidate is evaluated once under three repeat passes. If it fails or is inconclusive, stop and seek a new evidence review. This dataset cannot validate calibration, unseen-domain performance, end-to-end retrieval, or a production release.

## 16. Final Acceptance-Gate Compatibility

The request names `tools/phase3j_kaggle/acceptance_gate_v1.json`; the actual frozen file is [`evaluation/phase_iii_j/frozen/acceptance_gate_v1.json`](../evaluation/phase_iii_j/frozen/acceptance_gate_v1.json). It is unchanged. Its old comparison explicitly requires the same **four-field P1** prompt and SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339` for old/new models, so it **cannot be applied verbatim** to P1-L1. A new, separately approved label-only translation must be frozen *before* opening final; passing all development gates is insufficient without that approval.

| Existing final-gate item | Classification | Required handling; no change made here |
| --- | --- | --- |
| Old model identity hash, final seal/counts/scored support, six-class ontology | **STILL APPLICABLE** | Retain frozen identities and scoring denominators as metadata; do not access final payload during design. |
| Removed co-primary: ≥4 more correct and ≥4 fewer removed→modified; contradiction co-primary: ≥3 more correct and ≥3 fewer contradiction→modified | **STILL APPLICABLE** numerically | Keep both all-required count/percentage-point semantics on paired raw labels. |
| Added secondary: ≥2 more correct and ≥2 fewer added→modified | **STILL APPLICABLE** numerically | Keep the count and 6.90-point interpretation; no lowering. |
| Modified/added/unchanged/ambiguous correct-loss caps; modified→removed/contradiction increase caps; macro-F1 absolute gain ≥0.03 | **STILL APPLICABLE** numerically | Keep every all-required protection and metric definition. Additional false-ambiguous controls would require separate gate approval, not a silent substitution. |
| Full raw structure 182/182, including unscored rows | **REQUIRES TRANSLATION** | Keep 100% requirement, but parse strict one-key label-only JSON instead of the old four-field schema. Do not call this a pass of the old raw structure condition. |
| 30-ID hash-selected repeat: ≥29/30 agreements and at most one extra disagreement versus old | **REQUIRES TRANSLATION** | Preserve selection/thresholds, but run both models under the same approved P1-L1 prompt/strict parser; no pre-existing old P1-L1 final results are assumed. |
| p95 latency ≤1.25× old, peak RSS ≤7 GiB, zero swap, candidate GGUF ≤6 GB | **STILL APPLICABLE** as limits; protocol **REQUIRES TRANSLATION** | Measure matched same-host/build/CPU label-only invocations and converted candidate GGUF; retain all numerical ceilings. |
| Old exact P1 prompt hash, four-field schema, `confidence`/`reasoning`/`changed_elements` expectations | **NO LONGER APPLICABLE** as written | Replace only through explicit versioned approval; label-only model must never fill fields with pseudo-values. |

The final gate's `comparison`, `prompt_sha256`, `resource_comparison`, and `rejection` wording must be versioned for the new contract. Semantic thresholds are preserved, not weakened. Do **not** edit the old file, reuse its status label for a P1-L1 result, or open final until a separate authority approves the translated gate and exact old/new final protocol. This is a hard blocker, not a paperwork footnote.

## 17. Final-Holdout Policy

The sealed final payload remains unopened and unavailable for training, checkpoint selection, development scoring, error inspection, prompt design, or gate translation. If **all** development gates later pass, freeze exactly one selected adapter and its hash, tokenizer/base provenance, single GGUF conversion and hash, P1-L1 bytes, parser/scorer versions, matched old/new runtime, and the separately approved translated final gate **before** requesting any final inference. Then, only with separate authorization, compare the original and one candidate exactly once on the protected final set, preserve raw evidence, and apply all approved conditions. A failure rejects the candidate; no second look, threshold adjustment, or relabeling. Passing final would still require independent API/product review before promotion. This proposal neither opens final nor authorizes the future comparison.

## 18. Artifact and Provenance Plan

Future experiment identity: **`phase3j-label-only-corrective-v1`**, separate from rejected `phase3j` and withdrawn `phase3j-corrective-1`. Before any authorized run, create a new config identity/hash and allowlisted package manifest (not built here) that records parent frozen config hash, exact one-field target/EOS specification, P1-L1 prompt hash, code commit/diff, 477/124 dataset hashes, six-label ontology, tokenizer artifact SHA-256, base revision **and each downloaded base-weight shard hash**, dependency and CUDA/Python/GPU versions, seed, quantization/LoRA/optimizer settings, full-response mask audit, intended output directory, and final seal **metadata only**. Record checkpoint selection rule before training; do not reuse the prior run directory or resume its checkpoint.

After a separately approved run, preserve training logs, all checkpoint identities, selected adapter SHA-256, tokenizer metadata, per-row development raw outputs, scorer/metrics hashes, runtime measurements, one conversion recipe and GGUF SHA-256, and a provenance manifest. The rejected adapter SHA-256 `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21` and its backup stay immutable. Do not package final case text, commit large weights/evidence, or conflate an adapter-only training artifact with a tested GGUF candidate. This is a naming/recording plan, not construction of a runnable package.

## 19. Stop Conditions

Exactly **one** corrective training iteration may be proposed; approval is not granted here. If future preflight finds a tokenizer/hash/length/mask mismatch, no run starts. If the resulting candidate fails 124/124 strict structure, **reject and stop**. If semantic metrics regress or any development gate fails, **reject for final advancement and stop**; if evidence, repeatability, or matched runtime is incomplete, classify **inconclusive and stop**. Do not open final after failure or inconclusiveness. If a separately authorized one-time final comparison fails any approved gate, **reject and stop Phase III-J promotion**. No automatic second training attempt, hyperparameter sweep, prompt fix, field fabrication, or final retry; a second iteration would require a new evidence review and explicit authorization.

## 20. Risks

- The AI-reviewed training labels and six ambiguous examples may encode annotation-boundary noise. Some reviewed-modified development text itself sounds unresolved under P1-L1; a candidate might learn inconsistent decisions. No relabeling or new data is authorized here.
- Full JSON+EOS training fixes a supervision gap but does not guarantee better semantics; structural success alone is insufficient. One train/development-selected checkpoint may overfit a small, already-inspected synthetic development set.
- The development gates are numerous and correlated, chosen after seeing the original-model baseline. They are predeclared for the candidate but not independent proof; a pass would justify only a separately approved final comparison.
- The original and candidate have different adapter provenance. Even a matched Q4_K_M runtime cannot isolate training-target correction as the sole cause of a gain.
- A label-only output is incompatible with today's FastAPI/Go four-field path, whose confidence filter and generated descriptions/elements are operational. Product migration is out of scope; no label-only candidate is automatically deployable.
- The old frozen final gate embeds P1 and four-field structure. A separately approved, numerically non-weakened label-only translation is mandatory before any final use; absent approval, stop.

## 21. Authorization Boundary

**THIS DOCUMENT DOES NOT AUTHORIZE TRAINING.** It does not authorize training-code, config, dataset, prompt, acceptance-gate, inference-service, Go, frontend, or model-weight changes; no Kaggle launch, runnable package build, GPU use, final-holdout access, commit, push, tag, merge, or promotion. The only change in this task is this analysis document. The proposal is a candidate for review, not an execution order.

## 22. Recommended Next Action

Review and approve or reject this proposal.
