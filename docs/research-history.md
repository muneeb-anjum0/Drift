# Research History and Evidence Custody

This is the current decision and custody index, not a training plan or a substitute for the frozen evidence. **Pre-compression source snapshot:** `cd7880e247156edaf8186034d91df8d59442bb65` on `main`. The full Phase III/IV/V/VI Markdown record remains retrievable from Git history at this exact SHA, for example `git show cd7880e247156edaf8186034d91df8d59442bb65:docs/phase_iii_j_label_only_cpu_development_screen_result.md`. Removing a historical document from the current tree does not remove its bytes from repository history. No tag was created. Tracked machine-readable evidence under `evaluation/` and `docs/model-artifact-manifest.json` remains in the active tree; private archives and model weights are separately ignored/local-only and are **not** present in a fresh clone.

## Current decision and provenance

- **Phase III is frozen.** Keep the original Q4_K_M GGUF, SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`, as the supported local model. Phase III-J candidate GGUF, SHA-256 `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f`, is **DEVELOPMENT REJECT / RESEARCH ONLY**. Conversion was not acceptance.
- The 124-case Phase III-J development set, SHA-256 `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`, is **CLOSED_FOR_FUTURE_TUNING**. Phase III-K concluded **NEW_DATA_ONLY_PHASE_JUSTIFIED**, not permission to train. The Phase III-J final holdout is **SEALED / UNTOUCHED / NOT USED**; this compression did not open, inspect, reconstruct, or score it.
- **AI-authored / separately AI-reviewed data was NOT human-reviewed.** This is the Phase III-J provenance deviation. Mechanical validation and a separate AI review do not satisfy the earlier human-review requirement. Do not describe the J corpus, its training, or its evaluation as human-validated. Phase III-I and III-I.5 have separately *self-attested* human review that the agent did not witness; do not merge those distinct provenance claims with III-J's AI review.
- Original adapter training provenance and independence from historical synthetic sets are unproven. Reported historical quality is protocol-specific, not a claim of production-grade AI, generalization, calibrated confidence, or public-deployment readiness.
- The accepted architectural direction is six-class **label** classification as the model's semantic responsibility. The shipped local inference path has **not** migrated from its historical four-field `label`, `confidence`, `reasoning`, `changed_elements` contract. Unsupported fields must not be fabricated or called reviewed ground truth.

## Evidence and decisions by phase

| Phase / objective | Result and decision | Evidence identity, provenance, disposition |
| --- | --- | --- |
| Baseline V0 and early Phase III | Original GGUF was evaluated as a bounded synthetic baseline; no claim of real-world or training-set independence. | `docs/model-card.md`, `docs/phase_iii_final_report.md` at source SHA; tracked `evaluation/` reports. Original GGUF hash above is the supported runtime identity. |
| III-B retrieval, prompt, postprocessing | Isolated P1 prompt improved development raw accuracy **32/48→36/48**, macro F1 **0.669→0.756**, strict JSON **52.1%→100%**. Integrated V1 was **REJECTED** because final all-target retrieval reach regressed **5/12→4/12**, despite raw final accuracy **17/24→19/24**. PP1 was not a general semantic fix. | `phase_iii_b_final_report.md`, `evaluation/reports/final_V1_comparison.json`; historical P1 SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`. Historical final sets are closed, not available for retuning. |
| III-C/D retrieval R5 | V2 was inconclusive without independent/downstream evidence. Independent III-D test found **R5 GENERALISATION NOT SUPPORTED**; V3 was **NOT EXECUTED / INCONCLUSIVE**. | `phase_iii_c_final_report.md`, `phase_iii_d_final_report.md`; III-D set SHA-256 `ee21e6d6bd2c36324c80e7020bd87d7c2094068d762d943ab7afe581e065e51b`. Reviewer identity/independence was not independently verified. |
| III-E retrieval R6 | Frozen reviewed test missed preregistered recall gates (**22/36** target links, 61.1%, versus 90% overall requirement); **R6 GENERALISATION NOT SUPPORTED**. | `phase_iii_e_final_report.md`; reviewed set SHA-256 `78a8975d35a3fccd931820752304b9d344415f3e841db18db7e549321ff4134c`. Reviewer provenance does not machine-prove independence or human identity. |
| III-F/G pipeline alternatives | No retrieval/pipeline architecture earned a new independent test; **NO ARCHITECTURE YET SUPPORTED**, retraining not yet justified. The seven-case G panel is development-only and partly author-derived. | `phase_iii_f_final_report.md`, `phase_iii_g_final_report.md`, tracked freeze/contamination records under `evaluation/phase_iii_f/` and `evaluation/phase_iii_g/`. No production architecture promotion. |
| III-H structured output | Single-item raw contract was development-supported on a small open panel; batch pipeline **NOT SUPPORTED**. Structural compliance is not semantic/generalization proof. | `phase_iii_h_final_report.md`, `evaluation/phase_iii_h/`; current production P1/four-field parser unchanged by that study. |
| III-I oracle semantic test | Original model: **73/90 correct (81.11%)**, macro F1 **80.89%**, **90/90** valid; PP1 made **0** label changes; selected repeat labels **12/12**. | `phase_iii_i_final_report.md`; frozen corpus SHA-256 `d0fae87de5a9413e3ffd61104e3ca4478c742399f9d49fb36be12231478a12b5`. Human review was self-attested and not independently witnessed; an earlier AI advisory vector matched it. |
| III-I.5 adversarial semantic stress | Original model: **161/215** scored correct (74.88%), macro F1 **75.89%**; **216/216** structurally valid, one unscored ambiguous review case. This is deliberately adversarial/correlated, not a controlled degradation estimate or production prevalence. | `phase_iii_i_5_final_report.md`, raw metrics and error ledger under `evaluation/phase_iii_i_5/`. Human review was self-attested, not witnessed; authorship/exposure and correlated-family limits remain. |
| III-J frozen corpus and first four-field training | **477 train / 124 development** reviewed rows, plus sealed final metadata; first adapter failed strict structural output (**0/124** reported valid in recovery), then its export guard failed after training. Rejected as a candidate, not scored on final. | `phase_iii_j_post_review_validation.md`, `phase_iii_j_methodology_deviation.md`, `phase_iii_j_baseline_outcome.md`. Train SHA-256 `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658`; development hash above. AI-authored/separately AI-reviewed, **not human-reviewed**. The 0/124 figure was transcribed from a user-shown notebook, not re-derived from retained metrics. |
| III-J raw probe and contract diagnosis | A fixed 12-development-case raw probe found label-like text inside malformed four-field output; this was diagnosis, not valid-output accuracy. Reviewed labels exist; reviewed confidence, reasoning, and changed-element targets do not. Masked synthetic placeholders still condition later teacher-forced structural tokens, so the proposed four-field masked-value correction was **NOT SOUND**. | `phase_iii_j_structural_failure_probe.md`, `phase_iii_j_model_output_contract_review.md`, `phase_iii_j_corrective_training_proposal.md` at source SHA. Private raw-probe ZIP SHA-256 `178d44fd5feb7c4db5c01a84bb52ad11d8ea33a80415961e4ffe8f5200ba0039` is ignored/local-only. No production contract change. |
| III-J label-only original baseline | P1-L1 original-model research baseline: **90/124** correct (72.58%), macro F1 **0.6954**; all three passes valid and repeatable. Predeclared removed→modified gate justified *considering* retraining, not automatic promotion. | `phase_iii_j_label_only_baseline_result.md`; P1-L1 SHA-256 `67204d638542f75bb140e5236adbd416c981a38d4903ef500cc8ac18a884b470`. Development-only. |
| III-J corrective label-only training and GGUF conversion | One selected adapter trained; conversion via pinned LoRA→F16 merge→Q4_K_M succeeded. Package ZIP SHA-256 `4888ae364903b1375b18c902ac5462c0e71071c416ec000bd9800a37d7855082`; private training-evidence ZIP SHA-256 `1384215ee87cac32a94a9bad93988806662cb80815d3194388bab152657a153f`; selected adapter SHA-256 `531457905d97c6f944316a6665df52593713b87513369794ecfd8bc6920c5c78`. Conversion is **RESEARCH-ONLY**, not acceptance. | `phase_iii_j_label_only_training_outcome.md`, `phase_iii_j_label_only_candidate_freeze.md`, `phase_iii_j_label_only_conversion_result.md`; ignored private artifacts are not supplied by Git. Some intermediate run hashes were unavailable in the initial training-outcome record and must not be invented. |
| III-J matched CPU development screen | Candidate **114/124** correct (91.94%), **124/124** valid on each of three passes, but failed three *predeclared* gates: macro F1 **0.777456 < 0.78**; ambiguous **0/2 < 2/2**; added→modified **2/24 > 1/24**. Verdict **DEVELOPMENT REJECT**; no final access or production promotion. | `phase_iii_j_label_only_cpu_development_screen_result.md` at source SHA; rejected GGUF SHA-256 above. Candidate and original were compared under matched CPU P1-L1 protocol; no post-hoc gate change. |
| III-K post-rejection closure | Saved evidence did not justify further same-data tuning. **NEW_DATA_ONLY_PHASE_JUSTIFIED** is conditional on genuinely independent data, consistent adjudication, and a new locked evaluation partition plus separate approval. Existing development set closed. | `phase_iii_k_post_rejection_analysis.md` at source SHA; analysis read saved development evidence only, not the sealed final. |
| IV release/staging and local distribution | Source/readiness work established local Linux x86-64 Docker Compose path. **LOCAL_DISTRIBUTION_READY**; second fresh-clone model-free E2E **4/4**, original-GGUF CPU smoke, persistence and synthetic Mongo backup/restore were verified. Public target-host TLS/DNS, original-model load, secret/image digest custody, off-host backup, alerts, rollback, and other gates were **not** thereby passed. Windows/macOS and end-to-end NVIDIA GPU not verified. | `phase_iv_g_local_distribution_readiness.md` and earlier IV reports at source SHA. This is local distribution, **not** public staging/production deployment. No additional model load is performed here. |
| V UI/UX and VI BYOK/integrity | UI journey moved to Project → Agreed scope → New change → Proposed impact → Human decision. BYOK adds encrypted workspace OpenAI-compatible provider selection; later integrity work binds saved analyses to server-generated previews. | Current code and `docs/architecture.md`, `docs/security.md`, `docs/model-and-providers.md`; historical source at pre-compression SHA. Known permission-revocation check-to-persist race remains documented. |

