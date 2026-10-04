# PHASE III-E FINAL REPORT

Status: scientific evaluation complete; GitHub PR/CI/merge metadata will be reported after the protected-branch workflow completes. Date: 2026-10-04.

## Baseline and scope

**VERIFIED:** Work began from clean `main` / `origin/main` at `03e4b0a33e52f8061e19f73514664e61cc8a1f3c`, ahead/behind 0/0, on temporary branch `phase-3/retrieval-redesign-v1`. The five existing Compose services were healthy. The workstation had about 15 GiB RAM and 8 GiB swap; no GPU or 7B inference was used in this phase. Historical tags `phase-2.5-engineering-baseline` and `phase-3-model-baseline-v0` were not moved.

**VERIFIED:** R0 is the V0 Go scorer at `d07fbb1544a9f190b314d264bb9c9a787b27fbe3` (source SHA256 `05e47f0c936551682cf9e03d0d496c69147fedfa156f8e4c8b96fa8a305d43af`). R5 is the frozen production scorer at source SHA256 `04565fc32884031355c796a752c0b1691ff0dc4eb8c894f76d7ecb6e813b89ec`, selected at `14b25ac0d54a85c5c1002fc975d426309ab21e9b` and isolated at `01cb6fc958646e388d6cee2d5be55dbcce0b7042`. P1 prompt SHA256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`, PP1 source SHA256 `0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7`, and Q4_K_M GGUF SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` remained unchanged. The closed Phase III-D retrieval set SHA256 is `ee21e6d6bd2c36324c80e7020bd87d7c2094068d762d943ab7afe581e065e51b`; its R5 **GENERALISATION NOT SUPPORTED** conclusion was not revisited.

Only the older retrieval development corpora and newly authored Phase III-E development data guided R6. Historical benchmarks were regression context, not tuning targets. Phase III-B finals, Phase III-D protected data, the new Phase III-E final, and the unknown adapter-training corpus were prohibited design inputs. The original adapter TRAIN split is unrecovered, so overlap with it remains **UNKNOWN**. The Phase III-D case-level set and traces were not inspected for R6 design.

## Retrieval architecture and development

The Go backend first authorizes the actor and scopes candidates to the project's immutable baseline snapshot. Every non-empty title/description requirement is considered; status filtering for inactive/rejected historical requirements remains an unresolved product-semantic question, not a new Phase III-E rule. Retrieval ranks affected requirements and may select zero; the fixed classifier, if invoked, determines the six-class relationship. Retrieval must not classify drift, own authorization, change persistence, or invent requirements. R0/R5 use lowercase alphanumeric tokenization, stop-word removal, simple plural normalization, and lexical/title/domain overlap. R5 additionally handles limited suffixes and 13 aliases. Their score is `min(1, .55*description + .25*title + .35*domain + .12 conditional bonus)`, with a specific-match gate, score threshold `.25`, stable ties, and top three. These were unchanged. No vector database, new service, or production retrieval change was introduced.

The new [development corpus](../evaluation/phase_iii_e/retrieval_dev_v1.json), SHA256 `fed3b46b97f1a557daf17169fed7aba30d241541df3d9d41eba2e5709f4c34fa`, contains 30 synthetic single-author queries across three projects with 8/16/32 requirements. It has 4 zero-, 14 one-, 10 two-, and 2 three-target cases (40 target links). It tags hard positives/negatives, low overlap, implicit and informal language, competition, negation, partial changes, multi-target, questions, hypothetical/conditional requests, and long messages. No real-user provenance is claimed. The older Phase III-C v2 development set has 60 queries and 74 target links, SHA256 `a000bc087bf3d1455f98600a76648a078315e8d7a4377e1c32f8ed0185971ae9`. The lexical overlap audit found no exact or token-Jaccard ≥0.8 query pairs against older development, historical finals, closed Phase III-D, tests, or prompt examples; semantic/template overlap and adapter TRAIN overlap remain unverified.

