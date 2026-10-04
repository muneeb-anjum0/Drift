# Phase III-E development checkpoint

The frozen **R6-S1-t0.45** research candidate is a small, CPU-only sentence encoder, not a change to production retrieval. R0 and R5 are unchanged controls. The Phase III-D final set was not run or inspected case by case. New development data are synthetic and single-author; their labels are not independent ground truth.

| Development corpus | R0 hits / expected; false | R5 hits / expected; false | R6-S1 hits / expected; false |
| --- | --- | --- | --- |
| New small/medium/large, 30 queries | 28/40; 9 | 30/40; 12 | 30/40; 7 |
| Phase III-C v2, 60 queries | 48/74; 32 | 59/74; 37 | 61/74; 19 |

The new corpus has 8-, 16-, and 32-requirement projects. R6-S1 reaches 11/13 small, 10/14 medium, and 9/13 large links: the medium and large size gates fail. Its new-corpus hard-positive coverage is only 4/10. It exposes one of four zero-target hard negatives on the new corpus and two on the older corpus, whereas R5 exposes one and zero respectively. Thus lower total false exposure does not establish safe generalisation.

BM25 (R6-L1) placed 36/40 new-set links in its first three ranks, but the preregistered threshold grid found no useful recall/exposure point: at `.05`, 28/40 selected links came with 19 false exposures; at `.10`, only 12/40 were selected. Semantic-only R6-S1 at `.25` selected 36/40 with 46 false exposures; `.45` selected 30/40 with seven. The coarse hybrid R6-H1 grid found no point better on both recall and false exposure than the selected simpler semantic candidate across both development corpora. Clause-decomposition R6-Q2 at `.45` gained two new-corpus links over S1 (32/40) but added one false exposure; on the older corpus it lost one link and added four false exposures. These changes are small and unstable, so the simpler S1 candidate was frozen.

The [development comparisons](/home/muneebanjum/Documents/GitHub/Drift/evaluation/phase_iii_e/dev_comparison_v1.json) contain size/category raw counts and machine-readable error ledgers. Each candidate report contains ranked IDs, scores, threshold/cap decisions, misses, and false exposures. Candidate generation considers every scoped requirement; misses are ranking, threshold, or cap failures, not index omissions. The development overlap audit found no exact or token-Jaccard ≥0.8 query pairs against prior retrieval/raw development, historical finals, the closed Phase III-D set, prompt examples, or test literals. This automated lexical audit cannot rule out semantic/template overlap or unknown adapter-training overlap.

The pinned encoder is [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) at the revision recorded in the freeze manifest, with Apache-2.0 license, 384 dimensions, masked mean pooling, L2 normalization and cosine scoring. The 88 MB local cache is outside Git. Development evaluation forced CPU visibility and two PyTorch threads. The new-corpus cold run encoded 86 texts in 19.8 seconds and peaked near 824 MiB process RSS; this is an observational batch figure, not a production per-request latency guarantee. No 7B classifier, GPU, training, or model configuration change was used.

Next boundary: construct a novel small/medium/large independent draft, obtain a reviewer who did not design R6, freeze reviewed labels and hashes, then execute the blind R0/R5/R6 comparison once. The predeclared decision rule is in `r6_development_freeze_v1.json`. If independent review is unavailable, stop there. V3/model isolation and the retraining gate cannot be decided from these development results.
