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

### R4 — generic actor/container stopwords

R4 tested whether `patient`, `customer`, `project`, `task`, and `into` were generic corpus noise, keeping R2 vocabulary, scores, gates, threshold, and top-k fixed. Average calls fell from 1.583 to 1.292 and false exposure from 10 to 7, but model-input recall fell to 89.6% and only 20/24 queries retained all expected requirements. It lost `cq-08/c-book`, `eq-05/e-email`, `sq-06/s-dashboard`, and `sq-07/s-search`. **Rejected and reverted:** these nouns carry genuine intent in several requirements.

## Prompt experiments

### P1 — explicit taxonomy and instruction boundary

P1 changed only the prompt text. It made the six labels mutually exclusive, defined partial elimination as removal, and told the model to treat both compared fields as untrusted business content. The model artifact, development dataset, decoding, parser, normalization, and one-slot CPU runtime remained fixed.

P1 improved raw accuracy from 32/48 (66.7%) to 36/48 (75.0%) and macro F1 from 0.669 to 0.756. All 48 outputs parsed, compared with all 48 under V0; strict raw-JSON validity also improved from 52.1% to 100%. P95 latency rose from 15.90s to 16.44s (3.4%), within the predeclared 20% ceiling. No class recall regressed: added improved from 62.5% to 87.5%, contradiction from 62.5% to 75.0%, and ambiguous from 37.5% to 50.0%; modified, removed, and unchanged were unchanged.

The prompt corrected `add_security_01`, injection case `add_saas_01`, `con_logistics_01`, and `amb_finance_01`, with no previously correct case becoming wrong. `rem_logistics_01` moved from `unchanged` to `modified` but remained incorrect, and removed recall stayed 50%. **Accepted as a candidate prompt component:** every predeclared acceptance gate passed, while partial-removal reasoning remains a documented limitation.

## Postprocessing experiments

### Rule classification

The complete inventory is [postprocessing_rule_inventory_v1.json](../evaluation/postprocessing_rule_inventory_v1.json). Label spelling, reasoning cleanup, and module-name normalization are contract normalization and remain. Generic grouping and canonical presentation enrichment are legacy behavior retained under monitoring. The twelve scenario-specific canonical label assignments are not domain invariants: they encode recurring portfolio/benchmark scenarios or compensate for classifier behavior. They are classified as benchmark-specific heuristics or prompt/training compensation.

The traced V0 changes support that classification. `sms_otp` accidentally corrected `add_security_01` because `otp` matched inside `TOTP`, but the same rule changed the correct `removed` result for `rem_security_01` to `added` after matching “authentication method.” `interactive_reports` changed the correct `ambiguous` result for `amb_analytics_01` to `modified` after the broad term “filters” matched. None expresses a generally valid semantic invariant.

### PP1 — preserve validated semantic labels

PP1 removed the hard-coded label field and assignment from canonical rules. Rules can still group a scenario and supply its canonical title, impact, modules, summary, recommendation, and effort estimate, but the normalized classifier label remains authoritative. The full Go suite passed, including new tests for the two observed broad-match regressions and existing grouping/enrichment assertions.

Replaying all 48 V0 development cases produced 32/48 before and after postprocessing, with zero corrected cases, zero introduced errors, and zero label changes. This improves full postprocessing from 31/48 to 32/48 and changes its semantic contribution from -1 to 0. **Accepted as a candidate postprocessing component:** it passes every predeclared gate and removes hidden benchmark-shaped classifier overrides.

The workstation crash removed the untracked full V0 raw report. The PP1 replay input was therefore reconstructed exactly for the fields consumed by `eval-postprocess` from the frozen development cases and the normalized outputs in the versioned error ledger. The report identifies this reconstructed source; this is strong deterministic ablation evidence but not a new model run.

## V1 combined candidate and final heldout result

V1 was frozen before final-set inspection as R1 retrieval + P1 prompt + PP1 postprocessing, using the unchanged Q4 artifact. R2 was excluded because it missed its predeclared call gate; R3 and R4 were excluded because they lost genuine requirements. Production prompt rendering was verified byte-identical to P1. Development evidence met the candidate gates: raw classification was 36/48 with macro F1 0.756 and 100% parsing; retrieval reproduced R1 at 17/24 all-expected reach with 1.167 calls/query; PP1 changed no P1 labels; all Go, inference, lint, typecheck, and client-build checks passed.

The two frozen final datasets were then evaluated once per frozen system. On the 24-case raw set, V0 scored 17/24 (70.8%, macro F1 0.691) and V1 scored 19/24 (79.2%, macro F1 0.786). V1 produced strict JSON on 24/24 versus 17/24 for V0, with 100% contract parsing for both. P95 latency was effectively unchanged at 13.60s versus 13.62s. V1 fixed four V0 errors and introduced two regressions; its 95% bootstrap intervals overlap V0 because the sample is small.

On the 12-query retrieval final set, V0 reached every expected requirement in 5/12 queries with model-input recall 45.8%; V1 reached all expected requirements in 4/12 with model-input recall 37.5%. V1 improved Recall@1 and MRR and reduced calls, but lost both expected requirements for `ifq-05` that V0 selected. Both frozen postprocessors made zero label changes on their respective final raw outputs.

**Integrated V1 decision: rejected.** The raw and postprocessing gates passed, but the predeclared requirement that final all-expected retrieval reach not regress failed. No post-heldout tuning was performed, and these final sets are now closed to future tuning. P1 and PP1 remain individually supported experiment results; R1 must not be promoted on this evidence.

No model retraining was launched. The strongest remaining blocker is deterministic retrieval generalization, while the unchanged model improved materially under P1. Training provenance is still unavailable, and CPU-only retraining would not address the failed retrieval gate. A future cycle should form a new development-only retrieval hypothesis and freeze a new independent final set before candidate selection.