Hypotheses were written before experiments. BM25 R6-L1 tested IDF/length-normalized lexical ranking and a fixed threshold grid; R6-S1 tested a pinned small semantic encoder; R6-H1 tested a coarse lexical/semantic blend; R6-Q2 tested transparent clause decomposition. One major mechanism was isolated at a time. The [preregistration](phase_iii_e_retrieval_plan.md), [machine registry](../evaluation/experiments/registry.json), traces, size/category slices, and error ledgers preserve negative outcomes.

| Candidate at reported development setting | New hits / 40; false exposures | Older hits / 74; false exposures | Decision |
| --- | ---: | ---: | --- |
| R0 | 28; 9 | 48; 32 | Frozen control |
| R5 | 30; 12 | 59; 37 | Frozen control |
| R6-L1 BM25, `.05` | 28; 19 | 59; 29 | Rejected: selection tradeoff |
| R6-S1 semantic, `.45` | 30; 7 | 61; 19 | Selected as research candidate |
| R6-Q2 decomposition, `.45` | 32; 8 | 60; 23 | Rejected: unstable across corpora |
| R6-H1 hybrid, highest-recall grid point | 37; 37 | 69; 94 | Rejected: broad exposure |

R6-S1 was selected for lower total false exposure and simpler maintenance than Q2/H1, not because it passed a gate. On the new development set it reached 11/13 small, 10/14 medium, and 9/13 large links, below the unchanged overall 90% and per-size 85% gates; hard-positive reach was only 4/10. BM25 ranking reached 36/40 at rank three but threshold calibration did not preserve that reach safely. R6-Q2 gained two new-set multi-target links but regressed older-set reach and exposure. Full Recall@1/@3/@k, precision, MRR, false exposures, candidate volume, category splits, and traces are in `evaluation/phase_iii_e/`.

The frozen R6 identity is **R6-S1-t0.45**, source SHA256 `2ac6ddc62f1b796896352bf2812b9cb1ee55b9c7f6cb8ff260b5f4aac4a67228`, with `sentence-transformers/all-MiniLM-L6-v2` at revision `c9745ed1d9f207416be6d2e6f8de32d1f16199bf` and local safetensors SHA256 `53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db`. The model is Apache-2.0, 384 dimensions, masked-mean pooled and L2-normalized. Query is the whole message; requirement text is `title + ". " + description`; cosine ≥`.45` with stable baseline-order ties and cap three selects candidates, including valid empty output. No hidden classification rules, GPU, or 7B query rewriting. The 88 MB weights cache is outside Git. The development freeze is commit `f344adc` and [manifest](../evaluation/phase_iii_e/r6_development_freeze_v1.json). R6 is offline research tooling, not an integrated Go production retriever.

## Independent review, freeze, and blind result

The new [review draft](../evaluation/phase_iii_e/retrieval_independent_draft_v1.json) was created after the R6 development freeze. It has 30 queries in bicycle-share (8 requirements), museum collections (16), and university research (32), distinct from the development domains. The reviewer identifier supplied externally is `independent-reviewer-gpt-5.6-sol`, dated 2026-10-04. The review produced **24 CONFIRMED, 6 REVISED, 0 AMBIGUOUS, 0 EXCLUDED**. Proposed and reviewed IDs are preserved together; the four-target `mc-q10` label was retained despite a top-three cap. The record's provenance does not machine-prove reviewer independence or human identity. The review attachment and repository JSON differ only by a final newline.

**VERIFIED:** The [reviewed dataset](../evaluation/phase_iii_e/retrieval_independent_v1.json), SHA256 `78a8975d35a3fccd931820752304b9d344415f3e841db18db7e549321ff4134c`, was frozen and committed at `0be89b6` before predictions. It has 56 requirements, 30 queries, 26 positive queries, 4 zero-target queries, and 36 reviewed target links. The reviewed distribution is 4/18/7/0/1 cases with 0/1/2/3/4 targets. The draft overlap audit found zero exact or token-Jaccard ≥0.8 pairs against older/new development, historical finals, Phase III-D, tests, and prompt examples; lexical audit cannot exclude semantic duplication. The validator rejected an overwrite of the frozen output. The [freeze manifest](../evaluation/phase_iii_e/independent_freeze_v1.json) records all hashes and limitations.

