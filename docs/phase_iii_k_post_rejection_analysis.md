# Phase III-K Post-Rejection Analysis

## 1. Status

**Phase III-J candidate remains DEVELOPMENT REJECT.** This is a post-rejection analysis and go/no-go decision, not a revised evaluation. The Phase III-K research decision is **NEW_DATA_ONLY_PHASE_JUSTIFIED**: the current train/development evidence does not justify another training run, but a genuinely independent, consistently adjudicated corpus could test a general hypothesis later. The existing 124-case development set is **CLOSED_FOR_FUTURE_TUNING**. No model, prompt, parser, label, gate, or production contract was changed.

## 2. Evidence Boundary

The work began on `phase-3/targeted-retraining`, HEAD `88e81355688ad2daf21ffcc7fac95d26823477ca`, with the pre-existing dirty worktree left intact. The candidate GGUF SHA-256 reverified as `cc3029ed17bcf14138b96d37c9c1442bf52cfec05b51e0ea6e4297ec3264846f`. All 19 files listed in the saved Phase III-J [`evidence_hashes_final.json`](../archive/phase_iii_j/label_only_candidate_cpu_screen_v1/evidence_hashes_final.json) reverified. The [frozen development-screen result](phase_iii_j_label_only_cpu_development_screen_result.md) reverified at SHA-256 `82f4a4fc3b4a220495436f4232705df3f86ad3e2b443e339f35d1576c2fc8fb9`.

Only the reviewed train (`477` rows, SHA-256 `d3198232c18b48aaafbb795e511f94e033d01172803465fa63ee13630bfc0658`) and development (`124` rows, SHA-256 `89a9506ddf3c65dd6a7361a4e69366917046c8ea38ef0c45f81838f8b661baa7`) partitions, the saved candidate and original-model pass-1 JSONL files, the saved metrics/gate, and P1-L1 definitions were read. The candidate pass-1 hash is `28a0bb2e86b2af64fdddf327ed98ed2c7754f3edec05f858d6c6062a29c473ad`; the original baseline pass-1 hash is `cb6a8875bcc8eaf1e2bffc3c2bd041f2dc5aa2e95d4132c95af47c8ab806e878`. The ignored [offline analysis artifact](../archive/phase_iii_k/saved_evidence_analysis.json) and its [source script](../archive/phase_iii_k/analyze_saved_evidence.py) make the joins, distributions, similarity screen, and diagnostic counterfactuals reproducible. They load no final data and call no model.

## 3. Candidate Result Summary

The frozen matched CPU Q4_K_M screen produced 124/124 strict-valid responses on each of three complete passes, with 124/124 raw/label/validity agreement for both repeats. Primary accuracy was **114/124 = 91.94%**, macro F1 **0.7774561748**. The approved development gate failed on macro F1 `<0.78`, true ambiguous correct `0/2` rather than `2/2`, and added→modified `2/24` rather than `≤1/24`; all other gates passed. No result below changes that decision.

## 4. Complete Error Inventory

Exactly **10** pass-1 predictions differ from the frozen reviewed label. “Preserved incorrect” means both models were wrong on that row, even if their wrong labels differ; it is not a semantic-distance judgment. “Regressed” means the original was correct and the candidate was wrong. No case improved *within this ten-error inventory* because candidate-correct cases are excluded. Quoted requirement/message fields below are the complete saved development text, including incidental boilerplate. No label is corrected here.

