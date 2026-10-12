# Analysis persistence integrity

`POST /api/v1/drift/analyze` produces a proposed, advisory interpretation. It does not approve a change. `POST /api/v1/drift/save` accepts only `{ "previewId": "<64 lowercase hex characters>" }`; the browser cannot repost the analysis body or choose its provenance. Human decisions and editable change-request drafts are separate from the saved machine analysis.

## Trust boundary and field ownership

| Persisted `DriftAnalysis` fields | Authority |
| --- | --- |
| `_id`, `project`, `workspace`, `baselineVersion`, `baselineVersionNumber`, `createdBy`, `createdAt`, `updatedAt`, `status` | Server identity, authorization, and analyzed immutable baseline |
| `inputText`, `inputType` | Client input at *analyze* time, bound to the server-side preview; never accepted at save |
| `detectedChanges`, `requirementResults` | Provider prediction and Drift normalization/retrieval at analyze time; no browser edits at save |
| `driftScore`, `riskLevel`, `summary`, class counts, `estimatedExtraHours` | Drift-derived from the analyzed result |
| `analysisEngine`, `provenanceVersion` | Server-side execution provenance; no browser authority |
| Human annotations/decisions | Not part of `DriftAnalysis`; separate change-request and decision workflow |

Previously an authenticated writer could call `/drift/save` without first analyzing, submit fabricated `detectedChanges`/`requirementResults`, choose `analysisEngine`, or substitute input and baseline claims. `CleanAnalysis` recalculated some derived fields but did not establish origin. Project authorization still applied, but it did not authenticate the model output. Historical records lack `provenanceVersion` and must not be treated as certified provider output. New records carry `server_bound_v1`; this is a binding to backend execution, not a claim that the model is correct.

## Selected mechanism

A Mongo `analysispreviews` record is created only after successful analysis. Its cryptographically random 256-bit ID is opaque to the UI. It binds the analyzing user, authorized workspace/project, immutable baseline ID and number, exact input (including a SHA-256 check), executed provider type, timestamps, and the complete normalized result. It contains no provider credential, authorization header, or encrypted API key. The TTL index removes abandoned records after ten minutes; save also checks expiry itself. Save rechecks project write permission and baseline ownership, then conditionally consumes the record with an atomic delete. Replay and cross-user use fail without revealing another tenant's preview. If persistence after consumption fails, the caller must analyze again; the service never persists a caller-supplied fallback. Activity is logged only after the analysis insert succeeds.

The record retains the provider that actually ran even if workspace settings change before save. If retrieval selected no requirement and no provider prediction ran, `analysisEngine` is `rule_based`; it is not misattributed to a configured provider. A new scope snapshot does not retarget an existing preview. Revoking project write permission before save prevents consumption. Expired previews require the user to compare again. Provider failure produces no preview and no saved analysis.

Server-side ephemeral state was selected over analyze-and-save (a second provider call could cost money and change the answer) and a signed client-held preview (canonicalization, key rotation, and one-time replay protection add complexity). Mongo is already a required dependency; no Redis or new signing secret is introduced. The short-lived state is intentionally lost if Mongo is reset. Concurrent saves of one ID have at most one winner.

Change-request generation reads a persisted `DriftAnalysis`, never a browser preview. A draft is human editable, but its `generatedBy` value is derived again from the stored analysis when saved, so a browser edit cannot relabel provider provenance. Neither this mechanism nor that field constitutes formal human approval.
