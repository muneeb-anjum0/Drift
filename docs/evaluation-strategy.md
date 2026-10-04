# Evaluation and Held-Out Strategy

## Dataset roles

| Dataset | Role | May guide changes? | Status |
|---|---|---:|---|
| Historical Go benchmark | Regression | Yes, only to prevent regressions | Contaminated: examples occur in source/tests and training overlap is unknown. |
| `drift-raw-dev` 1.0.0 | Development | Yes | Prospective, balanced, versioned; not proven independent from unrecovered training data. |
| `drift-retrieval-dev` 1.0.0 | Retrieval development | Yes | Prospective synthetic project retrieval set. |
| `drift-retrieval-dev` 2.0.0 | Expanded retrieval development | Yes | v1 plus 36 frozen synthetic additions; 60 queries including hard negatives and multi-target cases; single-author labels pending review. |
| `drift-raw-final` 1.0.0 | Phase III-B final raw test | No | Frozen before experiments; executed once per V0/V1; now closed to tuning. |
| `drift-retrieval-final` 1.0.0 | Phase III-B final retrieval test | No | Frozen before experiments; executed once per V0/V1; now closed to tuning. |
| `drift-retrieval-independent-evaluation` 1.0.0 | Phase III-D protected retrieval evaluation | No | Four new synthetic medium-sized projects; 40 user-supplied reviewed decisions; frozen before R0/R5. R5 did not generalize. Reviewer human independence and original adapter-training non-overlap cannot be independently verified. |
| `drift-phase-iii-e-retrieval-development` 1.0.0 | Retrieval development | Yes, before R6 freeze only | Thirty synthetic single-author cases across 8-, 16-, and 32-requirement projects; exact/near lexical overlap audit recorded. Closed to R6 tuning after the development freeze. |
| `drift-phase-iii-e-independent-retrieval` 1.0.0 | Phase III-E protected retrieval evaluation | No | Thirty synthetic cases, 24 confirmed and six revised review decisions; frozen before R0/R5/R6. R6 generalisation was not supported. Reviewer independence and adapter-training non-overlap cannot be machine-proven. |

The recovered adapter's TRAIN split is unknown. No recovered artifact establishes its contents, hash, sampling, labels, or split method. Therefore none of the current corpora can be called held out from adapter training.

The Phase III-B final sets are synthetic and single-author. They are prospective relative to the Phase III-B experiments, but they do not satisfy the stronger independent-review ideal below and cannot be proven independent from original adapter training.

## Final-test protocol for future cycles

Before accepting an optimized candidate:

1. Have at least two reviewers independently author or label new cases not copied from repository examples. Include all six labels, multi-change projects, retrieval distractors, adversarial language, and domains not dominant in development.
2. Resolve reviewer disagreement before model execution and preserve both original labels plus adjudication notes.
3. Freeze dataset bytes, version, SHA256, class/domain/difficulty distributions, taxonomy version, and expected requirement IDs.
4. Keep final-test case text out of prompts, rules, tests, and development reports. Do not inspect case-level model failures during tuning. Never tune against the now-closed Phase III-B final sets.
5. Freeze candidate artifact, prompt, parser, retrieval, postprocessor, scoring, decoding, and runtime identities before the first final-test run.
6. Run the final test once for selection. If the methodology or labels contain a demonstrable defect, version a replacement and document why the earlier result is invalid; never silently edit it.
7. Report raw model, retrieval, postprocessing ablation, and full-system results separately with uncertainty and all failures. Predeclare candidate acceptance gates before execution.

The final test may be prospective relative to future optimization, but without the historical training data it still cannot prove independence from the adapter's original training corpus. That limitation must remain attached to every claim.

## Leakage audit

- Deterministic exact-string search found zero `drift-raw-dev` baseline requirements or client messages outside tracked `evaluation/` files.
- Historical benchmark prompts and expected semantics occur in Go source, tests, frontend/demo material, and canonical postprocessing.
- Prompt examples include label-shaped output but not the prospective development cases.
- Near-duplicate semantic patterns necessarily exist (password reset, cancellation, reports) because they are product domains; this is not evidence of training leakage.
- Exact or near overlap with adapter training is UNKNOWN because no training dataset was recovered.

Dataset files are immutable by version. Any case change requires a new version and hash; reports always identify the exact dataset SHA256.

## Metrics and ablation policy

