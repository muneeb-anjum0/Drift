# Phase III-B Controlled Improvement Evidence

Status: experiment infrastructure and protected data freeze. Baseline V0 remains immutable in commit `66bb5fe7a0c98c20a40b3dd19113a641f5b71b7f`.

## Git baseline

- Baseline evidence branch: `phase-3/model-baseline-v0` at `66bb5fe`, clean and six commits ahead of `main`/`origin/main` when verified.
- Experiment branch: `phase-3/model-improvement-v1`, created from exact `66bb5fe`.
- The pre-existing annotated tag `phase-3-model-baseline-v0` peels to artifact commit `5421d1f`, not evidence-complete commit `66bb5fe`. It was not moved or overwritten.
- No Phase III/III-B commit has been pushed or merged.

## Dataset freeze

The machine-readable dataset inventory is [dataset_map_v1.json](../evaluation/dataset_map_v1.json). Development data remains separate from two new prospective final-test sets. The final raw set has 24 balanced cases across six labels and eight domains. The final retrieval set has 12 queries over projects containing 10 and 16 requirements. Both were frozen before experiments and must not guide tuning.

These sets are held out from Phase III-B development decisions. They are **not proven held out from original adapter training**, because the recovered model did not include its training data. Both are synthetic and single-author; final evidence will therefore remain qualified.

## V0 prompt and configuration

The exact V0 task prompt, user template, Qwen framing, and decoding configuration are frozen in [v0.json](../evaluation/prompts/v0.json). V0 uses temperature 0, top-p 1, 120 predicted tokens, context 768, one CPU llama slot, and artifact SHA256 `11e2ca...19ac9`.

## Experiment discipline

The registry is [registry.json](../evaluation/experiments/registry.json). Experiments use stable IDs and change one major variable at a time. Historical and full-system regression cases may detect breakage but may not justify acceptance. Rejected experiments remain recorded. No retraining will occur unless deterministic retrieval, prompt specification, label quality, and postprocessing causes are excluded first.

## Diagnostic experiments

### D1 — top-k only

Hypothesis: raising the maximum selected requirements would recover most retrieval misses. Using unchanged V0 rankings and relevance decisions, k=3→5 improved model-input recall only from 16/24 (66.7%) to 17/24 (70.8%), increased average model calls from 1.125 to 1.25, and increased false-candidate exposure from 10 to 12. **Rejected:** most missed candidates never pass the relevance gate, so top-k is not the primary cause.

### D2 — oracle retrieval

Each development query was paired directly with every expected requirement, bypassing production retrieval. The unchanged V0 prompt/model classified 19/28 pairs correctly (67.9%; weighted F1 66.7%). Six of thirteen `added` pairs became `modified`; one contradiction became modified, one unchanged webhook paraphrase became modified, and one modification became added. All outputs parsed. Mean latency was 11.84s, p95 14.25s, at 5.19 generated tokens/s.

This diagnostic shows that perfect retrieval would not eliminate the semantic label-boundary problem. Retrieval and prompt/model classification both require isolated experiments. The six-label macro F1 is not used for this oracle because the diagnostic set is unbalanced and has no ambiguous examples.

## Retrieval experiments

### R1 — conjunction normalization

Hypothesis: treating `and` as retrieval evidence polluted rankings. The sole scorer change added `and` to the existing stopword set. All-expected reach improved from 16/24 to 17/24; Recall@1 from 68.8% to 72.9%; Recall@3 from 81.3% to 85.4%; and MRR from 0.837 to 0.862. It recovered `sq-04`, where the correct API requirement had previously ranked fourth. False-candidate exposure stayed 10, while average selected requirements rose slightly from 1.125 to 1.167.

**Accepted as a candidate retrieval component.** This is a general normalization correction, not a case-specific rule. It changes one of 24 outcomes, so the gain remains statistically modest; seven queries still miss expected requirements.

### R2 — evidence-backed vocabulary normalization

Hypothesis: vocabulary gaps caused the remaining lexical misses. Only general synonym/domain normalization supported by the failure ledger was added; weights, gate, threshold, and k remained fixed. All-expected reach improved from 17/24 to 24/24, Recall@1 to 87.5%, Recall@3 to 97.9%, and MRR to 0.979. False-candidate exposure remained 10. Average selected requirements rose from 1.167 to 1.583 because the seven missing queries now admitted their true candidates.

**Inconclusive under the predeclared gate.** The semantic hypothesis is strongly supported, but average calls narrowly exceeded the planned `<1.5` limit. The criterion is not changed after seeing results. R2 remains available only as the base for a separately measured candidate-filtering experiment.

### R3 — top-k 2 after vocabulary normalization

Reducing k from 3 to 2 lowered average calls from 1.583 to 1.5 and false exposure from 10 to 9, while model-input recall became 97.9%. It dropped the genuine booking requirement from the two-change `cq-08` message. **Rejected:** losing a real multi-requirement candidate is not justified by one fewer false exposure and 0.083 fewer calls/query.
