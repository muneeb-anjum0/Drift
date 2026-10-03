# PHASE III-D FINAL REPORT

Status: retrieval evaluation complete; R5 generalisation **NOT SUPPORTED**. V3 was **not run** because its predeclared R5 prerequisite failed. No training, GPU use, push, PR, merge, release, or R5 promotion occurred. The final local commit SHA and clean status are reported in the handoff; a commit cannot contain its own SHA.

## Frozen identities and review (items 1–13)

1. Starting branch/commit: `phase-3/retrieval-dataset-v1` at `1a3b1d4f4262472505b1e100684112f8c9226b31`; this turn began on `phase-3/generalisation-eval-v1` at `d1360b012bd3a70c378e43c2c5d1d893e6e4d5fc`.
2. Phase III-D branch: `phase-3/generalisation-eval-v1`. Reviewed data was locally committed at `198de5b53645b091a8079067d9c2b82d6dbc1aac` **before** R0/R5 predictions.
3. R0: Phase III-C V0 retrieval, source commit `d07fbb1544a9f190b314d264bb9c9a787b27fbe3`; threshold 0.25, specific gate, stable top 3.
4. R5: Phase III-C development-selected candidate `14b25ac0d54a85c5c1002fc975d426309ab21e9b` plus isolation fix `01cb6fc958646e388d6cee2d5be55dbcce0b7042`; scorer source SHA256 `04565fc32884031355c796a752c0b1691ff0dc4eb8c894f76d7ecb6e813b89ec`.
5. P1: frozen prompt manifest SHA256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`.
6. PP1: frozen postprocessor source SHA256 `0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7`.
7. Model: existing Q4_K_M GGUF, 4,683,074,112 bytes, SHA256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`; no local model execution in this phase.
8. Blueprint: [blueprint_v1.json](../evaluation/phase_iii_d/blueprint_v1.json), SHA256 `1f5dca9e49357f2c80109bfea8db4d2ce9ff13ebe8b59fdd78fd59da59bcda1e`; four new medium-sized project domains with hard negatives, low-overlap positives, competing and multi-target queries.
9. Dataset: four projects, 40 requirements, 40 queries, 42 expected links; target-count distribution is 8 zero, 24 one, 6 two, 2 three. Only medium project size is measured.
10. Provenance: text is model-generated synthetic. The user supplied a completed review attributed to `independent-reviewer-gpt-5.6-sol` dated `2026-10-04`; 35 cases CONFIRMED, five REVISED, none ambiguous or excluded. The identifier is preserved verbatim. The reviewer’s human identity or independence cannot be independently verified from this record; the freeze validator checks structure, not provenance.
11. Hashes: proposal `f1dccb3c5706671e4304eb46b38de19d0d2f9ae05600a05fb72adffba9f0715d`; review record `f2f7a7615d0d1557f9af9070a52dd410e7c34e1ae6a32119bdefa50310b04676`; frozen dataset `ee21e6d6bd2c36324c80e7020bd87d7c2094068d762d943ab7afe581e065e51b`; review trail `3eba565326ca20f85359f7fac3ec31f538676903c42387f30ac32f1ad5b198df`; gates `9a5be8452f2ab48403fc1a5415a4bc979f8763054d1f12e6bf336b57aa402aa0`. The trail retains both proposed and reviewed labels. A second freeze attempt correctly refused to overwrite the files.
12. Contamination: 40/40 queries passed exact and heuristic near-overlap checks against known JSON corpora, with zero invalid target IDs and zero within-set duplicate messages. Original LoRA training overlap remains unknown.
13. Ambiguity: zero cases marked AMBIGUOUS or EXCLUDE. The reviewer’s five REVISED decisions are preserved, including `eo-q02` where the target ID stays the same but exactly 48 hours changes the baseline boundary. No labels were moved to recover the proposed distribution.

## Independent retrieval result (items 14–22)

