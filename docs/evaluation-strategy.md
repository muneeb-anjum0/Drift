# Evaluation and Held-Out Strategy

## Dataset roles

| Dataset | Role | May guide changes? | Status |
|---|---|---:|---|
| Historical Go benchmark | Regression | Yes, only to prevent regressions | Contaminated: examples occur in source/tests and training overlap is unknown. |
| `drift-raw-dev` 1.0.0 | Development | Yes | Prospective, balanced, versioned; not proven independent from unrecovered training data. |
| `drift-retrieval-dev` 1.0.0 | Retrieval development | Yes | Prospective synthetic project retrieval set. |
| Future final test | Final test | No | Must be created and frozen before optimization claims; not yet created. |

The recovered adapter's TRAIN split is unknown. No recovered artifact establishes its contents, hash, sampling, labels, or split method. Therefore none of the current corpora can be called held out from adapter training.

## Final-test protocol

Before accepting an optimized candidate:

1. Have at least two reviewers independently author or label new cases not copied from repository examples. Include all six labels, multi-change projects, retrieval distractors, adversarial language, and domains not dominant in development.
2. Resolve reviewer disagreement before model execution and preserve both original labels plus adjudication notes.
3. Freeze dataset bytes, version, SHA256, class/domain/difficulty distributions, taxonomy version, and expected requirement IDs.
4. Keep final-test case text out of prompts, rules, tests, and development reports. Do not inspect case-level model failures during tuning.
5. Freeze candidate artifact, prompt, parser, retrieval, postprocessor, scoring, decoding, and runtime identities before the first final-test run.
6. Run the final test once for selection. If the methodology or labels contain a demonstrable defect, version a replacement and document why the earlier result is invalid; never silently edit it.
7. Report raw model, retrieval, postprocessing ablation, and full-system results separately with uncertainty and all failures.

The final test may be prospective relative to future optimization, but without the historical training data it still cannot prove independence from the adapter's original training corpus. That limitation must remain attached to every claim.

## Leakage audit

- Deterministic exact-string search found zero `drift-raw-dev` baseline requirements or client messages outside tracked `evaluation/` files.
- Historical benchmark prompts and expected semantics occur in Go source, tests, frontend/demo material, and canonical postprocessing.
- Prompt examples include label-shaped output but not the prospective development cases.
- Near-duplicate semantic patterns necessarily exist (password reset, cancellation, reports) because they are product domains; this is not evidence of training leakage.
- Exact or near overlap with adapter training is UNKNOWN because no training dataset was recovered.

Dataset files are immutable by version. Any case change requires a new version and hash; reports always identify the exact dataset SHA256.