## Historical document disposition

The per-path custody list below names every tracked Markdown document removed by Phases VII-B and VII-C. For **each** listed path, the preservation method is **B: immutable Git history at `cd7880e247156edaf8186034d91df8d59442bb65`**. Important current conclusions and operating constraints are additionally incorporated here or in the other authoritative documents (**method A**). Tracked JSON evidence is deliberately retained (**method C**). Git history is the full-fidelity source for detailed methods, old metrics, review packets, and superseded proposals; this summary must not be mistaken for a complete case-level archive. Private ignored artifacts remain under separate owner custody and are not made public by this document. Phase VII-C redirected the product Evaluation link and the model configuration check to the authoritative guide, so the two short compatibility pages no longer need to remain in the active tree.

| Old file | Current-fact destination (where applicable) | Full-fidelity preservation |
| --- | --- | --- |
| `docs/README.md` | README.md | B: source SHA; A for current facts |
| `docs/analysis_integrity.md` | security.md / architecture.md | B: source SHA; A for current facts |
| `docs/configuration.md` | development.md / deployment.md | B: source SHA; A for current facts |
| `docs/decisions/0001-authority-and-inference-boundaries.md` | security.md / architecture.md | B: source SHA; A for current facts |
| `docs/decisions/0002-local-deployment-tradeoffs.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/evaluation-strategy.md` | research-history.md | B: source SHA; A for current facts |
| `docs/firebase_setup.md` | development.md / deployment.md | B: source SHA; A for current facts |
| `docs/frontend-style-guide.md` | architecture.md / README.md | B: source SHA; A for current facts |
| `docs/known-limitations.md` | security.md / deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/label-taxonomy.md` | research-history.md | B: source SHA; A for current facts |
| `docs/model-acceptance-criteria.md` | research-history.md | B: source SHA; A for current facts |
| `docs/model-card.md` | research-history.md | B: source SHA; A for current facts |
| `docs/model-pipeline.md` | model-and-providers.md / architecture.md | B: source SHA; A for current facts |
| `docs/model_research_status.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_ii_evidence.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_b_evidence.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_b_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_c_dataset_foundation.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_c_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_c_initial_state.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_c_retrieval_architecture.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_d_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_d_review_packet.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_e_development_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_e_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_e_independent_review_packet.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_e_retrieval_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_evidence.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_f_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_f_study_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_g_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_g_study_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_h_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_h_study_addendum.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_h_study_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_5_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_5_independent_review_packet.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_5_methodology.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_5_provenance_deviation.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_data_inventory.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_final_report.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_independent_review_packet.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_i_study_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_author_review_packet.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_baseline_outcome.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_corrective_training_proposal.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_data_forensics.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_baseline_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_baseline_result.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_candidate_freeze.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_conversion_and_cpu_screen_plan.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_conversion_environment.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_conversion_result.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_cpu_development_screen_result.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_final_gate_translation.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_retraining_proposal.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_training_outcome.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_label_only_training_runbook.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_methodology_deviation.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_model_output_contract_review.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_post_review_validation.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_pretraining_checkpoint.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_probe_runbook.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_structural_failure_probe.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_training_package.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_j_training_proposal.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iii_k_post_rejection_analysis.md` | research-history.md | B: source SHA; A for current facts |
| `docs/phase_iv_a_repository_and_release_readiness.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/phase_iv_b_release_candidate_readiness.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/phase_iv_c_release_blocker_remediation.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/phase_iv_d_release_candidate_freeze.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/phase_iv_g_local_distribution_readiness.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/postprocessing-rule-audit.md` | research-history.md | B: source SHA; A for current facts |
| `docs/product-guide.md` | architecture.md / README.md | B: source SHA; A for current facts |
| `docs/productization.md` | architecture.md / Git history | B: source SHA; A for current facts |
| `docs/provider_architecture.md` | model-and-providers.md / security.md | B: source SHA; A for current facts |
| `docs/release_candidate_manifest.md` | deployment.md / operations.md / research-history.md | B: source SHA; A for current facts |
| `docs/staging_backup_restore.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/staging_configuration.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/staging_data_custody.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/staging_host_requirements.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/staging_readiness_gate.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/staging_rollback.md` | deployment.md / operations.md | B: source SHA; A for current facts |
| `docs/ui_ux_current_state.md` | architecture.md / README.md | B: source SHA; A for current facts |
| `docs/ui_ux_redesign.md` | architecture.md / README.md | B: source SHA; A for current facts |
| `docs/verification.md` | development.md / operations.md | B: source SHA; A for current facts |
| `server-go/README.md` | development.md / deployment.md | B: source SHA; A for current facts |
| `tools/README.md` | development.md / deployment.md | B: source SHA; A for current facts |
| `tools/phase3j_kaggle/README.md` | research-history.md (tool remains tracked) | B: source SHA; A for current facts |

All 90 paths above were checked with `git cat-file -e cd7880e247156edaf8186034d91df8d59442bb65:<path>` before removal. The previous commit retains the exact original bytes, including unique details not summarized in the eight-document authoritative set.

Some retained historical JSON manifests and research-only scripts still name the old Markdown paths. They are **snapshot-relative provenance references**, not links to current product guidance. To reproduce a frozen research workflow, check out the historical source SHA in an isolated worktree so the referenced methodology, deviation, and review documents are byte-identical. Do not rewrite frozen manifests or run research against missing/currently substituted documents. The active product Evaluation link and existing configuration check use `docs/model-and-providers.md`.

The Phase III-I.5 integrity test verifies the two retired methodology/provenance documents from that exact Git commit against the unchanged hashes in its frozen pre-inference manifest. CI fetches full history for this check; other manifest inputs remain checked from the active tree. This preserves the original evidence without reintroducing compatibility pages or weakening the hash assertion.