1. **DV0002, removed→added**; raw `{"label":"added"}`; original predicted `modified` (**preserved incorrect**). Baseline: “Comments on videos are moderated automatically using a profanity filter.” New message: “Automatic comment moderation is not applied to live streams. Finance asked for it to be written down so everyone works from the same text.” The live-stream exclusion removes baseline scope; the added prediction has no evident new capability to anchor it.
2. **DV0003, modified→removed**; raw `{"label":"removed"}`; original predicted `ambiguous` (**preserved incorrect**). Baseline: “Security alerts above severity 8 are escalated to the on-call engineer immediately.” New message: “Escalation needs a rethink: SOC wants all alerts, on-call wants none. Hold off.” The saved reviewer revised this to modified with reason “Not intrinsically ambiguous.” No option is selected and “Hold off” resists a committed change; **REVIEW_REQUIRED** for consistency with P1-L1 ambiguous, without changing the saved truth.
3. **DV0016, modified→added**; raw `{"label":"added"}`; original predicted `added` (**preserved incorrect**). Baseline: “Comments on videos are moderated automatically using a profanity filter.” New message: “Comments are moderated using a profanity filter and a spam filter.” The original filter remains and a spam filter is added, making the confirmed modified label hard to distinguish from P1-L1 added without an explicit rule for new subcomponents of an existing capability; **REVIEW_REQUIRED**.
4. **DV0056, contradiction→unchanged**; raw `{"label":"unchanged"}`; original predicted `unchanged` (**preserved incorrect**). Baseline: “Standing orders must execute on the scheduled date, and if that date is a bank holiday they must execute on the preceding business day.” New message: “The wording came out of last quarter's planning session. If the date is a bank holiday, run the standing order on the next business day instead. Customer success flagged it as a recurring topic in renewals.” Preceding versus next business day is an explicit incompatible holiday rule; this looks like an isolated missed contradiction, not equivalence.
5. **DV0058, ambiguous→modified**; raw `{"label":"modified"}`; original predicted `ambiguous` (**regressed**). Baseline: “Each product serial number is printed on the label and engraved on the casing.” New message: “Engraving costs too much so we might skip it or just do it on high-value units. Procurement is getting quotes.” Two unchosen possibilities (no engraving versus narrowed scope), “might,” and pending quotes leave commitment and scope unresolved. The candidate appears to treat a contemplated engraving change as decided.
6. **DV0068, modified→contradiction**; raw `{"label":"contradiction"}`; original predicted `ambiguous` (**preserved incorrect**). Baseline: “Only the finance director may change the settlement bank account, and every change must wait 48 hours before taking effect.” New message: “Whether urgent settlement account changes may bypass the 48-hour wait awaits the finance director.” A bypass would conflict with the explicit invariant, but “whether” and “awaits” do not commit to it. The saved reviewer revised this to modified as “Not intrinsically ambiguous”; **REVIEW_REQUIRED** for the hypothetical-versus-committed boundary.
7. **DV0097, modified→removed**; raw `{"label":"removed"}`; original predicted `removed` (**preserved incorrect**). Baseline: “Interns are paid a monthly stipend and are never eligible for health benefits.” New message: “Interns won't get a stipend this year. The topic came up again in the monthly review, which is why I'm raising it now.” The saved reviewer revised this to modified with reason “Capability survives but property changed,” but the baseline stipend is explicitly withdrawn for the year. P1-L1 removed gives priority to eliminated baseline items; **REVIEW_REQUIRED**.
8. **DV0104, added→modified**; raw `{"label":"modified"}`; original predicted `modified` (**preserved incorrect**). Baseline: “Teachers upload assignment grades within 7 days of the submission deadline.” New message: “Written feedback is expected with the grades. QA wants the wording to be precise so test cases can be derived from it.” Feedback is a new data/deliverable item accompanying an unchanged grading deadline. The candidate folds that addition into the existing grades workflow.
9. **DV0117, added→modified**; raw `{"label":"modified"}`; original predicted `unchanged` (**preserved incorrect**). Baseline: “Security alerts above severity 8 are escalated to the on-call engineer immediately.” New message: “Product has this area on the roadmap for next quarter. The wording came out of last quarter's planning session. Escalate to the on-call manager if not acknowledged in 10 minutes. This is based on notes taken during the stakeholder workshop.” A conditional second escalation is added after non-acknowledgment; the original immediate escalation is not expressly withdrawn. Roadmap and workshop boilerplate could obscure the operative instruction, but the failure is still measured against the frozen added truth.
10. **DV0120, ambiguous→modified**; raw `{"label":"modified"}`; original predicted `ambiguous` (**regressed**). Baseline: “Authors can schedule posts to publish at a future date and time.” New message: “Scheduling should maybe work differently, like drafts auto-publishing, or no scheduling at all. Editorial is split.” Alternative modification versus removal, “maybe,” and a split decision make the intended behavior unresolved. The candidate treats the discussion as a settled modification.

