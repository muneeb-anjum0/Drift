# Phase III-I.5 final report — adversarial semantic stress test

Status: **diagnostic evaluation complete; no training or model promotion**. This report uses the preregistered [methodology](phase_iii_i_5_methodology.md), the human-reviewed frozen corpus, and first raw P1 responses. The accompanying JSON evidence under `evaluation/phase_iii_i_5/` contains the full case-level trace and exact machine-readable metrics. Percentages below are descriptive of this deliberately adversarial, correlated corpus, not production prevalence estimates.

## Provenance and frozen execution

The case author created 216 proposed Baseline + Message pairs before seeing predictions. The methodology was committed at `922ee58`; the review and scoring truth were committed at `cdd6d961601a73af36907aced7808b4843025165` before the first model call. The independent overlap screen found no exact match against the checked historical corpora or V5 archive and no cross-family near match. Its lexical and template checks cannot prove semantic independence. The author had limited exposure to a few proposed Phase III-I cases before authoring; the [deviation record](phase_iii_i_5_provenance_deviation.md) remains intact, and the human reviewer assessed this as `ACCEPTABLE_WITH_LIMITATION`, not perfect blindness.

Muneeb's human semantic review is **self-attested; the review process was not independently witnessed**. The primary JSON was cross-checked against the CSV and TXT records. Recomputed decisions: **214 CONFIRMED, 1 REVISED, 1 AMBIGUOUS, 0 EXCLUDE**. `s03-02` was revised from proposed `added` to reviewed `unchanged`. `s09-03` has no defensible unique canonical label from the supplied baseline and message; it remains in the frozen corpus and inference trace but is excluded from six-class accuracy, F1, and confusion counts. No label, tier, family, ontology, or acceptance rule was changed in response to a model output.

| Frozen item | SHA-256 |
| --- | --- |
| Proposed candidate | `5477c3a1444aec75b7054ee35e68bb97cdc9ed1369341b1d22f9a617c43704fe` |
| Primary human-review JSON | `4e1eef0b4ab81530099f56a698a1293eeb8c29d86238ae2e5931826a581e1cd4` |
| Reviewed scoring corpus | `54b56f0b2068e9c26f8a315bbd925649b9bcf25c2d4bc248cb5258419b73ec5b` |
| Methodology | `03a31dea34844392422451600917a3d7c145b19dd0576e0fa24d19eeaef9e9e3` |
| P1 prompt | `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339` |
| Frozen GGUF Q4_K_M model | `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` |
| Frozen PP1 Go source | `0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7` |

The [pre-inference manifest](../evaluation/phase_iii_i_5/pre_inference_manifest_v1.json) records the remaining source hashes, reviewed counts, eligibility, and request/runtime configuration. Inference reused the frozen Qwen2.5-7B LoRA llama.cpp `server-b11151` singleton P1 path: one CPU model process, six threads, one slot, context 768, zero GPU layers, no device, temperature 0, top-p 1, 120 output-token cap and frozen stop strings. Container memory cap was 7 GiB with an 8 GiB memory+swap cap. Each call was sequential and checkpointed. No weights were copied into Git, no GPU was used, and the host memory guard remained satisfied. The dataset had 215 scored cases across 48 domains, with reviewed class support added 38, ambiguous 23, contradiction 28, modified 46, removed 43, unchanged 37; tiers T1 34, T2 59, T3 62, T4 60. The single unscored ontology-gap case was also run, making 216 calls total.

## Primary raw P1 result

**161/215 correct (74.88% accuracy); macro precision 86.28%, macro recall 74.52%, macro F1 75.89%.** All 216/216 responses were valid JSON and schema-valid with a canonical label: zero parse failures, missing fields, invalid labels, or malformed outputs. The unscored case's output is a diagnostic observation, not a correct or incorrect classification. The full [raw metrics](../evaluation/phase_iii_i_5/raw_metrics_v1.json) and [error ledger](../evaluation/phase_iii_i_5/raw_error_ledger_v1.json) are retained.

| Reviewed class | Correct/support | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| added | 26/38 | 92.86% | 68.42% | 78.79% |
| modified | 44/46 | 48.89% | 95.65% | 64.71% |
| removed | 25/43 | 100.00% | 58.14% | 73.53% |
| contradiction | 10/28 | 90.91% | 35.71% | 51.28% |
| ambiguous | 23/23 | 95.83% | 100.00% | 97.87% |
| unchanged | 33/37 | 89.19% | 89.19% | 89.19% |

