# Phase III-C Retrieval Architecture

## Request and tenant boundary

`POST /api/drift/analyze` reaches `drift.Service.Analyze`. The service parses the project and baseline-version identifiers, requires `CapabilityWrite` on the project, and only then queries `requirementversions` using both `_id = baselineVersionID` and `project = projectID`. This double boundary prevents a caller from selecting another project's version by identifier. The authorized project's workspace is returned with the preview.

## Retrieval data flow

1. The chosen version's immutable `RequirementsSnapshot` is the only candidate source.
2. Every snapshot item whose description or fallback title is non-empty becomes a candidate. Current schema and code do not define an inactive/deleted filter.
3. The query representation is the complete client message.
4. Ranking representation is `title + description`; type, priority, status, source, acceptance criteria, tags, and effort are ignored.
5. Tokenization lowercases ASCII letters/digits, removes punctuation, singularizes `-ies` and some terminal `-s`, removes short/stop words, and expands a fixed synonym map.
6. Scoring combines direct overlap (0.55), title overlap (0.25), and domain overlap (0.35), with a 0.12 multi-term bonus below 0.45 and a cap at 1.0.
7. Eligibility requires score `>= threshold` and either two matched terms or title overlap `>= 0.5`.
8. Candidates are stable-sorted by descending score. Equal scores retain snapshot order.
9. Eligible candidates are selected until `max analyzed requirements` (currently three). Only selected requirements reach model inference.
10. The inference baseline is description alone, falling back to title. This differs deliberately from the ranking representation.
11. Predictions pass frozen P1 prompting and PP1 normalization/presentation before response construction.

## Configuration and ownership

| Concern | Current owner | Classification |
|---|---|---|
| Snapshot and project boundary | requirement service + Mongo query | security/baseline semantics |
| Tokenization, stop words, synonyms | `drift_service.go` | retrieval policy |
| Domain dictionary and weights | `drift_service.go` | retrieval policy |
| Threshold and maximum selected | inference client configuration | deploy-time retrieval policy |
| Stable tie order | snapshot order + stable sort | data/algorithm contract |
| P1 prompt | inference service prompt | model interaction, frozen |
| PP1 normalization | drift postprocessor | semantic/presentation policy, frozen |
| Offline metrics and traces | `cmd/eval-retrieval` | evaluation only |

The retrieval stop-word map is also consumed by PP1 change-group normalization. That coupling is a documented change hazard: a retrieval normalization experiment can unintentionally alter postprocessing. Any later change must split ownership first or verify both behaviors explicitly.

## Known semantic gaps

- There is no explicit active/deleted requirement field in `RequirementSnapshot`; `Status` exists but has no retrieval filtering contract.
- Query and baseline normalization are English-only and ASCII-only.
- Synonyms and domains are handwritten and incomplete.
- Stable source order is deterministic but can give arbitrary preference to tied requirements.
- Threshold and top-k are global rather than calibrated by project size or query intent.
- A high domain score can still fail the specific-match gate, while superficial shared words can produce false exposure.

## Trace contract

`TraceRequirementRelevance` calls the same pure path as production scoring and records normalized input/title/baseline tokens, domains, overlaps, component scores, bonus, threshold result, and specific-gate result. The evaluator adds rank and exactly one terminal decision: `SELECTED`, `BELOW_THRESHOLD`, `FAILED_SPECIFIC_MATCH_GATE`, or `TOP_K_EXCLUDED`. This trace is diagnostic only and is not added to the public API.