The predeclared positive rule required valid prior review/freeze, ≥90% overall micro recall, ≥85% in **each** size, at least one more correct link than R5, no more total false exposures than R5, and no more zero-target hard-negative queries exposed than R5. Any valid blind result failing one or more conditions is **NOT SUPPORTED**. An invalid or unavailable reviewed/blind run would be **INCONCLUSIVE**. This rule was frozen before final predictions; no threshold, top-k, labels, or weights were changed afterward.

R0's historical evaluator did not accept CLI overrides for threshold/top-k. Its first invocation stopped before any report was written. A disposable detached R0 worktree received only six harness lines to accept `.25`/`3` override flags; the R0 scorer source stayed byte-identical. That worktree was removed after evaluation. R0, R5, and R6 then read the same frozen dataset SHA256. Each completed one prediction-producing run; R6 used the locked runner at commit `603a349`, the pinned cached encoder, CPU only, and no classifier.

| Blind retrieval result | R0 | R5 | R6 |
| --- | ---: | ---: | ---: |
| Correct links / 36 | 20 (55.6%) | 20 (55.6%) | 22 (61.1%) |
| All targets reached / 26 positive queries | 11 | 11 | 17 |
| At least one reached / 26 | 17 | 17 | 19 |
| Recall@1 links / 36 | 18 | 17 | 22 |
| Recall@3 links / 36 | 27 | 28 | 30 |
| Precision@1 across 30 queries | 18/30 | 17/30 | 22/30 |
| Precision@3 across 30 queries | 27/90 | 28/90 | 30/90 |
| MRR over 26 positive queries | .799 | .780 | .910 |
| False candidate exposures | 17 | 19 | 17 |
| Zero-target hard negatives exposed / 4 | 1 | 1 | 1 |
| Mean selected / query | 1.23 | 1.30 | 1.30 |
| Mean candidates / query | 18.67 | 18.67 | 18.67 |

Size split, shown as correct links / reviewed links and false exposures: small R0 6/10;2, R5 6/10;2, R6 9/10;6. Medium R0 8/14;6, R5 8/14;6, R6 7/14;7. Large R0 6/12;9, R5 6/12;11, R6 6/12;4. Thus R6's total two-link gain is concentrated in small projects while medium regresses and large does not improve. R6's lower aggregate false exposure hides a four-exposure increase in small projects relative to R5.

Selected category slices (categories overlap; denominators must not be summed): hard positives R0/R5 2/8 links, R6 3/8; hard negatives R0/R5 three false candidates across four queries, R6 one false candidate but one query exposed in all three; low overlap R0/R5 1/3 links, R6 1/3; multi-target R0/R5 11/22, R6 11/22 with R6 nine false exposures versus R5 seven; competing requirements all three 10/20; negation all three 5/7; partial modification R0/R5 5/7, R6 6/7. These raw counts and every other category are in [blind_analysis_v1.json](../evaluation/phase_iii_e/blind_analysis_v1.json). R6's 14 missed links comprise 13 below its fixed threshold and one excluded by top-three; candidate generation included all scoped requirements. R0/R5 each missed 16 links, 15 below threshold and one top-three excluded. No final-set tuning follows from these cases.

R6 minus R5 is +2 correct links, +6 fully reached positive queries, +2 at-least-one queries, -2 false exposures, equal hard-negative query contamination, and equal selected volume. R6 minus R0 is +2 links, +6 fully reached, +2 at-least-one, equal false exposures and hard-negative contamination, +0.07 mean selected requirements. An exploratory paired 10,000-resample query bootstrap gives a R6–R5 micro-recall difference interval of **-11.8 to +26.7 percentage points** and false-exposure difference interval of **-14 to +8 candidates**. The interval crosses zero and is not a production guarantee; this is a small synthetic sample with clustered links.