Confusion counts are rows = reviewed truth and columns = first raw prediction. There were no structurally invalid rows.

| Truth ↓ / prediction → | added | modified | removed | contradiction | ambiguous | unchanged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| added | 26 | 11 | 0 | 0 | 0 | 1 |
| modified | 0 | 44 | 0 | 0 | 0 | 2 |
| removed | 0 | **16** | 25 | 1 | 0 | 1 |
| contradiction | 2 | **15** | 0 | 10 | 1 | 0 |
| ambiguous | 0 | 0 | 0 | 0 | 23 | 0 |
| unchanged | 0 | 4 | 0 | 0 | 0 | 33 |

The converse **modified → removed count is 0/46**, while removed → modified is **16/43**. The model emitted `modified` 90 times, but only 44 were correct; it is a high-recall, low-precision default for several boundary classes.

## Difficulty, semantic slices, and robustness

T1: 27/34 (79.41%); T2: 46/59 (77.97%); T3: 44/62 (70.97%); T4: 44/60 (73.33%). Long cases were 6/12 (50.00%), medium 145/191 (75.92%), short 10/12 (83.33%). The [slice file](../evaluation/phase_iii_i_5/slice_metrics_v1.json) includes every domain, requirement structure, length bucket, and phenomenon tag with numerators, denominators, and error IDs. Salient overlapping tags: partial removal 25/41 (60.98%), lexical trap 22/34 (64.71%), negation 17/24 (70.83%), numeric 24/34 (70.59%), role 27/46 (58.70%), temporal 46/61 (75.41%), distractor 33/46 (71.74%), naturalistic 44/60 (73.33%), and matched modification control 33/34 (97.06%). Negative-invariant structures were 32/57 (56.14%). A tag's correlation with errors does not establish that the tag caused them; tiny slices such as `permission` 0/3 are not standalone generalisation evidence.

Of the preregistered relation families, **12/18 minimal pairs** had both contrastive members correct (first only 4, second only 1, neither 1). Invariant prediction agreement was **3/9 eligible paraphrase families**, with 6/18 member predictions flipping relative to the first; the tenth paraphrase family was ineligible because it contained the reviewer-ambiguous case. Distractor agreement was **15/20** (5/20 flips), and clause-order agreement **16/20** (4/20 flips). Overall eligible metamorphic consistency was **46/67**. Relation agreement is not necessarily correctness: only 2/9 paraphrase, 13/20 distractor, and 15/20 order families had all members correct. Details and eligibility reasons are in [robustness evidence](../evaluation/phase_iii_i_5/robustness_v1.json).

The separate replay through the unchanged Go PP1 functions changed **0/216 labels** and yielded **0 fixed, 0 worsened, 215 neutral scored cases**; raw and PP1 were both 161/215. This does not repair the semantic boundary errors. See [PP1 ablation](../evaluation/phase_iii_i_5/raw_vs_pp1_v1.json).

Self-reported confidence is not calibrated probability. Of 186 scored outputs reporting confidence ≥0.9, **48 were wrong** (138/186 correct, 74.19%); confidence 0.8–<0.9 was 2/7 correct, and 0.5–<0.8 was 21/22. The high-confidence group contains most errors, so confidence does not safely identify trustworthy decisions here. Measured per-call CPU model latency over 216 calls: mean **10.96 s**, median **10.70 s**, nearest-rank p95 **14.31 s**, maximum **16.41 s**, total **2,366.51 s**. Max observed prompt tokens were 357 and generated tokens 74, under the frozen limits. These are sequential local inference timings, not production end-to-end latency or hardware-normalized benchmarks. See [confidence and timing evidence](../evaluation/phase_iii_i_5/confidence_latency_v1.json).

## Failure taxonomy and historical comparison

All 54 raw errors are assigned a primary descriptive family in [error taxonomy](../evaluation/phase_iii_i_5/error_taxonomy_v1.json): contradiction missed **18/28** across 11 domains (15 mapped to modified); removal as modification **16/43** across 12 domains; addition-boundary error **12/38** across 9 domains (11 mapped to modified); unchanged-boundary error **4/37** across 4 domains; false contradiction **1**; other **3**. These are observed boundary failures, not proof of a unique causal mechanism. The partial-removal, lexical, role, numeric, temporal, negation, long-case, distractor, order, and paraphrase exposures are represented in the slices/relations above; several co-occur in the same errors and must not be added as disjoint counts. There were no structural generation failures. The reviewer-ambiguous `s09-03` is an ontology-gap diagnostic, **not** a model error. The 4/20 order and 5/20 distractor flips and 6/9 paraphrase non-unanimity show additional reliability limitations beyond isolated misclassifications.

