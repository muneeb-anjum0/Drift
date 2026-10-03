# Phase III-B Final Report

Status: **REJECT integrated V1 candidate; preserve isolated P1 and PP1 evidence.** Date: 2026-10-01.

## 1. Baseline commit

**VERIFIED:** evidence-complete V0 is commit `66bb5fe7a0c98c20a40b3dd19113a641f5b71b7f`. The evaluated artifact was originally established at `5421d1f383796b1ec0e271586711e637a9ed0347`.

## 2. Baseline tag

**VERIFIED:** annotated tag `phase-3-model-baseline-v0` peels to artifact commit `5421d1f`, not evidence-complete commit `66bb5fe`. It was not moved or replaced.

## 3. Experiment branch

**VERIFIED:** `phase-3/model-improvement-v1`, created from exact `66bb5fe`. No Phase III-B commit was pushed, merged, released, or applied to `main`.

## 4. Dataset structure

**VERIFIED:** development consists of balanced `drift-raw-dev` (48 cases), `drift-retrieval-dev` (24 queries), and an oracle expansion (28 expected requirement/classification pairs). Final evidence uses `drift-raw-final` (24 balanced cases; SHA256 `5da735...1253`) and `drift-retrieval-final` (12 queries; SHA256 `3f2b2e...5902`). The final sets were frozen before experiments and are now closed to tuning.

## 5. Contamination findings

**VERIFIED:** historical repository cases recur in source, tests, UI/demo content, and canonical rules and are regression-only. Development and final corpora were prospective for Phase III-B. **UNVERIFIED:** independence from original adapter training, because the training corpus and split were not recovered. Final corpora are synthetic and single-author, not independently reviewed.

## 6. V0 metrics

**VERIFIED on development:** raw 32/48, accuracy 66.7%, macro F1 0.669, 48/48 contract parsing, 52.1% strict JSON, p95 15.90s, 4.92 generated tokens/s. Retrieval all-expected reach/model-input recall was 16/24 (66.7%), Recall@1 68.8%, Recall@3 81.3%, MRR 0.837, and 1.125 calls/query. Postprocessing changed three labels, fixed one, broke two, and contributed -1 correct case.

## 7. Raw model error taxonomy

**VERIFIED:** all 16 V0 raw errors were ledgered. The dominant failure was taxonomy-boundary confusion with `modified` overprediction: additions, partial removals, contradictions, and ambiguous language were treated as modifications. Other categories include negation/invariants, prompt injection, unresolved intent, and one label requiring multi-review. Contract normalization caused no failures.

## 8. Retrieval failure taxonomy

**VERIFIED:** eight development queries missed expected requirements. Causes were lexical/synonym gaps, the specific-match gate, multi-requirement selection, and ranking/common-token noise. Retrieval failure was separated from classifier failure; model errors were not attributed to missing requirements.

## 9. Retrieval metrics

**VERIFIED:** V0 development metrics are above. R1 reached all expected requirements for 17/24, model-input recall 70.8%, Recall@1 72.9%, Recall@3 85.4%, MRR 0.862, 1.167 calls/query, and unchanged false exposure of 10. R2 reached 24/24 but required 1.583 calls/query and missed its frozen `<1.5` gate. Final retrieval was V0 5/12 all-expected and 45.8% model-input recall versus V1/R1 4/12 and 37.5%.

## 10. Oracle retrieval result

**VERIFIED:** bypassing retrieval, V0 classified 19/28 expected pairs correctly (67.9%; weighted F1 0.667), with 28/28 parsing, 11.84s mean, 14.25s p95, and 5.19 tokens/s. Six of thirteen additions still became modifications, proving retrieval was not the sole cause.

## 11. Postprocessing ablation

**VERIFIED:** V0 development full postprocessing was 31/48 versus raw 32/48. The `sms_otp` rule accidentally fixed `add_security_01` through `otp` inside `TOTP`, but broke `rem_security_01`; `interactive_reports` broke `amb_analytics_01` through the broad term `filters`. PP1 removed canonical semantic-label overrides while retaining enrichment. It produced 32/48 on V0 replay and 36/48 on P1 replay with zero changed labels or introduced errors. Both final V0 and V1 postprocessing runs changed zero labels.

## 12. Prompt experiments

**VERIFIED:** P1 was the isolated prompt experiment. Development raw accuracy improved from 32/48 to 36/48, macro F1 from 0.669 to 0.756, and strict JSON from 52.1% to 100%; parse rate stayed 100% and p95 rose only 3.4%. No class recall regressed. P1 passed every predeclared development gate.

## 13. Retrieval experiments

**VERIFIED:** D1 showed top-k 3→5 did not solve gating and increased exposure. R1's conjunction normalization passed its gate. R2's evidence-backed vocabulary strongly improved recall but was inconclusive on cost. R3 top-k 2 lost a real multi-requirement candidate. R4 generic actor/container stopwords lowered cost but lost four genuine requirements and was reverted.

## 14. Model experiments

**VERIFIED:** none. Artifact, adapter, quantization, llama build, decoding, CPU-only mode, and context remained unchanged. Retraining was not justified: prompt specification improved the same artifact materially, while the integrated failure was deterministic retrieval generalization. **UNVERIFIED:** whether a new fine-tune would improve taxonomy boundaries without regressions.

## 15. Rejected experiments

**VERIFIED:** D1, R3, and R4 were rejected. The integrated V1 candidate was rejected at final evaluation. R2 remained inconclusive rather than being relabeled after seeing results.