The complete immutable run artifacts are [R0.json](../evaluation/phase_iii_d/reports/independent_v1/R0.json), [R5.json](../evaluation/phase_iii_d/reports/independent_v1/R5.json), [comparison.json](../evaluation/phase_iii_d/reports/independent_v1/comparison.json), and [analysis.json](../evaluation/phase_iii_d/reports/independent_v1/analysis.json). Category rows overlap; they must not be added together.

| Measure | R0 | R5 |
|---|---:|---:|
| Expected links delivered / total | 25/42 (59.5%) | 25/42 (59.5%) |
| All targets reached / positive queries | 16/32 (50.0%) | 16/32 (50.0%) |
| At least one reached / positive queries | 19/32 (59.4%) | 19/32 (59.4%) |
| False requirement exposures | 8 | 9 |
| Mean selected requirements / query | 0.825 | 0.850 |
| Hard-negative queries with any selection | 0/8 | 0/8 |
| Mean candidate pool | 10 | 10 |

14. R0 metrics: table above; macro model-input recall 0.5573, Recall@1 0.6146, Recall@3 0.9010, MRR 0.8438. Ranked recall is not equivalent to delivered model-input recall.
15. R5 metrics: table above; the same macro recall, Recall@1/@3, and MRR. Neither the existing overall ≥0.90 nor medium-size ≥0.85 promotion threshold is met.
16. Category-level results (expected target hits R0→R5; false exposures R0→R5): low-overlap positive 3/8→3/8, 2→2; informal/implicit 1/4→1/4, 1→1; multi-target 16/22→16/22, 5→6; competing requirements 9/10→9/10, 4→4; long message 6/9→6/9, 1→2; negation/removal 2/4→2/4, 1→1; partial modification 3/4→3/4, 1→1; questions/hypotheticals 1/4→1/4, 0→0; paraphrase 1/2→1/2, 0→0; ambiguous-intent 0/1→0/1, 0→0; hard negative 0 expected, 0→0 false. Small category denominators preclude strong category claims.
17. False exposure: only `bm-q08` differs. Both runs select correct `bm-request` and `bm-charge`; R5 additionally selects non-target `bm-images`. False exposure rises by one with no true-hit gain. Building-maintenance false exposures rise 1→2; other domains are unchanged.
18. Hard negatives: all eight remain clean, with no selected requirement in either run.
19. Hard positives: low-overlap positives reach 3/8 expected links under each run; no improvement. The four informal/implicit cases reach 1/4 under each run.
20. Multi-target: 12 queries, 22 links; each run reaches 16 links, all targets for 7 queries, some but not all for 2, and none for 3. Extra false exposures rise 5→6.
21. Candidate volume: 10 requirements per query in both runs; mean selected rises 0.025. The fixed baseline pool is 10 in every project, so size-generalisation cannot be measured.
22. Decision: **R5 GENERALISATION NOT SUPPORTED**. The frozen primary condition requires improvements in both expected hits and all-target reach; each delta is zero. The precision-cost condition also fails because extra false exposures (+1) exceed extra correct exposures (0). Safety passes. Four project hit counts are unchanged: municipal 7/10, cold chain 7/12, building 8/11, events 3/9. Paired 10,000-query bootstrap 95% percentile intervals are [0, 0] for hit-rate and all-target-rate deltas, and [0, 0.075] for false exposures per query. These are descriptive intervals, not proof of equivalence. The single changed case is documented in `analysis.json`.

## V3 and retraining (items 23–45)

