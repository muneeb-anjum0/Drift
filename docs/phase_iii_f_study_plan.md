# Phase III-F retrieval architecture study: preregistration

Status: development research only. Phase III-D and III-E independent cases are closed. Do not inspect case-level results or use them as tuning data. No R7 exists at the start of this study.

## Task and controls

Given one change message and the requirements of its authorized, immutable project baseline, rank zero or more materially affected requirements. Candidate generation, ranking, thresholding, selection budget and downstream six-class classification are separate stages. The fixed Go service currently scores each nonempty requirement, selects up to three at score >=0.25 subject to its specific-match gate, and calls the CPU classifier once per selected requirement. R0 and R5 remain byte-identical controls; R6-S1-t0.45 remains the frozen offline CPU semantic control. P1, PP1 and the GGUF are untouched. Research methods do not change product behavior.

Use the three open development corpora, plus a deterministic *derived* scaling corpus built from their requirements and a small explicit synthetic query panel. This is not an independent generalisation test. Preserve all original source identities and benchmark SHA-256. Closed-data comparison is limited to aggregate contamination counts computed without exposing case records.

## Predeclared experiments

| ID | Hypothesis | Changed variable | Dataset | Metrics and decision rule |
| --- | --- | --- | --- | --- |
| F-CEIL-1 | Top three may truncate useful ranks | candidate budget 1,2,3,5,8,10,16,32,50,75,100; no score threshold | open development + scaling | Recall@k, full-query reach, ranks, false exposures, calls; cap is a major bottleneck only if top-5 materially recovers misses at tolerable cost |
| F-SCALE-1 | More same-domain/adjacent distractors harm rank and zero-target selection | nested project size 5,8,10,16,20,32,50,75,100; fixed queries | derived scaling only | per-size target ranks/recall@k, thresholded hits, false exposure, MRR; report cross-domain dilution separately |
| F-BM25-1 | IDF and length normalization improve rank at scale | simple lexical BM25 versus frozen R5 | development only | compare Recall@k and exposure at a *predeclared* coarse threshold; accept only if coherent across sizes without material false exposure |
| F-SEM-1 | Small semantic embeddings improve low-overlap rank | frozen R6-S1 whole-query cosine versus R5 | development only | rank ceilings and thresholded exposure; no new model or tuned threshold |
| F-HYB-1 | Lexical and semantic errors may complement | fixed blends 0.25/0.50/0.75 lexical weight | development only | compare rank ceilings and exposure at fixed coarse thresholds; accept only a stable benefit, not a one-link gain |
| F-2STAGE-1 | Cheap BM25 prefilter may lower semantic cost | BM25 first-stage budgets 5,10,20 then semantic rerank | development only | target recall, full reach, embedding count, exposure, latency estimate; reject if recall/cost dominated |
| F-DECOMP-1 | Explicit clauses may recover multiple intents | whole query versus existing deterministic clause split | development only | multi-target hits and zero-target false exposure; reject if benefit unstable or false exposure rises disproportionately |
| F-REPR-1 | Title and description carry different evidence | BM25 title+description versus description-only and title-only | development only | rank ceilings and category/size effects; no production field invented |

Ranking is measured before any threshold. For each architecture report target-link recall, all-target query reach, ranks, MRR, candidate count, selected calls and false exposures (absolute, per query, per selected). A threshold-free top-k cost curve represents an *oracle candidate budget*, not safe selection. The 90%/85% gates are not changed. A candidate is not named R7 unless development evidence shows a substantial, stable, cross-size recall gain at a defensible inference cost and without unacceptable zero-target exposure. One- or two-link gains on small synthetic sets are insufficient. If no architecture clears that bar, stop without a new holdout, classifier inference, or training.

The 90% gate appears in `docs/model-acceptance-criteria.md` as a protective target because missed requirements cannot be classified. No product loss model or CPU cost derivation is documented there; classify its quantitative level from evidence, not retrospective candidate performance.
