# Phase III-J proposal — targeted semantic-boundary repair (not authorization to train)

Status: **PROPOSAL ONLY**. Phase III-I's preregistered gate found retraining justified by seven explicit-removal requests labeled modified across seven domains under oracle requirement delivery. The current Q4_K_M model, P1, PP1, retrieval, and production defaults remain frozen. No training, GPU use, cloud rental, model release, or promotion is authorized by this document.

## Objective and hypothesis

The narrow target is removed versus modified when an explicit baseline option, delivery channel, data item, or permitted scope is eliminated while another baseline behavior remains. Two added-to-modified misses are a secondary boundary. The seven same-domain unchanged-to-drift errors are **label-sensitive** because the messages request unrelated new capabilities; they must not become training targets until a separate human adjudication resolves the P1 interpretation. The Phase III-I cases themselves remain a closed final and must never enter train, validation, prompt examples, or development tuning.

## Data engineering before model work

1. Inventory the probable V5 SFT train (8,327 rows), validation (969), test (974), and the asserted but unrecovered legacy 1,858-row source. Recover source manifests and exact hashes where possible; do not present the archive as proven byte-identical to the historical adapter run.
2. Deduplicate normalized and semantic near-duplicates. Group by source project, requirement family, message template, and paraphrase family **before** splitting. Audit lexical shortcuts and numeric-mask templates. Keep a provenance record for every row, including source, author, reviewer, license/privacy classification, and split.
3. Create new, realistic hard examples for the removal boundary across independent domains and writing styles. Include minimal pairs: remove one of two options; change only a value while keeping options; add an option while retaining the original; violate an explicit invariant; and genuinely unresolved requests. Have humans review labels blind to model outputs. Disagreement requires documented adjudication; do not force class balance.
4. Allocate grouped train/development/validation partitions with no project or template-family leakage. Build a fresh, separately authored, independent final set **after** the development protocol is fixed. Reserve Phase III-I exclusively for one locked regression check after candidate selection, not iteration.

## Model experiment

Use the same Qwen2.5-7B base for the first controlled comparison so the primary variable is repaired supervised data, not a simultaneous base-model change. Reconstruct the exact base and adapter lineage before training. Compare the frozen current Q4_K_M model against a new LoRA/QLoRA adapter trained from the approved grouped corpus. The historical r16/alpha32/dropout 0.05 setup is a reproducibility reference, not an unexamined default; predeclare any hyperparameter change and bounded search on development only. Record tokenizer, base revision, adapter configuration, seed, library versions, dataset hashes, checkpoint hashes, quantization path, and generation settings. Do not reuse the current final cases as few-shot examples or training data.

The candidate must improve independently reviewed removed recall and removed-versus-modified confusion without material regression on added, contradiction, ambiguous, unchanged, JSON validity, or latency/resource limits. Report raw numerators and per-class metrics; do not select a winner from accuracy alone. Run a fresh final exactly once. Include PP1 ablation and an end-to-end retrieval-separated check so classifier gains are not confused with requirement-delivery changes.

## Compute, safety, and rollback

Training requires a separately approved, dedicated GPU environment rather than this laptop's CPU container. Choose the machine only after a small resource profile estimates VRAM, RAM, disk, wall time, and cost for the selected base/QLoRA configuration; no GPU or rental is authorized now. Keep data local until privacy/license review permits any upload. Preserve the current model SHA-256 11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9 as the rollback artifact. Promotion requires a clean independent final, model-free and integration verification, resource checks, documented risk acceptance, and a separately approved deployment decision. Otherwise retain the current production default.
