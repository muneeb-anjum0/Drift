# Model Acceptance Criteria

These candidate-promotion criteria were defined after Baseline V0 measurement. They are product review gates, not claims that the current model meets them.

| Dimension | Candidate gate | Rationale |
|---|---:|---|
| Raw macro F1 | At least 0.80 on development and no statistically credible regression on final test | Current 0.669 hides severe class imbalance in quality despite a balanced corpus. |
| Per-class recall | At least 0.80 for contradiction and removed; no class below 0.70 | Missing explicit conflicts/removals has higher product cost; current values are 0.625 and 0.50. |
| Retrieval model-input recall | At least 0.90 overall and 0.85 at every measured project size | The classifier cannot recover a requirement it never receives; current overall is 0.667. |
| Contract parse success | 100% | Product behavior must fail explicitly rather than accept malformed model output; baseline normalizer achieved 48/48. |
| Strict JSON output | At least 0.95 | Baseline is 0.521, creating unnecessary parser dependence even though recovery succeeded. |
| High-confidence errors | No more than 2% at confidence ≥0.90, reported with count | Baseline has 2/48 (4.2%); confidence affects trust even when non-authoritative. |
| Postprocessing contribution | Must not reduce accuracy; every semantic override needs general evidence | Baseline contribution was -1/48. |
| Sequential CPU p95 | No worse than 18 seconds under the frozen hardware/runtime | Baseline p95 is 15.90 seconds; modest allowance avoids optimizing quality at unusable latency. |
| Runtime failures | 0 in the quality run; explicit bounded failure when unavailable | Baseline had 0/48 runtime errors and explicit 502/503 recovery behavior. |

Final-test acceptance requires both effect size and uncertainty, not a tiny point-estimate improvement. Any candidate must be compared with Baseline V0 using the same taxonomy, dataset bytes, prompts, decoding, and runtime unless the experiment explicitly isolates one changed component.

## Phase III-C gate application

R5 is the strongest retrieval development candidate but fails the existing retrieval gate. On `drift-retrieval-dev` 2.0.0 it reaches 59/74 expected links (79.7% micro recall), with small/medium/large recall of 68.0%/92.0%/79.2%; the gate requires at least 90% overall and 85% at every measured size. Because no new independent final set was frozen and downstream model execution was explicitly out of scope on this laptop, integrated V2 status is `INCONCLUSIVE`, not accepted.
