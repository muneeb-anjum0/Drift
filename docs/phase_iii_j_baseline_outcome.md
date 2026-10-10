# Phase III-J baseline: development failure and bounded follow-up

Date: 2026-10-08. Decision: **reject the first trained adapter as a candidate; do not open the protected final holdout or promote it.** This is a development-stage decision, not a measured result against the preregistered final acceptance gate. The current production model and inference path remain unchanged.

## Preserved baseline evidence

The private Kaggle v2 run completed 180 optimizer steps. The downloaded, intact run archive contains `checkpoint-180/trainer_state.json`, which records `global_step=180`, `best_global_step=60`, and best development label-token loss `0.12416867166757584`. Its selected `best_adapter/adapter_model.safetensors` has SHA-256 `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21` and matches checkpoint 60. These facts were rechecked directly from the archived state and adapter on 2026-10-08, without loading or running the model locally.

The training script then failed during export: its guard mistook the 5,265-byte `training_args.bin` metadata file for an extra weight artifact. A separate inference-only recovery ran on the selected adapter in the private Kaggle notebook. Its displayed development summary was **0/124 strictly structure-valid outputs and macro-F1 0.0**; the displayed per-class correct counts were zero for all six labels (added 24, ambiguous 2, contradiction 16, modified 39, removed 24, unchanged 19 support). These figures are transcribed from the notebook output shown by the user, not re-derived from a locally preserved metrics file. The best-checkpoint loss measures label-token prediction and does not establish valid end-to-end JSON generation.

The recovery wrote `development_metrics.json`, `development_predictions.json`, and `recovery_manifest.json` in Kaggle's temporary `/kaggle/working` directory, but its evidence ZIP was not downloaded before the session ended. A later fresh session found an empty working directory, and the saved notebook version's Output was empty. **Those machine-readable recovery files are not preserved locally.** The helper's predictions file also omitted raw generated text, so neither the exact malformed responses nor their cause can be established from the available evidence. The development summary is enough to reject this candidate; it is not enough to claim a diagnosed failure mechanism or a fully reproducible evaluation record. No final-holdout inference was run.

The following files were moved from Downloads into the private, Git- and Docker-ignored `archive/phase_iii_j/` directory. Their hashes were checked before and after the move; the full run ZIP passed a ZIP integrity test.

| Local artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `drift_phase_iii_j_compat_v2_original_backup.zip` | 818,597,114 | `852c453e29803237eb2112b54ca805a0ed585570b094945075263514c319fa25` |
| `drift_phase_iii_j_training_compat_v2.zip` | 75,201 | `c2492dad96a34dac232b0cc52bc9b526300967c7d43b4f87f2cd5d240104a8cf` |
| `drift_phase_iii_j_recovery_helper_v1.zip` | 3,805 | `b9a9053824de25d41333239ec6dcdbb7cf33d7ad3236678571d05a179f90c01f` |

The full run backup contains the adapter and checkpoint evidence, not the lost recovery metrics. The original data are AI-authored and separately AI-reviewed, **not human-reviewed**; that methodological requirement remains unmet.

## Mechanism hypothesis, not a finding

The frozen [`encode_rows`](../tools/phase3j_kaggle/phase3j.py) function trains only the reviewed label value and closing quote after a prompt ending in `{"label":"`. Development [`evaluate_development`](../tools/phase3j_kaggle/phase3j.py) instead generates from the plain assistant prompt, and `strict_prediction` requires a complete four-key JSON object (`label`, `confidence`, `reasoning`, `changed_elements`). The supervision/output-contract mismatch is a plausible explanation for 0/124 valid responses, but the absent raw generations prevent confirming it. Truncation, extra text, field errors, or another generation problem remain possible.

Do not make the result look better by weakening the strict parser, changing P1, inserting synthetic explanation fields after generation, or scoring label fragments as valid full responses. Such changes would alter the frozen raw-output contract rather than repair this candidate.

## One bounded correction path

1. **Diagnose before retraining.** In a private GPU session, restore the saved adapter and run a small, deterministic development-only raw-output probe (for example, the first two IDs in each of the six development classes sorted by ID). Save exact raw generations, tokenizer/decoding settings, parse-failure reasons, run identity, and hashes **outside the temporary session before closing it**. This is inference only; do not open the final holdout. If no GPU session is available, leave the mechanism unresolved rather than guessing.
2. **Conditional single intervention.** If the probe confirms label fragments or incomplete JSON, change only the supervised **response target** for one separately versioned follow-up experiment: train on complete P1-compatible JSON objects while keeping base revision, label ontology, P1, inference contract, split membership, optimizer/LoRA settings, and acceptance thresholds fixed. Complete `reasoning` and `changed_elements` targets must be human-reviewed and supported by each case; do not fabricate them from class labels. Version and hash the new targets and predeclare the follow-up before any training. If reviewed full responses cannot be obtained, stop instead of running a speculative follow-up.
3. **Check development first.** Preserve raw predictions and machine-readable metrics. A candidate with invalid structure does not advance. Only after a defensible candidate is frozen may a separately authorized one-time final comparison use the sealed holdout under the preregistered gate. No retraining, final evaluation, production promotion, release, merge, or push is authorized by this report.

The original one-follow-up limit still applies; there is no hyperparameter sweep or endless retry loop.

As of 2026-10-08, the [development-only probe runbook](phase_iii_j_probe_runbook.md) and a compact private upload bundle have been prepared and model-free checked. The probe has **not** been run on a GPU; no new model results or correction decision are claimed.

Post-probe addendum (2026-10-08): the 12-case GPU diagnostic has since completed. Its verified result and limitations are recorded separately in the [structural-failure probe report](phase_iii_j_structural_failure_probe.md). The pre-probe statements above are retained as the historical evidence boundary; the rejected baseline, unopened final holdout, and no-promotion decision are unchanged.
