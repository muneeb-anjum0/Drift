# Phase III-J pre-training checkpoint — awaiting authored/reviewed cases

Date: 2026-10-06 (Asia/Karachi). This is **not** the Phase III-J final report and makes **no** trained-candidate decision.

## Verified starting point

`main` and `origin/main` were clean/equal at `9b5424f18d6944640c29e44415c274240788f69d`. PR #24 is merged; its head was `2742e6a93215e8e10783e6ba0f5071950bd09b56`. Work began on `phase-3/targeted-retraining`. The Phase III-I.5 decision remains `TARGETED RETRAINING SCOPE REVISED`, with raw 161/215 correct, macro F1 75.89%, and 216/216 structurally valid. The historical Phase III-I result remains 73/90, macro F1 80.89%. These datasets have different compositions and are closed to training.

## Work completed without model execution

- Re-read the III-I.5 report, III-J proposal, III-I report, V5 provenance inventory, model card/manifest, P1, and historical training script. The historical Qwen2.5-7B base revision is `a09a35458c702b33eeacc393d103063234e8bc28`; the recovered adapter SHA-256 is `97dd550561f64f4d07880079e1b8df60642a8ea5e195bc1fc1982548a88df4af`. These are identity references, **not** a newly frozen III-J training configuration.
- Ran reproducible aggregate-only V5 forensics. The [data report](phase_iii_j_data_forensics.md) and [machine evidence](../evaluation/phase_iii_j/v5_training_forensics_v2.json) document split/template risk, class skew, source limitations, and exact closed-corpus overlap counts. No closed-case text was emitted or reused.
- Prepared the [new-case author/review packet](phase_iii_j_author_review_packet.md), blank templates, and a fail-closed review/split validator. It preserves proposed and reviewed labels, rejects exact closed overlap and high lexical similarity to closed classifier cases, checks family-disjoint partitions, requires explicit Kaggle upload approval for train/development, and seals final text by hash while keeping it out of the training payload. These checks are proxies, not a certificate of semantic independence.
- Added model-free tests to the existing verification workflow. No model, prompt, retrieval, PP1, or production configuration was changed.

## Resource and provenance gate

The local laptop has a GTX 1060 Max-Q with 6 GiB VRAM, approximately 15 GiB host RAM, and the existing CPU llama process remains running. Training was **not** attempted locally. The user specified Kaggle as the training environment and will perform the upload/run. Kaggle accelerator type, available VRAM, library versions, and runtime have not been observed; no hardware-dependent configuration or training ZIP can truthfully be declared ready yet. The user chose to provide **their authored cases and their review**. That will be self-review, not second-reviewer independent adjudication; the provenance limitation must remain explicit.

## Blocking inputs and next boundary

The newly authored Phase III-J case file, human-review decisions, and separately authored final-holdout partition have **not yet been supplied**. Consequently there is no reviewed/split/frozen training corpus, no final-holdout hash seal, no quantitative acceptance gate tied to reviewed support, no committed Kaggle training configuration, no upload-ready training ZIP, no training run, no adapter, and no old-vs-new final result. Creating those by guessing or by recycling closed Phase III-D/E/I/I.5 material would violate the directive.

On receipt: validate the supplied review exactly; adjudicate any overlap flags without altering protected labels; freeze train/development and final hashes plus quantitative gates/config in a commit **before** Kaggle training; build a Kaggle ZIP containing only approved train/development data and frozen code/config; have the user run it on the selected Kaggle GPU; then ingest its artifact/logs and perform the locked old-vs-new holdout comparison once. Do not start training or publish/merge an incomplete Phase III-J PR at this checkpoint.
