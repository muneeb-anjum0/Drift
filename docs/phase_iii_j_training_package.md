# Phase III-J frozen Kaggle training package

Status on 2026-10-06: **prepared, not trained**. No final-holdout inference, model candidate freeze or production promotion has occurred. The original package is `/home/muneebanjum/Downloads/drift_phase_iii_j_training.zip`, SHA-256 `cc4198e6054f3a8578a607cfd563619eeaef9024b56f3750b2812ddcce79ee54`. It is intentionally outside Git; the script and frozen inputs used to build it are committed. The [methodology deviation](phase_iii_j_methodology_deviation.md) is part of this experiment: cases are AI-authored and separately AI-reviewed, **not human-reviewed**; the original human-review requirement remains unmet.

## 2026-10-07 Kaggle compatibility repair

The private Kaggle dataset and notebook passed model-free preflight (477 train, 124 development) and full resource/dependency preflight using Python 3.12.3, one Tesla T4, the exact frozen dependency pins, `/tmp/drift_hf_cache`, and `/kaggle/working` for output. The first training attempt downloaded the base weights but stopped while constructing `TrainingArguments`, before any optimizer step: `TypeError: TrainingArguments.__init__() got an unexpected keyword argument 'save_safetensors'`. The failed output contains a run identity but no checkpoint, so it must not be resumed. The Hugging Face unauthenticated-request warning was not the cause.

The repaired package is `/home/muneebanjum/Downloads/drift_phase_iii_j_training_compat_v2.zip`, SHA-256 `c2492dad96a34dac232b0cc52bc9b526300967c7d43b4f87f2cd5d240104a8cf`. The sole training-code change removes the unsupported `save_safetensors=True` argument. PEFT's adapter save defaults to safetensors, and the script still checks for `best_adapter/adapter_model.safetensors` and rejects extra weight files. The packaged README now documents the verified Python 3.12/`uv` and scratch-cache route plus a fresh output directory. This is an execution compatibility repair, not a change to the frozen experiment: P1, config, model revision, dependency pins, train/development cases, acceptance gate, and final-holdout seal remain byte-identical. The repaired ZIP was built without overwriting the original, its allowlisted nine members and hashes passed validation, and the protected final case text was absent. Local model-free tests passed (4/4). At package-build time it had **not** yet been executed on Kaggle; subsequent execution is recorded below.

## 2026-10-07 completed-run export recovery (in progress)

The private Kaggle v2 run completed all 180 optimizer steps and the development pass. Trainer state selected checkpoint 60 (`best_metric=0.12416867166757584`), and `best_adapter/adapter_model.safetensors` matches that checkpoint byte-for-byte (SHA-256 `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21`). The subsequent export guard failed because it treated Trainer's 5,265-byte `training_args.bin` metadata as an unexpected model-weight file. The process exited before writing development metrics, predictions, or `training_manifest.json`. This is an export failure, not a retraining authorization or a final-result claim.

The untouched Kaggle run was archived as `drift_phase_iii_j_compat_v2_original_backup.zip` and downloaded to `/home/muneebanjum/Downloads/`. The 818,597,114-byte ZIP has SHA-256 `852c453e29803237eb2112b54ca805a0ed585570b094945075263514c319fa25`, matching Kaggle, and its ZIP integrity test passed. It contains all three checkpoints, the selected adapter, trainer state, and run identity. The smaller Kaggle essential backup is optional and does not replace the full archive.

