# Phase III-J Label-Only Candidate Freeze

## Status and authorization

**Candidate status: `TRAINED_NOT_YET_DEVELOPMENT_ACCEPTED`.** The one authorized Kaggle training run completed. This record freezes the selected adapter's identity; it does **not** authorize or record GGUF conversion, candidate development inference, final-holdout access, acceptance, production use, retraining, or checkpoint substitution. The prior [training outcome document](phase_iii_j_label_only_training_outcome.md) is a **pre-run blocked snapshot** and is superseded as a statement of current training status by the independently verified archive below; its historical text has not been rewritten.

## Evidence and candidate identity

| Field | Frozen value / verification |
| --- | --- |
| Experiment | `phase3j-label-only-corrective-v1`; target construction `complete-label-json-eos-v1` |
| Evidence archive | Ignored `archive/phase_iii_j/drift_phase_iii_j_label_only_v1_training_evidence.zip`; SHA-256 `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f`; ZIP integrity **PASS** |
| Extracted evidence | Ignored `archive/phase_iii_j/label_only_evidence.IqqIf87M/drift_phase_iii_j_label_only_v1/`; no repository source overwritten |
| Selected checkpoint | `checkpoint-120`; `training_manifest.json`, `development_metrics.json`, and `checkpoint-180/trainer_state.json` agree |
| Adapter | `best_adapter/adapter_model.safetensors`; SHA-256 `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`; byte-identical to `checkpoint-120/adapter_model.safetensors` |
| Adapter config | `best_adapter/adapter_config.json`; SHA-256 `2adae8421b6445aa6235f57b0afd81597b87f077ad9c8d422273d3f11a653828`; same hash at checkpoint 120 |
| Saved tokenizer | `best_adapter/tokenizer.json`; SHA-256 `3fd169731d2cbde95e10bf356d66d5997fd885dd8dbb6fb4684da3f23b2585d8`; `tokenizer_config.json` SHA-256 `04b1682c59acbd057f4c9072297faa73d56fc9de053094c659cdb4c464f58f86` |
| Model-free audit tokenizer | Packaged `audit_tokenizer.json`, SHA-256 `c0382117ea329cdf097041132f6d735924b697924d6f6fc3945713e96ce87539`. Its bytes differ from the saved tokenizer; Kaggle preflight checked matching tokenization on all permitted prompt/target strings. Future conversion must verify effective tokenizer behavior/metadata, not silently substitute either file. |
| Base model/revision | `Qwen/Qwen2.5-7B-Instruct` at `a09a35458c702b33eeacc393d103063234e8bc28` |
| Train/development | SHA-256 `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658` / `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7` |
| P1-L1 prompt | SHA-256 `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470` |
| Training config | SHA-256 `cae5a832ec1ab6f4bc87bf9a65ce43015ffac6a0bc462281c332134d6eb458c9` |
| Approved package | ZIP SHA-256 `4888ae364903b1375b18c902ac5462c0e71071c416ec000bd9800a37d7855082`; package manifest SHA-256 `828161f5932d3db93aa6c1538d1036cc245d7987123921fac652d3147870b016`; development-gate JSON SHA-256 `cadc64da3c89e1c450cbee8096d4bc64d54101cb74559343fbcd363106bb8967` |
| Source identity | Branch `phase-3/targeted-retraining`, HEAD/manifest commit `88e81355688ad2daf21ffcc7fac95d26823477ca`; package training-script SHA-256 `01391a402db2cea82d8a9c03ec874140e1b963ae2b0630921947787b0b6fc233`. HEAD alone does not cover pre-existing uncommitted sources; package bytes/hash do. |
| Runtime identity | Python 3.12.3, Tesla T4, VRAM 15,636,037,632 bytes, CUDA runtime 13.0, host RAM 33,658,318,848 bytes; training duration 2,627.6401 s; exact dependency pins are in the package config/requirements and were checked by its runtime preflight, but a separate installed-package snapshot was not archived. |
| Provenance | Synthetic AI-authored, separately AI-reviewed train/development rows; **not human-adjudicated**. No final-holdout examples were used. |

## Selection verification

The frozen rule was lowest **development full-response loss** at epoch checkpoints, not classification accuracy or hand-picked cases:

| Checkpoint | Epoch | Recorded `eval_loss` | Selected? |
| --- | ---: | ---: | --- |
| `checkpoint-60` | 1 | `0.05158354341983795` | No |
| `checkpoint-120` | 2 | **`0.03663229942321777`** | **Yes** |
| `checkpoint-180` | 3 | `0.03668744117021561` | No; later and higher |

The final `trainer.evaluate()` at step 180 returned `0.03663229942321777` because `load_best_model_at_end=True` restored checkpoint 120; it is **not** a fourth checkpoint result. The final trainer state records best checkpoint 120 and best metric `0.03663229942321777`. The saved adapter and checkpoint-120 adapter have the same SHA-256 above.

## Structural/integrity checks

The adapter config matches the frozen LoRA setup: causal-LM LoRA, rank 16, alpha 32, dropout 0.05, bias `none`, and q/k/v/o/gate/up/down projection targets. The safetensors header exposes **392 two-dimensional tensors** (28 layers × 7 target modules × A/B), all LoRA A/B with rank 16; no base-model tensor is in this file. `best_adapter/` contains the adapter safetensors/config, tokenizer metadata, README, chat template, and `training_args.bin`; it has **no base-weight shard or other model-weight file**. The `training_args.bin` is not treated as a model weight and was not unpickled.

All 27 manifest-listed checkpoint files and seven manifest-listed best-adapter files matched their recorded SHA-256 hashes. The development metrics/predictions and mask-audit hashes matched the training manifest. `run_identity.json` agrees with the manifest on experiment, package manifest, training config, base/revision, train/development hashes, and final **seal metadata only**. The four local base-weight shard hashes match the four Kaggle-recorded shard hashes, tying the available conversion base to the trained revision:

| Shard | SHA-256 |
| --- | --- |
| `model-00001-of-00004.safetensors` | `a1333e6293854747c481288ea83b348226af178dd565c49b6f9495ba1966aba7` |
| `model-00002-of-00004.safetensors` | `f5d25a2772cb825164a2a2c0fb6d51a87e282abf21e4dd75bc5cfb3cd0ea6185` |
| `model-00003-of-00004.safetensors` | `8efdec4c1bc12317ae1a38dc42b595ce777738a64deea3fcb8a0a91381bcdfd5` |
| `model-00004-of-00004.safetensors` | `1a72d403cdf0c1ec3cb7f289f17b394a01e64394c2e9b3c0f94dbce3faf879bd` |

## GPU diagnostics are not acceptance

The saved single GPU-adapter diagnostic pass had 124/124 strict-valid outputs, 115/124 correct, accuracy `0.9274193548387096`, macro F1 `0.78275334314808`, and **0/2 reviewed ambiguous cases correct**. Its protocol marker is `GPU_ADAPTER_DIAGNOSTIC_NOT_COMPARABLE`. It does **not** pass or fail the approved development gate. No Q4_K_M candidate exists yet; no matched CPU three-pass candidate screen has run. The development decision is **NOT YET EVALUATED**.

## Final boundary

The evidence ZIP contains the training output directory and no final case payload. The sealed final remains untouched. Even a later development pass would not authorize final inference: the proposed label-only final-gate translation must be separately approved and frozen first. No conversion, quantization, candidate development inference, retraining, commit, or push occurred during this freeze.
