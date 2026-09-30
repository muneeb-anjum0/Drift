# Postprocessing Rule Audit

The Phase III baseline does not remove or tune `drift_postprocess.go`. This audit classifies its existing behavior before any optimization.

| Rule or stage | Classification | Rationale |
|---|---|---|
| `normalizeLabel` | VALIDATION / NORMALIZATION | Constrains output to the implemented taxonomy and converts unknown labels to `ambiguous`. |
| `CleanReasoning` | NORMALIZATION | Deduplicates and bounds presentation text without intentionally changing the label. |
| `NormalizeModules` | NORMALIZATION | Canonicalizes module names without deciding requirement semantics. |
| grouping duplicate changes | DOMAIN INVARIANT | Consolidates repeated analyses referring to one semantic change. |
| family/parent portal rules | EVALUATION-SPECIFIC COMPENSATION | Encode actors, modules, hours, and wording from canonical benchmark/demo scenarios. |
| SMS OTP rule | EVALUATION-SPECIFIC COMPENSATION | Forces `added`; its broad `authentication method` term changed two unrelated security cases in the development ablation. |
| late-submission rule | MODEL COMPENSATION | Forces a specific policy interpretation and estimate rather than only normalizing model output. |
| card-payment removal rule | EVALUATION-SPECIFIC COMPENSATION | Closely matches the historical benchmark and forces label, impact, effort, summary, and recommendation. |
| appointment window/contradiction rules | EVALUATION-SPECIFIC COMPENSATION | Encode the historical 24-hour/2-hour/after-time cases and expected answers. |
| vague-dashboard rule | EVALUATION-SPECIFIC COMPENSATION | Encodes the canonical vague dashboard example and expected clarification behavior. |
| clinic analytics / interactive report rules | EVALUATION-SPECIFIC COMPENSATION | Phrase lists force a reporting redesign result; the broad `filters` term introduced an error in the development ablation. |
| same-report / same-prescription access rules | EVALUATION-SPECIFIC COMPENSATION | Encode known regression examples and override model semantics. |
| deterministic scoring and bounded effort | DOMAIN INVARIANT | Product-owned deterministic policy, evaluated separately from classifier correctness. |

Measured on `drift-raw-dev` 1.0.0, the postprocessor corrected one raw error, introduced two, and did not change the label for 45/48 cases. Accuracy moved from 66.7% to 64.6%. Therefore these rules cannot currently be described as a net quality improvement outside the historical examples.