## 16. Accepted experiments

**VERIFIED on development:** R1, P1, and PP1 passed their isolated frozen gates. Final evidence supports P1 and PP1 individually. R1 failed the integrated final retrieval non-regression gate and must not be promoted on this cycle's evidence.

## 17. Final candidate configuration

**VERIFIED:** `V1-candidate` combined unchanged Q4 artifact SHA256 `11e2ca...19ac9`, R1 retrieval, P1 prompt, and PP1 postprocessing. R2/R3/R4 were excluded. The candidate was frozen before final inspection. The experiment branch contains this rejected configuration for reproducibility; it is not a promoted production version.

## 18. Final candidate metrics

**VERIFIED on final data:** raw 19/24, accuracy 79.2%, macro F1 0.786, strict JSON 100%, contract parsing 100%, p95 13.60s, 5.55 tokens/s. Per-class recall was added 100%, modified 75%, removed 100%, contradiction 75%, ambiguous 50%, unchanged 75%. Retrieval reached all expected requirements for 4/12, model-input recall 37.5%, Recall@1 54.2%, Recall@3 91.7%, MRR 0.736, 0.583 calls/query, and two false exposures. PP1 changed zero final labels.

## 19. V0 vs candidate comparison

**VERIFIED:** final raw V0→V1 was 17/24→19/24 and macro F1 0.691→0.786. P1 fixed four errors, introduced two regressions, and changed one wrong answer to another wrong answer. Final retrieval V0→V1 regressed all-expected reach 5/12→4/12 and model-input recall 45.8%→37.5%, although Recall@1, MRR, and call cost improved. The frozen acceptance rule required no all-expected-reach regression; overall decision is **REJECT**. Full matrices and hashes are in [final_V1_comparison.json](../evaluation/reports/final_V1_comparison.json).

## 20. CPU latency/resource comparison

**VERIFIED on this host:** final raw V0 mean/p95 was 10.62s/13.62s at 5.77 tokens/s; V1 was 11.88s/13.60s at 5.55 tokens/s. V1's maximum 21.94s includes its first-request warm-up. Execution remained one llama slot, six CPU threads, GPU layers 0, context 768, and 120-token cap. After rebuild and evaluation, approximately 7.2 GiB memory remained available and zram use was 41 MiB. No GPU operation occurred.

## 21. Stability result

**VERIFIED for V0 only:** six representative cases were byte/label/confidence stable across three temperature-zero repetitions. **UNVERIFIED for V1:** no repeated-run stability study was performed; final-set reruns are prohibited.

## 22. Failure/recovery result

**VERIFIED for the unchanged serving boundary:** prior controlled llama outage produced explicit failure, no persisted analysis, and readiness recovery in 8.17s. Phase III-B did not alter that architecture. **INFERRED:** P1/PP1 should not change transport recovery. Candidate-specific outage repetition was not performed to avoid unnecessary workstation stress.

## 23. Remaining weaknesses

**VERIFIED:** retrieval generalization is the promotion blocker. P1 still misses modification, contradiction, ambiguity, and unchanged boundary cases. Ambiguous final recall is 50%. Confidence remains self-reported and uncalibrated as class probability. Sequential multi-requirement inference remains costly, and training provenance is absent.

## 24. Remaining unverified claims

**UNVERIFIED:** independent generalization beyond these synthetic sets; training-set independence; GPU behavior; higher-precision quality delta; multilingual quality; calibrated confidence; quantitative changed-elements accuracy; multi-review reasoning/hallucination quality; V1 repeated-run stability; and production reliability at scale. Drift must not be described as production-grade AI.

## 25. Files changed

**VERIFIED:** closeout changes 53 tracked files relative to `66bb5fe`: experiment plans/registry, frozen datasets/manifests, prompts/candidate, machine reports, error/rule ledgers, four evaluation tools, Go retrieval/postprocessing code and tests, inference prompt/runtime tests, and Phase III-B/model/evaluation documentation. No model binary was added; `Model/` and GGUF artifacts remain ignored.

## 26. Verification commands/results

**VERIFIED:** containerized `go test ./...` passed; `ruff check --exclude tools/model/vendor services/inference tools` passed; `pytest services/inference/test_app.py` passed 9/9 with one upstream deprecation warning; `npm run lint`, `npm run typecheck`, and `npm run build` passed; JSON parsing and `git diff --check` passed; production P1 rendering matched the accepted prompt byte-for-byte. Compose rebuilt successfully, and frontend, backend, inference, llama, and MongoDB were all healthy.

## 27. Git status

**VERIFIED before documentation closeout:** clean on `phase-3/model-improvement-v1` after decision commit. The final handoff must verify clean status again after committing this report. No remote mutation occurred.

## 28. Commit SHA

**VERIFIED:** final experimental evidence/decision commit is `07d530c0ca96be44672a9a75bdf1a0a64dc4d2b8`. Documentation closeout is the branch `HEAD` reported in the final handoff.

## 29. Recommended next phase

Do not promote or retune this V1. Preserve V0 and the negative final result. Start a new retrieval-focused cycle using development-only evidence, preferably with independently reviewed relevance labels and explicit multi-intent decomposition. Freeze a new independent final set before selecting another candidate. P1 and PP1 may be carried forward as prior evidence, but every new integrated candidate needs a new frozen acceptance decision. Stop before push, PR, merge, tag movement, or release.