Directions: ambiguous→modified **2**, added→modified **2**, modified→removed **2**, removed→added **1**, modified→added **1**, modified→contradiction **1**, contradiction→unchanged **1**. Eight are preserved incorrect; the two ambiguous rows are regressions from the original model.

## 5. Error Clusters

| Boundary | Count and examples | Pattern and coherence | Assessment |
| --- | --- | --- | --- |
| Ambiguous→modified | 2: DV0058, DV0120 | Both present unresolved alternatives, hedge words, and no selected policy. Coherent. | Systematic on the tiny two-row ambiguous development class; not proof of population-wide failure. |
| Added→modified | 2: DV0104, DV0117 | New output/second escalation is integrated into an existing workflow. Coherent niche. | Boundary weakness, but 22/24 added cases were correct; not a general added collapse. |
| Modified→removed | 2: DV0003, DV0097 | “Hold off” versus explicit stipend withdrawal are semantically different. | Heterogeneous and both labels require review; no stable correction can be inferred. |
| Modified→added | 1: DV0016 | New spam filter alongside the retained profanity filter. | Isolated prediction, but a possible ontology/example inconsistency. |
| Modified→contradiction | 1: DV0068 | Hypothetical bypass of an explicit invariant. | Isolated; frozen truth requires review. |
| Contradiction→unchanged | 1: DV0056 | Preceding versus next business day despite distracting boilerplate. | Isolated clear missed invariant. |
| Removed→added | 1: DV0002 | Exclusion of live streams from existing moderation. | Isolated clear missed removal. |

These categories describe observed errors only. They do not supply training targets or a new acceptance rule.

## 6. Ambiguous-Class Analysis

P1-L1 defines ambiguous as insufficient, unresolved, hypothetical, or internally conflicting intent/constraints. DV0058 is unresolved **removal versus scope narrowing** of engraving, with “might” and pending quotes. DV0120 is unresolved **alteration versus elimination** of scheduling, with “maybe” and editorial disagreement. Neither describes a committed change; both frozen ambiguous labels are defensible under the written definition. The candidate's modified predictions suggest it recognized a proposed change but missed non-commitment. The original model labeled both ambiguous correctly, while generating 14 false ambiguous predictions elsewhere; the candidate reversed that trade-off with 0 true and 0 false ambiguous predictions.

The reviewed training set has **6 ambiguous rows in 6 families**, versus **156 modified rows in 110 families** (a 26:1 row ratio). The six ambiguous examples cover different domains and several variants of unresolved alternatives, vendor/architecture dependence, and explicit “no change decided” language, so “no variety” is too strong. They nevertheless concentrate on the same broad uncertainty mechanism and are too few to establish coverage of the six-class boundary. More concerning, **36/156 training modified rows** carry the saved review reason “Not intrinsically ambiguous”; many contain unresolved alternatives or uncommitted proposals (for example TR0011, TR0030, TR0119, TR0294). The development partition has **15/39 modified** rows with that same reason. This is a plausible conflicting supervision signal relative to P1-L1, not a license to relabel those rows here.

Assessment of proposed causes: **A, insufficient representation — supported as a risk, not proven as the sole cause; B, insufficient variety — partly supported, with six distinct domains but limited mechanism depth; C, definition/prompt boundary weakness — the definition itself is intelligible, while its application in reviewed examples appears inconsistent; D, training-objective weakness — not established by these saved outputs, since full-response structure and five other classes performed strongly; E, label noise/questionable truth — substantial evidence in modified review reasons, requiring independent adjudication; F, combination — most defensible working explanation.** No individual case is a verified causal experiment.

## 7. Added-vs-Modified Analysis

