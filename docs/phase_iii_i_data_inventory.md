# Phase III-I data provenance and training-readiness audit (pre-prediction)

This inventory does not change prior Phase III conclusions or claim the new oracle set is reviewed. The user-supplied `archive/drift-dataset-kaggle-v5-cumulative` is **untracked and read-only**; it is not added to Git. Aggregate measurements are in [archive_audit_v2.json](../evaluation/phase_iii_i/archive_audit_v2.json). The audit streams files and emits no raw cases.

## Role inventory

| Material | Role for III-I | Verified status / constraint |
| --- | --- | --- |
| V5 `data/train/qwen_sft_train.jsonl` | probable adapter TRAINING | 8,327 rows, SHA-256 `ab80546e9ac74f4f11c6a15cf2f5626ef8ed4f189a574999601d06264caee435`; six valid assistant labels. Adapter name, LoRA r16/alpha32/dropout .05, script, 1,041 steps at accumulation 8, and 969 validation examples align. No checkpoint dataset hash proves exact byte identity. |
| V5 `data/validation/qwen_sft_val.jsonl` | adapter VALIDATION | 969 rows, SHA-256 `f60a3f5dd9091cc48ac383ee2c0dc8a27a1aa04dd5d8f7b7fa9134b39048edc5`. |
| V5 `data/test/qwen_sft_test.jsonl` | historical TEST, not III-I decision | 974 rows; not a newly independent final for this model research. |
| V5 `data/full/qwen_sft_full.jsonl` | union/archive | 10,270 rows, including all train/validation/test. |
| V5 CSV `driftledger_{train,val,test,full}.csv` | source/analysis views | 7,757 / 969 / 974 / 9,700 rows. The SFT train adds 572 pair keys absent from CSV train and removes two duplicate CSV pairs, giving 8,327. |
| V5 external holdouts and stress/special sets | CLOSED HISTORICAL evaluation | The archive explicitly labels external holdouts evaluation-only. Do not use their cases to tune or author III-I items. |
| Legacy 1,858-row custom dataset | UNKNOWN / report-only historical source | Archive inventory/merge reports assert 1,858 rows and class counts modified 498, added 310, ambiguous 280, unchanged 278, removed 260, contradiction 232. The shipped V5 data files do not contain `custom_dataset_legacy`; the legacy raw rows are not recovered here, so counts are report-supported, **not independently verified from rows**. |
| Historical `drift_raw_dev_v1` (48) and H selected singleton cases | DEVELOPMENT | Open, previously used; tool validation only, not the III-I decision set. |
| Phase III-B `drift_raw_final_v1` (24) | CLOSED FINAL | Do not inspect failures or tune against cases. |
| Phase III-D/E independent retrieval corpora | CLOSED FINAL | Do not inspect case-level content or guide oracle labeling. |
| Phase III-G batch panel and H raw traces | DEVELOPMENT/REGRESSION | Open, not independent classifier truth. |
| P1/v0 prompts and Go historical benchmarks | PROMPT/REGRESSION | P1/v0 have no few-shot cases; source benchmarks are known test/regression material. |
| New III-I decision draft | PROPOSED, not scored | Must receive independent human review, freeze, hash, and commit before any model prediction. |

## Split and shortcut findings

For the shipped V5 CSV train/validation/test, normalized requirement+message exact pair overlap between train and validation/test is **0/0**, and ID overlap is **0/0**. The same holds for the SFT train versus validation/test. A bounded same-baseline message-token Jaccard ≥0.8 check found no non-exact cross-split matches, but it cannot detect paraphrased baselines or all template families. CSV training has two repeated normalized pair rows; SFT training has zero repeated normalized pairs. Baseline reuse is substantial (3,436 excess train rows) and message reuse is substantial (2,594 excess train rows), so row-level random splits can still share lexical templates. Numeric-masked message templates have 368 keys shared train↔validation and 388 train↔test. That is a **leakage risk**, not proof of answer leakage. The original grouping/split-generation code has not been located; the archive files demonstrate split membership but not grouped-by-project/template construction.

The reported V5 TF-IDF merged-test macro-F1 is **0.9969** on 1,156 cases, with masked-keyword macro-F1 **0.9913** and perfect reported stress/special-set results. Those figures are in the archive report, but its exact generating script/data combination is not reproducible from the shipped `train_tfidf_baseline.py`, which names different evaluation sets. The earlier ≈0.987 figure in the directive is **not verified** by this archive. Extremely high lexical scores on simulation cannot establish semantic dataset quality; template, split, and shortcut artifacts remain plausible. No Phase III-I model inference has been run to select cases or labels.

Training-data readiness: **REPAIRABLE / NOT READY FOR AUTOMATIC RETRAINING**. The archive provides substantial candidate data and split metadata, but is simulated, has strong template reuse, lacks an independently reproduced lexical benchmark, and has no independently verified archive-to-adapter hash or realistic human-reviewed case distribution. Any later training proposal must group by source/project/template family, de-duplicate semantic families, add reviewed hard negatives/minimal pairs targeted to observed oracle errors, and keep the III-I decision set permanently held out. This classification is pre-evaluation; it may be updated only with new evidence, not to rationalize a model score.