Go evaluation elapsed 5 ms (R0) and 7 ms (R5) for all 30 queries, in-process. R6's pinned CPU encoder took 5.04 s to load/encode 86 texts as one batch and 12.76 ms total for score/rank/select afterward. These are observational, non-comparable harness measurements, not a per-request production latency benchmark. Development peak process RSS for the encoder was about 0.8 GiB. Before final R6 execution the host showed 6.8 GiB available RAM and 5.7 GiB free swap, with all five pre-existing services healthy. No 7B model request was made.

## Decisions and engineering disposition

**VERIFIED: R6 GENERALISATION NOT SUPPORTED.** It misses the predeclared 90% overall gate (22/36, 61.1%) and the 85% medium/large gates (7/14 and 6/12, both 50%). Its modest effect over R5 is uncertain and not robust by size. R6 must not be promoted or integrated into the Go service from this evidence. The Phase III-E final set is now closed; a future candidate requires fresh development work and a new independent final, not post-hoc tuning on these case-level failures.

**VERIFIED: V3 NOT EXECUTED / INCONCLUSIVE.** The prerequisite of supported R6 retrieval was false. No oracle-retrieval, real R6→classifier, raw P1, PP1, or full end-to-end model evaluation was run. The retrieval gap is measured (14/36 links not delivered by R6); the classifier/model gap is **UNVERIFIED**, not zero. There is no residual model-failure taxonomy from this phase.

**VERIFIED: RETRAINING NOT YET JUSTIFIED.** Retrieval has not reliably delivered correct requirements, so model failures have not been separated from retrieval failures on this reviewed set. Original adapter training data, label provenance, privacy classification, independent training/validation split, future final test, compute plan, and rollback evidence are also missing. No training proposal, cloud upload, GPU use, weight change, prompt change, PP1 change, or Q4 configuration change was authorized or performed.

The next retrieval research direction is to investigate calibrated abstention and multi-intent candidate selection on **new development data**, particularly medium/large projects and competing requirements, while controlling false exposure and CPU per-request cost. This is an **INFERRED** research suggestion, not a validated R7 design. Product work would still need tenant-isolation, failure-mode, dependency/security, and production-latency evidence before any retrieval implementation.

## Software, security, and Git closure

Production Go/React/FastAPI source, authentication, tenancy, rate limits, persistence, inference API authentication, security headers, model configuration, R0/R5/P1/PP1, existing acceptance gates, and prior datasets/reports were not edited. Only new Phase III-E evaluation tools/data/reports and documentation/registry entries were added. No model binary was tracked. No check was weakened. Model-free local verification passed: `npm ci`, frontend lint/typecheck/build, `npm audit --audit-level=high` (zero vulnerabilities), Q4 configuration guard, seven Phase III-E unit tests, nine inference unit tests, Python compile/Ruff, `pip-audit` (none found), Go formatting/vet/test/build, live Mongo-backed integration, both Compose configurations, and `govulncheck` (zero called or imported-package vulnerabilities; one required-module advisory not reached by code). A common credential-pattern scan of the phase diff found no match, and no new tracked model-weight extension or file above 1.6 MB was found. These checks do not prove absence of every possible secret or vulnerability. Local ignored `tools/model/vendor/llama.cpp` creates Ruff noise absent from a clean checkout, so scoped tracked-code Ruff and clean GitHub CI remain authoritative.

The temporary branch will be pushed, reviewed in a PR, and merged only after `software`, `integration`, and `e2e` all pass. The PR number, exact CI conclusions, merge commit, final `main` SHA, branch cleanup, clean status, and unchanged tags will be included in the final response. No direct push to protected `main`, force push, release, or tag move is authorized.