The historical Phase III-I machine evidence reports **73/90 correct (81.11%), macro F1 80.89%, 90/90 structurally valid**, explicit removal → modified **7/15**, PP1 **0 label changes**, and preselected repeat-label agreement **12/12**. III-I.5 confirms that removal boundary errors recur (16/43), but changes the scope: contradiction misses (18/28) are at least as consequential here, and addition-to-modified is also recurrent (11/38). The two corpora differ in size, authoring, difficulty, and label/domain composition; the lower III-I.5 aggregate accuracy is **not** a controlled estimate of degradation. The 18 minimal-pair and 20 distractor/order families reduce effective independence below 215; the review is self-attested and the author-exposure limitation remains. Neither the old nor new evidence licenses a production promotion claim.

## Training-target matrix and Phase III-J implications

The matrix is **aggregate guidance only**; no individual protected case, close paraphrase, or evaluation template may enter future training or development data.

| Semantic boundary | Observed evidence / denominator | Severity and systematicity | III-J implication |
| --- | --- | --- | --- |
| Explicit/partial removal versus surviving-behavior modification | 16 removed → modified / 43 reviewed removed; partial-removal tag 16 errors / 41 cases; 12 error domains | High; recurs from III-I's 7/15 and spans domains/tiers | Retain as a primary target: learn elimination of a baseline option or scope while other behavior survives, without turning true modifications into removals. |
| Explicit invariant contradiction versus ordinary modification | 18 contradiction misses / 28; 15 → modified; 11 error domains; negative-invariant structure 25 errors / 57 | High; newly dominant on this stress corpus, cross-domain but case-family-correlated | Add as co-primary target: reason over `must`, `must not`, `only`, ordering, and permissions before choosing modified. |
| Addition versus modification | 12 errors / 38 added; 11 → modified; 9 error domains | Moderate-high; recurs beyond III-I's 2/15 but stress design may amplify | Include a bounded secondary target distinguishing a genuinely new capability from alteration of an existing one. |
| Paraphrase and nuisance robustness | 6/9 eligible paraphrase families non-unanimous; 5/20 distractor and 4/20 order families flip | Moderate; relation families are correlated and not causal attribution | Require independently written paraphrase/order/distractor robustness checks in development and unseen final evaluation; do not train from these held-out families. |
| Unchanged, ambiguity, and format preservation | 4 unchanged errors / 37; 0 ambiguous errors / 23; 0/216 structural invalid | Lower immediate retraining priority; current strengths still require regression protection | Preserve unchanged/ambiguous/JSON performance as hard regression controls; adjudicate ontology gaps rather than forcing labels. |

The [Phase III-J proposal](phase_iii_j_training_proposal.md) is revised only at this aggregate scope. Training is **not authorized or started**; future data must be independently created/reviewed, family-split, and evaluated on a genuinely unseen final holdout with predeclared acceptance criteria and a single defensible baseline. Phase III-D/E/I/I.5 remain closed and unusable for training, examples, or development tuning. Negative/failed experiments must be retained. An eventual improved model would still require separate retrieval/end-to-end and deployment decisions.

## Stability, limitations, and decision

The preselected [24-case stability subset](../evaluation/phase_iii_i_5/stability_selection_v1.json) was repeated exactly once per case after the primary run. Raw label agreement was **24/24**: 18 were correct in both runs, 6 wrong in both, and none changed correctness. This supports repeatability of these errors under the fixed local configuration, not correctness or a proof of universal determinism. See [stability summary](../evaluation/phase_iii_i_5/stability_summary_v1.json).

The main limitations are correlated case families, intentionally high difficulty, a self-attested human review whose process was not independently witnessed, the documented author exposure, a lexical rather than semantic overlap guarantee, unrecovered byte identity between the archived V5 data and historical adapter training, and local CPU-only inference timing. This test isolates the classifier with oracle requirement delivery; it does not measure retrieval or full application accuracy. Self-reported confidence is not calibrated. The evidence supports a diagnostic target, not training success or deployment readiness.

**TARGETED RETRAINING SCOPE REVISED**
