# PHASE III-I FINAL REPORT — oracle singleton semantic evaluation

Status: scientific evaluation complete; PR/CI/merge verification pending. Started from clean main at dd3bf755387f8dd40b02ae5df21c495ef1d1685c on branch phase-3/oracle-semantic-evaluation. Historical Phase III-D R5 generalisation remained NOT SUPPORTED; V3 remained NOT EXECUTED / INCONCLUSIVE; Phase III-H improved structured-output diagnostics but did not settle oracle semantic quality. No retrieval, R0/R5/R6/R7, batching, training, GPU, model change, prompt change, PP1 change, production activation, release, or tag move occurred.

## Scope, frozen identities, and review

The experiment supplied **one correct baseline requirement and one message directly** to the existing P1 singleton classifier, then scored the raw six-class label. Canonical labels: unchanged = no material change to the supplied requirement; added = a new capability/option/actor/channel/data item while baseline remains; removed = any explicit baseline capability/option/permission/scope item eliminated even if another remains; modified = surviving behavior with timing/value/format/access/rule changed; contradiction = incompatibility with an explicit must/must-not/only/never/required/optional/before/after invariant; ambiguous = insufficient, unresolved, hypothetical, or internally conflicting intent. The pre-prediction study plan also defines boundaries and the retraining rule. The 90-case diagnostic blueprint deliberately has 15 proposed cases per class across 49 domains; it does not estimate real-world prevalence.

Model: DriftLedger Qwen2.5-7B LoRA GGUF Q4_K_M, SHA-256 11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9. P1 SHA-256 902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339. Frozen PP1 Go source SHA-256 0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7. Existing llama.cpp image ghcr.io/ggml-org/llama.cpp:server-b11151, build b11151-bd4f514db, Q4_K Medium, context 768, one slot, six CPU threads, --n-gpu-layers 0, --device none, no device requests; container cap 7 GiB RAM / 8 GiB memory+swap. One existing model process, no new model instance. Calls used temperature 0, top-p 1, n_predict 120, the two existing chat stop strings, and runtime defaults top-k 20 and random/default seed. No claim of deterministic sampling is inferred from temperature alone.

The original AI-assisted proposals and blank template remain intact. The supplied named human record identifies Muneeb Anjum and was validated at **90 CONFIRMED, 0 REVISED, 0 AMBIGUOUS, 0 EXCLUDE**. The user explicitly self-attested that all cases were human-reviewed. This agent did not witness or independently verify the review process; the human decision vector is identical to an earlier GPT-5.6 Sol advisory review. That limitation is recorded, not hidden. No decision-set prediction existed when the reviewed corpus was validated, frozen, SHA-256 hashed, and committed at 0bebbcc793af721ffcee9f6493b12cb1ed5b83f5. Proposed and reviewed labels are both preserved in the immutable corpus; no label was changed after predictions. Review SHA-256: 5f757fe76797530aadd2237c50a4a98cc0c67840d1d43e8c9a27d7e587612f90. Frozen corpus SHA-256: **d0fae87de5a9413e3ffd61104e3ca4478c742399f9d49fb36be12231478a12b5**. Exclusive creation prevents accidental overwrite; the checksum sidecar is committed. No case was excluded from primary scoring.

## Provenance and contamination

The supplied, ignored/read-only V5 archive contains probable Qwen SFT train 8,327, validation 969, test 974, and full 10,270 rows. The 7,757-row CSV train has two exact normalized duplicate pairs; SFT train has zero. CSV train reuses baseline strings in 3,436 excess rows and message strings in 2,594; train/validation and train/test share 368 and 388 numeric-masked message template keys. Exact pair and ID overlap across supplied train versus validation/test are zero, but random-row/template leakage risk remains. The asserted legacy 1,858-row class distribution exists only in archive reports, not recovered raw rows, so it is **report-supported, not independently row-verified**. The archive's reported TF-IDF merged-test macro-F1 0.9969 (masked 0.9913) could not be reproduced with the shipped differently scoped script; the earlier approximately 0.987 figure remains unverified. High lexical scores on simulated data do not prove semantic robustness. Exact archive-to-adapter training-byte identity is unproven despite matching training script/configuration and 1,041-step checkpoint arithmetic. Historical training data classification: **REPAIRABLE, NOT READY FOR AUTOMATIC RETRAINING**.