Raw classification reports accuracy, macro/per-class precision-recall-F1, confusion matrix, strict-JSON rate, normalized contract parse rate, calibration, latency, tokens/second, and bootstrap intervals. Retrieval reports Recall@1, Recall@3, MRR, precision@3, model-input recall after the production gate/cap, all-expected reach, false-candidate exposure, and average model calls. Postprocessing reports every changed label, corrections, introduced errors, wrong-to-different-wrong changes, and net correct-case contribution.

Experiments receive stable IDs and a written hypothesis, one primary variable, held constants, dataset identity, and acceptance rule before implementation. Raw model, retrieval, parsing/normalization, individual postprocessing groups, and full behavior are measured separately. Rejected and inconclusive experiments remain in [the registry](../evaluation/experiments/registry.json).

Phase III-B final results are in [final_V1_comparison.json](../evaluation/reports/final_V1_comparison.json). The combined V1 candidate was rejected because final all-expected retrieval reach regressed from 5/12 to 4/12, even though raw classification improved. No post-final tuning or rerun is permitted with these sets.

## Phase III-C retrieval protocol

The evaluator now records the exact production-normalized tokens, domains, component scores, threshold/gate decisions, stable rank, top-k decision, raw hit counts, Recall/Precision@1/@3/@k, MRR, at-least-one reach, all-expected reach, false exposure, and selected-call count. Production and evaluation share `TraceRequirementRelevance`; the evaluator does not reimplement scoring.

R0 was frozen before the v2 additions were used for candidate selection. Experiments then changed one major variable at a time: suffix normalization (R1 retained), k=5 (R2 rejected), threshold 0.20 (R3 rejected), specific-gate removal (R4 rejected), and alias expansion (R5 development-selected). R2–R4 recovered too few targets for their false-exposure/call cost. Exact reports and negative results remain in `evaluation/phase_iii_c`.

At the end of Phase III-C, R5 could not enter final-test acceptance because no new independent final corpus had been frozen before its development. The next cycle had to commission that corpus under the protocol above. The closed Phase III-B final sets may be cited as historical evidence but never used to select or tune R5.

## Phase III-D disposition

A new retrieval draft was reviewed with 35 confirmed and five revised decisions; proposal and review were preserved separately. The reviewed 40-query set was committed and hashed before executing the frozen R0 and R5 scorers. Both delivered 25/42 expected links and fully reached 16/32 positive queries; R5 added one false exposure and no true hit. It failed the frozen generalisation gate. Full evidence and category-level results are in [the Phase III-D final report](phase_iii_d_final_report.md).

This protected set is now closed to tuning. Do not modify its labels, use its individual failures to tune R5, or rerun an altered R5 against it as a new blind test. A future retrieval candidate needs a new independently reviewed evaluation set, ideally including small and large projects. Phase III-D V3 was not run because its predeclared R5 prerequisite failed, so there is no new independent model-quality claim or retraining justification.

## Phase III-E retrieval and model-isolation disposition

R6 was designed only from Phase III-C and new Phase III-E development data. Controlled development candidates included BM25 ranking, a pinned small CPU sentence encoder, a coarse lexical/semantic hybrid, and transparent clause decomposition. The development-selected R6-S1 encoder and its exact source/model/configuration were frozen in `evaluation/phase_iii_e/r6_development_freeze_v1.json` before final-set construction. The independently reviewed 8-/16-/32-requirement set preserves proposed and reviewed target IDs; the review record, dataset bytes, SHA256, and predeclared decision rule were committed before predictions. No Phase III-D case-level result guided R6.

The one blind comparison delivered 20/36 target links for R0, 20/36 for R5, and 22/36 for R6. R6 reached 9/10 small, 7/14 medium, and 6/12 large links and failed the unchanged 90% overall and 85%-per-size gates. R6 therefore has **GENERALISATION NOT SUPPORTED** status even though it gained two links over R5. The reviewed set is now closed to further tuning or reruns as a new blind test. Full counts, category slices, false exposures, traces, and paired exploratory uncertainty are in `evaluation/phase_iii_e/blind_analysis_v1.json` and the Phase III-E report.

The downstream V3/oracle prerequisite was false. No 7B classifier inference, raw P1 result, PP1 contribution, or real R6 pipeline result was measured in Phase III-E. Retrieval errors must not be mislabeled as classifier errors. Retraining remains **NOT YET JUSTIFIED**: a future training proposal requires reliable retrieval or separate oracle evidence identifying recurring true model failures, a known and privacy-reviewed training corpus, a new independent future test, and explicit hardware/authorization. R6 remains offline research tooling, not production Go retrieval.
