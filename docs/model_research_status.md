# Model Research Status

**Authoritative Phase III decision as of 2026-10-09:** model research is frozen. Keep the existing original GGUF as the selected production/default model. The Phase III-J label-only candidate is **DEVELOPMENT REJECT** and a research artifact only. Phase III-K is **NEW_DATA_ONLY_PHASE_JUSTIFIED**; the reviewed development set is **CLOSED_FOR_FUTURE_TUNING**. No training, replacement, final-holdout evaluation, or production-contract migration is authorized here.

## Model identities and preservation

| Role | Ignored local artifact | SHA-256 | Status |
| --- | --- | --- | --- |
| Selected original GGUF | `models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf` | `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` | Retain; currently referenced by the model Compose profile. |
| Phase III-J label-only GGUF | `models/gguf/phase3j_label_only_v1/DriftLedger-Phase3J-LabelOnly-v1-Q4_K_M.gguf` | `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f` | Rejected research artifact; never promote by rename. |
| Phase III-J training ZIP | `archive/phase_iii_j/drift_phase_iii_j_label_only_v1_training_evidence.zip` | `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f` | Preserved private evidence. |

These three local hashes were rechecked for Phase IV-A. The CPU-screen evidence inventory (`archive/phase_iii_j/label_only_candidate_cpu_screen_v1/evidence_hashes_final.json`) and Phase III-K analysis inventory (`archive/phase_iii_k/analysis_hashes.json`) remain in ignored local archives, **not available from a fresh Git clone**; their saved inventory files were rehashed, not promoted into Git. Model files and evidence archives must not enter a Docker build context or source commit.

## Evidence and decision sequence

1. Earlier Phase III work established the original-model and retrieval/evaluation history. Read the [Phase III final report](phase_iii_final_report.md), [Phase III-I report](phase_iii_i_final_report.md), [Phase III-I.5 report](phase_iii_i_5_final_report.md), and [model card](model-card.md) as historical, protocol-specific evidence—not as current approval for a new candidate.
2. The first Phase III-J four-field adapter run failed its output-contract expectations. The [baseline outcome](phase_iii_j_baseline_outcome.md) and [contract review](phase_iii_j_model_output_contract_review.md) document why unsupported field supervision was rejected.
3. A label-only corrective training package and one selected adapter were preserved. The selected adapter was converted through a pinned LoRA-to-GGUF route and quantized once to Q4_K_M; the [candidate freeze](phase_iii_j_label_only_candidate_freeze.md) and [conversion result](phase_iii_j_label_only_conversion_result.md) record identities and checks. Conversion success was not acceptance.
4. The matched CPU Q4_K_M development screen compared original and candidate under P1-L1 on the same 124 reviewed development cases. The candidate reached 114/124 accuracy with 124/124 valid outputs on each of three passes, but failed three predeclared gates: macro F1 0.777456 below 0.78, ambiguous 0/2 below 2/2, and added→modified 2/24 above 1/24. The [CPU-screen result](phase_iii_j_label_only_cpu_development_screen_result.md) is the controlling **DEVELOPMENT REJECT** record; improvements on other metrics do not override it.
5. The [Phase III-K post-rejection analysis](phase_iii_k_post_rejection_analysis.md) examined saved development evidence without another model run. It found no defensible same-data tuning path. A future phase would need genuinely independent data, consistent adjudication, a new locked evaluation partition, and separate authorization **before** any training proposal.

## Architectural boundary

The model's semantic responsibility is a six-class classification suggestion. The current application has **not** migrated to a label-only production API: the FastAPI/Go path still handles a historical four-field response containing `label`, `confidence`, `reasoning`, and `changed_elements`. Parsing and normalization occur at the inference boundary; Go owns authorization, persistence, workflow and business rules. Display and any scoring are application/evaluation functions, not authority granted to generated text. The [architecture](architecture.md), [security boundary](security.md), and [model-output review](phase_iii_j_model_output_contract_review.md) describe the distinction. The proposed [label-only final-gate translation](phase_iii_j_label_only_final_gate_translation.md) remains inactive and does not change production or permit final access.

## Data and final-holdout boundary

The reviewed 124-case development set has been repeatedly used for baseline, gate design, screening, and diagnosis; it is closed for future tuning. **NEW INDEPENDENT DATA REQUIRED** is a condition for considering research again, not permission to train now. The Phase III-J sealed final holdout was not opened, scored, or used by Phase III-J, Phase III-K, or this Phase IV-A audit. Its historically documented Downloads path was absent during this audit, so current custody/location cannot be independently verified from the workspace; no search of its payload was performed. Do not treat absence from that path as permission to recreate, locate for inspection, or access it.

Older reports remain intact as dated evidence. Where an older plan or interim result appears to authorize a next step, this status and the later frozen rejection/Phase III-K decision control the current research posture.