Before prediction, the 90 decision pairs had zero exact normalized pair, exact baseline, exact message, numeric-mask message-template, or same-baseline Jaccard≥0.8 near matches against the supplied CSV/SFT train and SFT validation/test. P1 contains no few-shot examples. A post-prediction aggregate check found zero exact normalized pair overlap with the available 24-case Phase III-B raw final and zero exact description+message pair overlap among 400 Phase III-D and 560 Phase III-E possible retrieval pairs. No closed-final case content was emitted or used to tune cases, labels, P1, or PP1. These checks cannot exclude paraphrase/template matches in unavailable historical sources or prove adapter data identity; **do not read them as “no contamination.”**

## Primary raw result

The first raw P1 response per case was checkpointed once; no semantic retries, transport failures, or invalid JSON occurred. **90/90 structurally valid; 73/90 correct (81.11%)**. Macro precision **87.69%**, macro recall **81.11%**, macro F1 **80.89%**. The scorer counts invalid outputs as wrong if any occur. Prediction distribution: added 19, modified 26, removed 8, contradiction 15, ambiguous 14, unchanged 8. Calibration was **NOT MEASURED**: the model's self-reported confidence is not a validated probability.

| Reviewed class | Support | Correct | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| added | 15 | 13 | 68.42% | 86.67% | 76.47% |
| modified | 15 | 15 | 57.69% | 100% | 73.17% |
| removed | 15 | 8 | 100% | 53.33% | 69.57% |
| contradiction | 15 | 15 | 100% | 100% | 100% |
| ambiguous | 15 | 14 | 100% | 93.33% | 96.55% |
| unchanged | 15 | 8 | 100% | 53.33% | 69.57% |

Confusion matrix, reviewed rows and raw-predicted columns:

| Actual \ Predicted | added | modified | removed | contradiction | ambiguous | unchanged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| added | 13 | 2 | 0 | 0 | 0 | 0 |
| modified | 0 | 15 | 0 | 0 | 0 | 0 |
| removed | 0 | 7 | 8 | 0 | 0 | 0 |
| contradiction | 0 | 0 | 0 | 15 | 0 | 0 |
| ambiguous | 0 | 1 | 0 | 0 | 14 | 0 |
| unchanged | 6 | 1 | 0 | 0 | 0 | 8 |

All 17 incorrect cases have baseline, message, reviewed truth, raw prediction, model reasoning, categories, and domain in the error ledger. Main confusions: removed→modified 7; unchanged→added 6; added→modified 2; ambiguous→modified 1; unchanged→modified 1. Actual drift predicted unchanged: **0**; unchanged predicted as drift: **7**; contradiction missed/overpredicted: **0/0**; ambiguous overpredicted: **0**; added or removed collapsed into modified: **9**. Category slices: numeric 15/15, negation 5/7, role 7/7, temporal 19/21, conditional 6/7, scope 2/3, same-domain hard negatives 0/7. The two predesignated modified/ambiguous paired cases were 2/2; small slices are diagnostic, not population estimates.

The seven removal misses occur in vehicle inspection, subsidies, education, weather, charity, pharmacy, and university. Each message explicitly eliminates a named baseline item while another behavior survives; several model explanations recognize the removal yet output modified. This is a recurring P1 semantic-boundary failure, not a retrieval miss. Two additive items were also collapsed into modified. The single ambiguous miss involved unresolved grade visibility timing. **Caution:** all seven unchanged hard negatives are unrelated new-feature requests in the same domain; P1's added definition can also be read to cover a new capability while the baseline remains. Their frozen labels and primary score are retained, but those cases are label-sensitive and must not be used to create training labels without separate adjudication. The retraining decision below does not depend on counting them as clear failures.