`tools/phase3j_kaggle/recover_phase3j.py` is a separately identified **development-only, inference-only** recovery helper; it never calls `train`, edits the original run, or reads final-holdout rows. It checks the exact v2 package, frozen config and run identity, step-180 trainer state, selected checkpoint-60 adapter hash, and safetensors contents; it allows only the known small `training_args.bin` metadata alongside adapter weights. It then recomputes development label loss and 124 raw generations using the frozen base revision, quantization, P1 prompt and selected adapter, writing metrics, predictions, and a provenance-rich `recovery_manifest.json` to a new output directory. Exact `TrainOutput.training_loss` was lost in the failed export and is explicitly `null`, not fabricated. The helper was model-free dry-run tested against extracted copies of the actual v2 package and downloaded run. A one-file private-upload helper ZIP is `/home/muneebanjum/Downloads/drift_phase_iii_j_recovery_helper_v1.zip`, SHA-256 `b9a9053824de25d41333239ec6dcdbb7cf33d7ad3236678571d05a179f90c01f`; no trained weights or final rows are in it. Kaggle recovery inference is **pending**. No model has been run on the laptop; no final test, promotion, release, merge, or push has occurred.

## Frozen data and seal

| Partition | Rows | Scored | SHA-256 |
| --- | ---: | ---: | --- |
| Train | 477 | 477 | `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658` |
| Development | 124 | 124 | `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7` |
| Final, sealed outside Git | 182 | 179 | `a3a391962e0fac7b6129d4ea57808a6b4189444fb106395d4d944b9c93670ccb` |

Final reviewed support is added 29, modified 48, removed 32, contradiction 21, ambiguous 23, unchanged 26; three review-`AMBIGUOUS` rows are unscored. The final payload is `/home/muneebanjum/Downloads/phase_iii_j_reviewed_final_sealed_v1.json` and remains outside the ZIP and repository. The [data report](phase_iii_j_post_review_validation.md) and [freeze manifest](../evaluation/phase_iii_j/frozen/pretraining_manifest_v1.json) contain source/review hashes and mechanical checks.

## Predeclared final acceptance gate

The machine-readable [gate](../evaluation/phase_iii_j/frozen/acceptance_gate_v1.json), SHA-256 `a78695c5c7d68df066ddae968bb18348ff08c5cccfbe404f6530aab1f2bf6962`, was frozen before training or final predictions. The eventual comparison is old frozen raw GGUF versus one frozen new raw candidate, with the same P1 singleton contract and no PP1 in primary scoring. Every condition is required, not just overall accuracy:

| Target/control | Raw-count rule | Rate interpretation |
| --- | --- | --- |
| Removed co-primary | At least 4 more correct **and** at least 4 fewer removed→modified | ≥12.5 percentage-point recall gain on 32 |
| Contradiction co-primary | At least 3 more correct **and** at least 3 fewer contradiction→modified | ≥14.29 points on 21 |
| Added secondary | At least 2 more correct **and** at least 2 fewer added→modified | ≥6.90 points on 29 |
| Modified protection | No more than 2 fewer correct; modified→removed and modified→contradiction each increase by at most 1 | ≤4.17-point recall loss on 48 |
| Unchanged and ambiguous | Each loses at most 1 correct | ≤3.85 points on 26; ≤4.35 points on 23 |
| Macro F1 | Candidate − old ≥0.03 | Absolute six-class macro-F1 gain |
| Structure | 182/182 raw results structurally valid | 100% of scored and unscored cases |
| Repeat stability | At least 29/30 repeat label agreements; no more than one extra disagreement versus old | Fixed ID-hash selection, not outcome selection |
| Latency/resources | New p95 ≤1.25× old; peak RSS ≤7 GiB; zero swap; candidate GGUF ≤6 GB | Same host, llama.cpp build and decoding; otherwise inconclusive |

Missing measurements or a changed seal make the result inconclusive; failed measured gates reject the candidate. Thresholds will not be relaxed after final results. These values are preregistered decisions, not empirical results.

## Frozen one-candidate training configuration