DV0104 adds written feedback as a new deliverable to unchanged grade uploading; DV0117 adds a conditional manager escalation to an existing immediate engineer escalation. Both extend an existing capability rather than introduce an unrelated feature, making the shared pattern coherent. They are **2/24** reviewed added cases, not a broad collapse. Correctly classified added development examples include a new kiosk-traffic data item (DV0060), XLSX export option (DV0048), a 24-hour mute option (DV0114), a digital certificate copy (DV0122), and a new rescheduling actor (DV0123). The training set already includes 81 added rows across 81 families, including secondary reminders (TR0106), an additional CFO notification (TR0105), and call transcripts (TR0265). Thus a simple absence of additive-extension coverage is not supported.

The finer distinction—new subcomponent versus changed rule of an existing workflow—remains under-specified in examples. TR0097 is reviewed modified for a backup approver entering the existing approval flow, while TR0105 is reviewed added for an extra CFO notification after existing approval; DV0016 is reviewed modified for adding a spam filter. Such neighboring examples offer potentially mixed signals. This supports an **ontology/example-consistency review**, not dev-case-specific augmentation. No frozen label is changed.

## 8. Macro-F1 Analysis

The frozen six-class macro F1 is **0.7774561748**, below 0.78 by **0.0025438252**. The five non-ambiguous class F1 values average **0.9329474097**; ambiguous F1 is **0**, so the equal-weight six-class average falls to 0.7774561748. This arithmetic makes the small threshold miss essentially a consequence of ambiguous-class collapse, not a separate broad semantic failure.

For diagnosis only, holding all other predictions fixed and moving an actually ambiguous row from `modified` to `ambiguous` yields macro F1 **0.8905097878** if one of the two is corrected (ambiguous F1 2/3), or **0.9480589638** if both are corrected (ambiguous F1 1). The five-class macro F1 **0.9329474097** excludes ambiguous entirely and is **not** the approved metric. These are arithmetic counterfactuals, not new model results, revised gates, or a pass claim. The separate added→modified and ambiguous-correct gates still fail in the observed record.

## 9. Training Distribution Analysis

| Reviewed class | Train rows | Distinct families | Distinct messages |
| --- | ---: | ---: | ---: |
| Added | 81 | 81 | 81 |
| Modified | 156 | 110 | 156 |
| Removed | 84 | 75 | 84 |
| Contradiction | 82 | 53 | 82 |
| Ambiguous | **6** | **6** | **6** |
| Unchanged | 68 | 68 | 68 |

All 477 training messages are distinct. Simple word-token counts show 124 distinct message word types across 173 ambiguous-message tokens, versus 1,028 types across 3,354 modified-message tokens; these unbalanced totals are **not** a fair stand-alone richness score. Qualitatively, ambiguous training covers six domains but repeatedly uses unchosen alternatives; it offers much less evidence about separating unresolved proposals from committed modified changes. Added covers many distinct capabilities, options, actors, channels, and data items, including extensions of an existing workflow. Modified is numerically dominant and contains 44 reviewer-revised rows, 36 explicitly assigned the “Not intrinsically ambiguous” reason. This combination may bias uncertain wording toward modified, but the saved evidence cannot isolate imbalance from label consistency, optimizer effects, or the specific two-case development sample.

## 10. Leakage / Duplicate Review

The reviewed partitions have **zero shared family IDs**, **zero exact baseline/message pairs**, and **zero normalized exact pairs**. For each of the ten errors, the offline screen compared its combined baseline-plus-message pair against all 477 training pairs after Unicode casefolding, alphanumeric word tokenization, and whitespace collapse. It used `difflib.SequenceMatcher` character ratio **≥0.85** or word-bigram set Jaccard **≥0.80** as a near-duplicate flag. There were **zero threshold hits**; the highest observed top-match character ratio was **0.6015**, and highest top-match word-bigram Jaccard was **0.2857**. Top-three matches for each error are preserved in the ignored analysis artifact.

Manual reading found repeated **generic** distractor templates across partitions (for example roadmap, review-meeting, QA-wording, and workshop phrases) in some error messages. They are not the same baseline/message pair, but lexical screening cannot prove semantic independence or exclude all latent synthetic templating. The two-truth-label ambiguous cases and questionable modified labels remain as frozen; duplicate results are not used to relabel them.

## 11. Ontology / Label-Boundary Review

