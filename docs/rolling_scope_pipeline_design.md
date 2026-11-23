# AI-led rolling scope pipeline

**Status: implemented in the current working branch; model quality is not yet verified.** In a synthetic one-item local SmolLM3 check, a request for PDF export was matched to the existing CSV export requirement. The completed preview preserved the exact request and proposed wording that retains both formats. This verifies one path through the running stack; it does not establish accuracy across projects or larger scopes. Invalid model answers are rejected, with one bounded synthesis retry.

## Scope and authority

The first frozen requirement snapshot is the original agreement reference, O. A project also points to its current comparison revision, Cₙ. Saving an analysis or change-request draft does not change Cₙ. After a human approves a request, an owner/admin can explicitly include its reviewed wording. That creates immutable Cₙ₊₁ and advances the project pointer with a compare-and-swap check. A stale request cannot be included against a newer revision. The original O remains intact.

Drift accepts one client request per comparison. This keeps the source text and the eventual decision unambiguous. A message containing several distinct requests must be entered as separate comparisons. The UI shows the exact current revision and its active requirements.

## AI comparison

The selected workspace provider, local or online, receives each active requirement in six-item batches. It returns one relationship and cited text for **every** ID: covered, unrelated, modifies, removes, contradicts, or unclear. An unrelated pair does not establish novelty. A final model call reconciles the complete ledger and proposes zero or more changes, affected IDs, marginal drift from Cₙ, cumulative drift relative to O, risk, and either an effort range with assumptions or `not_estimable` with questions. Go does not assign semantic labels, fixed score weights, or fixed hour values on this product path.

The service validates the schema, exact request identity, active IDs, one pair per active requirement, text quotations, score bounds, and effort fields. It also rejects a final "added" proposal if the model's own pair ledger found an existing overlap. The model receives one bounded opportunity to reconsider an invalid synthesis. If the retry remains invalid, the job fails without a partial analysis. An expiring server-bound preview holds a successful result. Only its opaque preview ID can be used to save the analysis. Provider credentials are not stored in the job or preview.

The Mongo-backed job records progress after each batch and can resume its saved pairs after a worker interruption. A user can cancel; cancellation prevents the result from becoming a completed job. The browser polls the job and presents the model's evidence, uncertainty, scores, and effort status before saving. A model output never approves or publishes scope by itself.

## Human decision and next request

The saved analysis can seed an editable change request. The reviewer can edit the scope wording before submission. Approval and inclusion are separate actions. Inclusion accepts only supported added, modified, or removed changes with explicit wording. It is idempotent by change-request ID. The next request compares with every item in the newly published Cₙ₊₁. For example, a 20-item original scope becomes 21 after one approved addition, and the next full comparison checks all 21.

The AI result does not supply a price or business rationale. The draft asks a person to confirm those fields and preserves `not_estimable` instead of turning it into zero hours. It does not silently fall back to another provider if the selected provider fails.

## Operational limits and release evidence

The current API caps one comparison at 500 active items and 12,000 input characters. It shows the approximate number of model calls before starting. Long-running comparisons use a durable job instead of the old synchronous UI request. The original model's four-field and external label-only contracts remain in historical/evaluation code, but the new product comparison uses `scope-assessment-v1` for either provider.

Structural tests cover full 20- and 100-item ledgers, invalid/incomplete batches, preview binding, tenant access, and 20→21→22 publication. They do **not** prove that SmolLM3-3B or any BYOK model makes good semantic decisions. Before calling this production ready, run an independently reviewed set with duplicate, added, modified, removed, contradictory, ambiguous, and unchanged requests across 20/70/100-item scopes. Measure affected-ID accuracy, false additions, score agreement, effort calibration, runtime, context limits, and provider cost. In particular, the local 8 GB GPU setup has not yet been exercised end to end for 100-item synthesis. Until then, keep model outputs advisory and require human review.