The [config](../evaluation/phase_iii_j/frozen/training_config_v1.json), SHA-256 `4ef6911d9e7508184db146bdb7e49dec18b4e26ba2edfe7285b5fb9d774bc0a3`, fixes `Qwen/Qwen2.5-7B-Instruct` base and tokenizer at revision `a09a35458c702b33eeacc393d103063234e8bc28`, exact [P1](../evaluation/prompts/P1.json) SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`, and the existing six-label ontology. It uses 4-bit NF4 double-quantized QLoRA, float16 compute, LoRA rank 16/alpha 32/dropout 0.05 on q/k/v/o/gate/up/down projections; paged 8-bit AdamW; learning rate 2e-4; linear schedule; 12 warmup steps; three epochs; batch 1 with accumulation 8; sequence limit 768; seed 1729. Checkpoint and development-loss evaluation occur each epoch; the lowest-development-loss checkpoint is loaded at end. No early stopping or hyperparameter sweep is configured. The dependencies are pinned in the ZIP; Python 3.11/3.12 and one CUDA GPU with ≥14 GB VRAM, ≥12 GB host RAM, ≥22 GB model-cache scratch and ≥5 GB output space are preflight requirements. Hardware identity and exact runtime library versions are logged.

The frozen cases contain reviewed classes but no reviewed explanations. Training therefore supervises only the label value and closing quote after the exact P1 prompt and JSON label prefix; it does **not** fabricate `reasoning` or `changed_elements` targets. Development generation still requests the unchanged full P1 JSON structure and reports train loss, dev label-token loss, accuracy, macro precision/recall/F1, per-class support and precision/recall/F1, confusion matrix, six directed boundary confusions, structural validity and latency. This is development-only model selection; it is not final acceptance. The expected output is PEFT `adapter_model.safetensors` plus adapter/tokenizer metadata, not base weights or GGUF.

## ZIP layout and Kaggle operation

The ZIP has one `drift_phase_iii_j_training/` folder with exactly nine members: `phase3j.py`, `README.md`, `requirements.txt`, `P1.json`, `training_config_v1.json`, `acceptance_gate_v1.json`, `reviewed_train_v1.json`, `reviewed_development_v1.json`, and `package_manifest.json`. The manifest records complete file hashes, config/gate hashes, train/dev hashes and **only the final hash and count**. No final row, final label payload, protected III-D/E/I/I.5 text, model weight, cache or secret is included. The build tool uses an allowlist and refuses ZIP overwrite; the validator checks member hashes/counts, safe paths, exact protected-text exclusion and secret patterns. Extracted model-free preflight passed.

The user should upload the ZIP as a **private** Kaggle dataset, attach it to a private GPU notebook, enable Internet for pinned dependency installation and the pinned base-model download, then follow the ZIP's `README.md`. The script resolves its package files relative to its own path, so the Kaggle dataset slug need not be hardcoded. Run the model-free dry run, install pinned requirements, run full GPU/resource preflight, then run `train`. `/kaggle/working/drift_phase_iii_j` holds output; `/kaggle/temp/drift_hf_cache` is the default base-model cache. If the latter is unavailable, pass a suitable writable cache path with the same free-space requirement. Do not run training on this laptop.

On success, download/preserve `training_manifest.json`, `development_metrics.json`, `development_predictions.json`, all checkpoint metadata and `best_adapter/`. Resume an interrupted run only with `train --resume` and the same package/config; a mismatched identity or absent checkpoint fails. If the preflight or runtime fails, preserve the exact log and do not silently change config, dependencies, model, labels or thresholds. The pinned direct/transitive dependency set resolved under the local Python resolver and passed `pip-audit`; GPU training and CUDA/Kaggle runtime compatibility **have not been executed or verified here**.

## Candidate freeze and later final procedure

After Kaggle training, review development metrics only. Before opening the final holdout, select exactly one adapter checkpoint and record its SHA-256, base revision, config/train/dev/gate hashes, exact package and software versions, GPU, duration, peak VRAM, dev metrics and selected checkpoint. Freeze any conversion/quantization to the comparison runtime and its hash. No further tuning may occur after candidate freeze. A later separately authorized phase may then open the sealed final once and run old/new raw models under the identical singleton P1 inference contract, followed by the preregistered acceptance calculation. PP1 and retrieval/end-to-end checks remain separate. A successful gate does not itself promote the model.
