# Phase III-J methodology deviation — semantic-review provenance

Recorded 2026-10-06, before any Phase III-J training or protected-final prediction.

The original [Phase III-J proposal](phase_iii_j_training_proposal.md) called for human review of newly authored labels blind to model outputs. **That requirement was not satisfied.** The current corpus was AI-authored, then separately AI-adjudicated. The original 757-row review and 26 supplemental decisions are preserved by source hashes in the [pretraining data manifest](../evaluation/phase_iii_j/frozen/pretraining_manifest_v1.json). The supplemental author and reviewer were distinct AI passes; this is not independent human adjudication or a human approval.

The [post-review validation](phase_iii_j_post_review_validation.md) passed mechanical review consistency, class support, uniqueness, family-disjointness and implemented exact/lexical leakage checks. Those checks do not prove semantic independence or label correctness. In particular, development `ambiguous` has two reviewed cases, so its estimate will be noisy. The final holdout is AI-reviewed and remains sealed; no final predictions have been observed.

The user explicitly authorized continuing to package preparation with this limitation. This record documents a **deviation**, not a retroactive revision of the proposal or a claim that its human-review step passed. Any later model result, acceptance decision or publication must carry the limitation. Human adjudication, if required for stronger evidence, must be a separate future process that does not silently overwrite this frozen record or tune against final outcomes.
