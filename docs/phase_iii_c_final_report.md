# Phase III-C Final Report

Status: **R5 selected on development; integrated V2 INCONCLUSIVE; retraining NOT YET JUSTIFIED.** Date: 2026-10-01.

1. **Starting state.** Phase III-C started from immutable rejected-V1 closeout `6b13d4856141dc6a05dd214e69b2f71ca7ca9294`; main/origin-main were `64aa7c0b2fee70e1c5132b9eeebed3d98d8f5ce6`.
2. **Branch.** `phase-3/retrieval-dataset-v1`, derived as P1 + PP1 + exact V0 retrieval; rejected Phase III-B R1 remains reachable and unchanged.
3. **V0 retrieval baseline.** Threshold 0.25, stable top-k 3, lexical/title/domain scorer, specific-match gate, and `and` retained as evidence.
4. **V1 regression.** Phase III-B R1 removed `and`; it improved development but reduced closed-final all-expected reach from 5/12 to 4/12 and was excluded.
5. **Retrieval architecture.** Authorized project → project-scoped immutable version → all non-empty snapshot candidates → title+description scoring → threshold/specific gate → stable top-k → sequential per-requirement inference. See `phase_iii_c_retrieval_architecture.md`.
6. **Trace methodology.** Evaluation calls the production scorer and records tokens, domains, components, bonus, threshold, gate, rank, selection decision, and raw counts.
7. **Failure taxonomy.** Candidate generation, normalization/representation, threshold, specific gate, rank competition/top-k, and downstream model stages are distinct.
8. **Per-case analysis.** R0's 11 missed links across eight queries are in `R0_error_ledger.json`: eight threshold, two specific-gate, and one top-k failure.
9. **Dataset inventory.** Two contaminated historical regressions, raw dev 48, retrieval dev v1 24, expanded retrieval dev v2 60, oracle 28, closed raw final 24, and closed retrieval final 12.
10. **Contamination map.** Historical cases recur in code/tests/UI/rules; exact dev/final pair/query overlap is zero; semantic and original-training overlap remain unknown.
11. **Lineage.** Retrieval v2 is v1 plus 36 frozen additions; hashes, parentage, roles, and restrictions are in its manifest and dataset-foundation document.
12. **Label ontology.** Six mutually exclusive downstream labels remain P1's unchanged/added/removed/modified/contradiction/ambiguous definitions.
13. **Label audit.** Raw dev is class-balanced. Retrieval additions are single-author and pending independent review; zero- and multi-target cases carry the highest adjudication risk.
14. **Development construction.** V2 has 60 queries: six zero-target, 38 one-target, 13 two-target, and three with at least three targets across 8/12/20-requirement projects.
15. **Experiments.** R0 baseline; R1 suffixes; R2 k=5; R3 threshold 0.20; R4 no specific gate; R5 aliases. Each changed one major retrieval variable relative to its parent.
16. **Rejected experiments.** R2 added two hits but eight false exposures; R3 two hits but twenty false exposures; R4 three hits but twenty-six false exposures versus R1.
17. **Accepted retrieval experiment.** R5 is the strongest development candidate: R1 plus 13 general business-domain alias entries at threshold 0.25, gate enabled, k=3.
18. **Recall@k.** R0 v2 macro Recall@1/3 was 0.614/0.776; R5 was 0.679/0.860.
19. **Precision@k.** R0 macro Precision@1/3 was 0.667/0.311; R5 was 0.733/0.344. Precision@3 includes fixed three-item ranking, not only selected eligible candidates.
20. **MRR.** R0 was 0.821; R5 was 0.872 on positive development queries.
21. **All-expected reach.** R0 34/54 (63.0%); R5 42/54 (77.8%).
22. **At-least-one reach.** R0 39/54 (72.2%); R5 47/54 (87.0%).
23. **Oracle retrieval.** Label-forced retrieval is 74/74 by construction and only establishes an upper-bound path. Existing Phase III-B V0 downstream oracle classification was 19/28, not production performance.
24. **Downstream raw-model impact.** Not run: the user prohibited local model execution. No claim is made about R5's downstream label accuracy.
25. **P1 interaction.** P1 source is byte-unchanged from Phase III-B; R5+P1 execution is unverified under the same user constraint.
26. **PP1 interaction.** PP1 source is byte-unchanged. A caught coupling was fixed so suffix normalization is retrieval-only; a regression test locks PP1's old normalizer.
27. **V2 integrated candidate.** Proposed composition is fixed Q4 artifact + R5 + P1 + PP1. It was not executed or promoted.
28. **V0/V1/V2 comparison.** V0 is accepted historical baseline; V1 is rejected by closed-final retrieval; proposed V2/R5 improves development but lacks independent final and downstream evidence.
29. **Acceptance gate.** Failed: R5 micro input recall is 59/74 (79.7%) and small/medium/large is 68.0%/92.0%/79.2%, below 90% overall and 85% each size.
30. **V2 decision.** `INCONCLUSIVE`, therefore not accepted and not tagged as a release.
31. **Remaining retrieval failures.** Fifteen expected links remain missed: eight below threshold, four at the specific gate, and three excluded by top-k.
32. **Remaining model failures.** Phase III-B still shows modified overprediction, removed/ambiguous weakness, high-confidence errors, and prompt-injection weakness; R5 did not remeasure them.
33. **Training-data readiness.** Not ready: original examples/splits are missing; no reviewed training corpus, annotator agreement, dedup record, or new independent test exists.
34. **Retraining gate.** `NOT YET JUSTIFIED`.
35. **Retraining rationale.** Current dominant failures remain deterministic retrieval; prompting improved the fixed artifact materially; training cannot repair candidate selection; clean data and independent measurement are absent.
36. **Remaining contamination.** Historical benchmarks and canonical rules are contaminated; development and final share broad semantic domains; adapter-training overlap is unknowable.
37. **Unverified claims.** Real-production relevance distribution, semantic duplicate rate, inactive-status semantics, R5 generalization, R5 downstream accuracy/latency, and retraining benefit.
38. **CPU/resources.** Retrieval evaluation and all software tests were CPU-only. No local model request, artifact load, training, or cloud action occurred; five existing containers remained healthy.
39. **Security.** Mongo-backed tests verify write authorization, own-baseline success, and cross-tenant baseline selection denial (404). The version query includes both version and project identifiers.
40. **Software verification.** Full Go tests/integration/vet/gofmt, 9 Python tests, Ruff, Python compile, frontend lint/build, Compose CPU/GPU config, npm audit, pip-audit, and govulncheck passed. One known Starlette deprecation warning remains.
41. **Git status.** Closeout requires a clean worktree; no push, PR, merge, tag, or release is authorized by this directive.
42. **Final commit.** The self-referential closeout SHA is reported in the handoff; evidence milestones include R0/data `d07fbb1`, R1 `bb75050`, R5 `14b25ac`, isolation fix `01cb6fc`, and security/determinism tests `506a122`.
43. **Recommended next phase.** Independently review v2 labels, define inactive baseline semantics, gather anonymized real retrieval misses, freeze a new multi-review final set, evaluate R5 once, and reconsider training only after retrieval and data gates pass.

No training proposal is issued because the retraining gate is not met.
