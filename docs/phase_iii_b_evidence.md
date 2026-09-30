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