## PP1, stability, and resources

The exact frozen Go prediction-to-change and PP1 functions were replayed on all recorded raw outputs. **0 FIXED, 0 WORSENED, 90 NEUTRAL; 0 semantic-label changes.** Raw+PP1 remains 73/90 and macro F1 80.89%. PP1 presentation/enrichment effects are not claimed as classifier gains. The hash-selected, committed 12-case subset repeated once per case after raw scoring: **12/12 labels matched**. Two selected errors (i-rem-01 and i-unc-11) persisted; no majority vote altered the primary score. This bounded sample does not establish stability of all 17 errors.

Primary calls took 1,055.453 seconds total, median 11.453 seconds, nearest-rank p95 13.641 seconds, max 21.23 seconds; 12 repeats added 134.892 seconds. Maximum prompt length was 302 tokens and maximum generated length 59, below the 568/120 guards. Minimum host MemAvailable before calls was 7,228,924 KiB and minimum SwapFree was 8,056,988 KiB, above the 4 GiB RAM stop threshold. The model was streamed for SHA-256 hashing rather than loaded into RAM. No GPU request/offload, training, cloud inference, or production Mongo write was used by the oracle run.

## Retraining gate and next work

**RETRAINING JUSTIFIED — proposal only.** This follows the pre-prediction rule, not an arbitrary accuracy cutoff: correct oracle requirement delivery, 90/90 structure, no known exact overlap in screened sources, a recurring explicit-removal semantic error across seven domains, zero PP1 label changes, and one repeated representative error all support a learnable model boundary. The V5 archive is repairable, not ready to train as-is. The user-attested human review process is not externally verified, the corpus is synthetic and small, the seven unchanged negatives are label-sensitive, and prompt-versus-weight contribution is not fully isolated. These limit confidence and must be carried into any later proposal/evaluation; they do not erase the clear removal pattern.

The [Phase III-J proposal](phase_iii_j_training_proposal.md) specifies grouped/deduplicated source splits, human-reviewed removal minimal pairs, a fresh independent final, fixed-base LoRA/QLoRA comparison, provenance, hardware profiling/approval, rollback, and release gates. It does **not** authorize training or GPU use. Phase III-I must not become training data. The historical 32/48 raw result and III-B 19/24 final are **NOT DIRECTLY COMPARABLE** to this balanced 90-case oracle corpus, so no longitudinal gain/loss is inferred. The oracle result is a diagnostic semantic ceiling under correct requirement delivery, not a measured full-product score or deployment SLA.

## Verification and publication status

Local verification passed: npm ci, npm audit --audit-level=high (0 vulnerabilities), frontend lint/typecheck/build, 32 Python tests at initial full pass (plus the new overlap test), repository-owned Ruff, Python compile, pip-audit (no known vulnerabilities), Q4 configuration guard, both Compose configurations, Go formatting/vet/tests/build in Go 1.26.6 CPU container, live Mongo integration, and govulncheck (0 called/imported-package vulnerabilities; one required-module advisory not reached by code). Go PP1 replay test passed. A final branch-diff secret/large-artifact audit and GitHub CI remain pending at this report revision. Model binaries and the user-supplied training archive are ignored and untracked. Existing historical tags remained at 80fe31bb5daccbd5f9cdc91a4df88b60b86d3070 and 8fb6e3e0e355f6feb607adc82a2fd53cbd958adc.

Current branch/commit, PR, exact GitHub software/integration/e2e conclusions, merge commit, post-merge Verify result, final main SHA, and branch cleanup will be recorded after publication. Until then main is unchanged at dd3bf755387f8dd40b02ae5df21c495ef1d1685c. No claim of CI success or merge is made here.
