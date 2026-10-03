# Phase III-C Dataset Foundation

## Inventory and lineage

| Dataset | Role | Size | Parent/source | Tuning status |
|---|---:|---:|---|---|
| historical Go-direct | contaminated regression | 10 | repository benchmark source | must not guide model claims |
| historical full-system | contaminated regression | 8 | verification script | must not guide model claims |
| drift-raw-dev 1.0.0 | raw-classification development | 48 | prospective synthetic | development only |
| drift-retrieval-dev 1.0.0 | retrieval development | 24 queries / 40 requirements | prospective synthetic | historical R0 comparison |
| drift-retrieval-dev 2.0.0 | expanded retrieval development | 60 queries / same 40 requirements | v1 plus 36 frozen additions | candidate selection |
| retrieval-oracle-dev 1.0.0 | downstream diagnostic | 28 pairs | expected v1 query/requirement pairs | diagnostic only |
| drift-raw-final 1.0.0 | closed final | 24 | frozen before Phase III-B | never tune again |
| drift-retrieval-final 1.0.0 | closed final | 12 queries | frozen before Phase III-B | never tune again |
| recovered LoRA training set | unknown | unknown | absent from repository/artifact metadata | cannot establish independence |

The expanded retrieval set contains 6 zero-target hard negatives, 38 one-target queries, 13 two-target queries, and 3 queries with at least three targets. Additions cover paraphrase, morphology, numeric policy changes, access constraints, channel changes, requirement competition, and false-positive pressure. All are synthetic and share the three v1 baselines, so they do not estimate production prevalence.

## Split and contamination policy

- `development` may drive diagnosis and candidate selection.
- `closed final` is historical evidence only after Phase III-B execution. Phase III-C does not inspect outcomes, change hypotheses from its cases, or rerun it.
- historical regression data is useful for compatibility but contaminated by source code, tests, UI/demo material, and postprocessing rules.
- no future evaluation can be proven independent of original fine-tuning because the LoRA training examples and split manifest were not recovered.
- a mechanically normalized exact-match audit found 0/48 duplicate raw baseline/message pairs across raw dev and closed raw final, and 0/60 exact retrieval query-message overlaps with the 12 closed retrieval-final queries. This does not rule out semantic overlap.

## Retrieval relevance labeling guide

A requirement is relevant when understanding the client message requires comparing it with that baseline requirement, including an addition to, modification of, removal of, contradiction with, or semantic restatement of its capability or constraint.

- Label every independently affected baseline requirement; do not pick only the most salient one.
- Use zero targets only when no baseline capability is materially implicated.
- A shared domain or generic actor is insufficient without a capability/constraint relationship.
- An implementation dependency is not relevant unless the message changes or relies on its stated requirement.
- For competing requirements, prefer explicit semantic scope over token overlap.
- Preserve uncertain cases for adjudication; do not silently force a label.

The 36 v2 additions have one author and therefore remain `pending_independent_review`. Multi-target and zero-target labels carry the most adjudication risk. The existing v1 labels were retained byte-for-byte for comparability.

## Drift label ontology

The downstream ontology is mutually exclusive per requirement pair:

- `unchanged`: semantic equivalence with no material behavior change.
- `added`: a new capability, option, actor, channel, or data item while the baseline remains.
- `removed`: an explicit baseline capability, option, permission, or scope item is eliminated.
- `modified`: existing behavior remains but timing, value, format, access, or rule changes.
- `contradiction`: requested behavior is incompatible with an explicit invariant such as must, never, only, required, or before/after.
- `ambiguous`: intent or constraints are unresolved, insufficient, hypothetical, or internally conflicting.

Known boundary risks are partial removal versus modification, invariant exception versus modification, unresolved request versus unchanged, and a new access path versus added/modified. Phase III-B already marked one ambiguous development label as needing multiple reviewers. Label confidence is provenance metadata, not model confidence.

## Training-readiness implications

The repository has balanced raw development labels but no recovered training examples, train/eval split, deduplication record, annotator agreement, or independent untouched post-Phase-III-C test. Retrieval v2 is an evaluation asset, not a training corpus. It contains no model response targets or reviewed reasoning. These facts prevent a defensible retraining launch.