The frozen P1-L1 definitions are broadly intelligible: unchanged requires no material change; added retains the baseline capability while introducing a new item; removed eliminates a baseline item; modified retains behavior but changes its rule/value/format/etc.; contradiction conflicts with an explicit invariant; ambiguous covers insufficient, unresolved, hypothetical, or internally conflicting intent. They also specify not to call an addition or removal merely modified. No definition is edited here.

Some boundaries are genuinely hard but well-defined (DV0058/DV0120 unresolved alternatives; DV0056 preceding versus next business day; DV0002 live-stream exclusion). Other **reviewed examples may not consistently implement those definitions**: DV0003 and DV0068 are uncommitted discussions labeled modified; DV0016 adds a filter but is labeled modified; DV0097 explicitly eliminates a stipend but is labeled modified. Each is **REVIEW_REQUIRED**, not corrected. DV0104/DV0117 are defensible additions but highlight the lack of an explicit subcomponent-versus-rule decision rule. The 36 training modified rows reviewed as “Not intrinsically ambiguous” and neighboring added/modified exemplars warrant a new, independent adjudication process before any future training proposal. This is evidence of possible ontology-application inconsistency, not proof that every such row is wrong.

## 12. Development-Set Contamination Assessment

**CLOSED_FOR_FUTURE_TUNING.** The same 124 reviewed development rows have supported the original baseline, gate design, candidate screening, and now case-level error analysis. Using their ten error texts to add examples, alter labels, tune a prompt, choose checkpoints, adjust thresholds, or select another candidate would compound adaptive overfitting. No further candidate should be repeatedly selected on these rows. A future research question needs new independently sourced and adjudicated data with a fresh locked evaluation split and predeclared metrics/gates. The sealed final must not be substituted for that development role or used to tune.

## 13. Retraining Justification Assessment

**Decision: NEW_DATA_ONLY_PHASE_JUSTIFIED.** The error signal is coherent enough to formulate a *general* research question: can a classifier separate unresolved proposals from committed changes, and new additive subcomponents from rule modifications, under a consistently applied ontology? Yet only two reviewed ambiguous development rows, conflicting modified review reasons, four `REVIEW_REQUIRED` development labels, and repeated exposure of the same 124 cases make an immediate targeted retraining proposal scientifically weak. There is no independent current evaluation corpus on which to test a second iteration without dev-set reuse. The current evidence therefore rules out another training run or dev-specific augmentation; it does not rule out a separately approved fresh-data phase. Such a phase would first define adjudication and an untouched evaluation split, **not** train or score a new model now.

## 14. Cost / Benefit Assessment

The candidate's 91.94% development accuracy and strong gains on removed, contradiction, and modified are real within this paired development protocol, but the candidate failed three frozen gates and cannot replace production. Further Phase III model iteration on existing data has diminishing scientific return and high overfitting risk. Drift also has architecture, API, security, testing, CI, persistence, inference, recovery, packaging, staging, deployment, and operational work whose value does not depend on waiving these gates. The immediate engineering choice is **reject candidate and proceed with product/staging work while keeping model research paused**. Open a fresh-data research phase only if its product value and independent data/validation budget are explicitly justified; do not treat product pressure as a gate waiver.

## 15. Recommended Model Status

**KEEP_EXISTING_PRODUCTION_MODEL.** The rejected Q4_K_M candidate remains an identified research artifact only. It is not renamed into the production path, served through the production API, or silently promoted. Label-only architecture questions may be handled as separately authorized product work, without using this rejected candidate as the production model.

## 16. Decision

**PHASE III-K DECISION: NEW_DATA_ONLY_PHASE_JUSTIFIED; NO-GO for further training on the current train/development evidence.** Preserve the Phase III-J development rejection, freeze the existing 124-case development set against future tuning, keep the production model, and prioritize repository consolidation and staging/deployment validation. No retraining is authorized by this report.

## 17. Final-Holdout Status

**SEALED AND UNTOUCHED.** No final payload, rows, predictions, or metrics were opened or generated. No model inference was run in Phase III-K.

## 18. Next Action

Design a fresh independent corpus before considering any further training.