23. End-to-end dataset: none frozen. An independently reviewed six-label E2E set was not supplied or constructed after the retrieval gate failed.
24. V3 configuration: predeclared R5 + P1 + PP1 + fixed Q4 model, CPU only, as recorded in [gates_v1.json](../evaluation/phase_iii_d/gates_v1.json); not instantiated.
25. V3 raw-model metrics: not measured.
26. V3 full-system metrics: not measured.
27. V3 per-class metrics: not measured.
28. V3 confusion matrix: not measured.
29. P1 independent effect: not measured on a new reviewed E2E set; Phase III-B historical measurements remain separate.
30. PP1 independent effect: not measured on a new reviewed E2E set.
31. Oracle retrieval diagnostic: not run in III-D; no model inference was permitted by the failed prerequisite.
32. Real-versus-oracle gap: not measurable without new reviewed E2E labels and model predictions.
33. Remaining retrieval failures: R5 omits 17/42 expected links; 16/32 positive queries have incomplete target delivery. These are deterministic retrieval failures, not model errors.
34. Remaining true model failures: unknown on this set. Historical P1 raw-model misses cannot be attributed to this new set.
35. Failure taxonomy: one additional R5 false exposure (`bm-images` on `bm-q08`), 17 absent expected links common to R0/R5, and unmeasured downstream semantic outcomes. Do not conflate ranked-top-3 recall with actual model input.
36. CPU latency: no V3 inference measured. Retrieval evaluator reported 4 ms per full 40-case pass, an observational duration and not a controlled latency benchmark.
37. Resources: CPU-only retrieval run, no local model process or GPU workload started; existing application containers were not rebuilt.
38. Failure safety: V3 model-outage behavior not retested; earlier software checks remain historical evidence, not a V3 quality pass.
39. Security/isolation: scorer source, P1, PP1, model configuration, and closed datasets were not changed. This does not revalidate all runtime security paths. The run used a detached R0 worktree and current frozen R5 scorer.
40. V3 decision: **V3 INCONCLUSIVE / NOT EXECUTED**, because the `R5 GENERALISATION SUPPORTED` prerequisite is false. This is not a claim that V3 model quality failed.
41. Dataset training readiness: reviewed target links support retrieval testing only; no reviewed six-class training/evaluation corpus is established.
42. Training gaps: original adapter training data/splits and overlap are unknown; clean, sufficient training data and a fresh independent model measurement path are missing.
43. Retraining gate: **RETRAINING NOT YET JUSTIFIED**. Retrieval supplies only 25/42 target links; new true model failures after correct retrieval are unmeasured. See [retraining_gate.json](../evaluation/phase_iii_d/retraining_gate.json).
44. Training proposal: not applicable; the gate did not justify one. No training was run or authorized.
45. Unverified claims: reviewer independence/human identity, original training-set non-overlap, small/large-project retrieval, V3 raw/system quality, six-class generalisation, model-outage behavior in V3, and production promotion readiness.

## Engineering closure (items 46–50)

46. Standard verification: Go unit tests, formatting, vet, build, and live Mongo-backed integration passed in Go 1.26 Alpine containers. Python tests (9/9), Ruff, compile, frontend lint/typecheck/build, Q4 guard, and CPU/GPU Compose static validation passed. `pip-audit` and production-only `npm audit` found no known vulnerabilities. Full npm audit still reports five high development-dependency findings (`braces`, `chokidar`, `fast-glob`, `micromatch`, `tailwindcss`). The pre-evaluation Go vulnerability scan reported one reachable [GO-2026-6505](https://pkg.go.dev/vuln/GO-2026-6505) initialization trace in transitive OpenTelemetry SDK 1.44.0; dependencies were not changed during this protected evaluation. One upstream Starlette deprecation warning persists. These findings are not waived by the retrieval result.
47. Files changed in this continuation: review decisions, frozen dataset, review trail, contamination audit, R0/R5 reports and analysis, analysis script, retraining gate, this report, and additive model-card/evaluation-strategy notes. Frozen R0/R5/P1/PP1/configuration/acceptance gates/closed finals were not modified.
48. Git status: verified clean after the final local commit; see handoff for the exact observation.
49. Final commit SHA: supplied in the final handoff from `git rev-parse HEAD` after this document was committed.
50. Recommended next phase: do not promote or tune R5 against these protected cases. Design a new retrieval candidate using development data, then commission a fresh reviewed test with small/medium/large projects; only after a retrieval candidate passes its frozen gate should an independent reviewed E2E set and CPU-only V3 run be considered.

The independent set is protected evaluation evidence, not a development corpus. Its case-level results must not be used to patch R5 and rerun as if it were still a blind test.
