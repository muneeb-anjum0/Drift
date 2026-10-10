# Phase III-J Corrective Training Proposal

## 1. Status

**Design only; not authorization to train.** The first Phase III-J adapter remains rejected. The development-only raw probe supports an output-supervision mismatch as a contributor, not a sole-cause proof. The 182-case final holdout remains sealed; no corrective training, final comparison, adapter promotion, or production change has occurred. The earlier draft scoped a possible `Phase III-J Corrective Iteration 1` (`phase3j-corrective-1`), but the teacher-forcing audit below withdraws its masked-placeholder target as a runnable design. No corrective training design is approved or authorized. The original data are AI-authored and separately AI-reviewed, **not human-reviewed**; this proposal does not cure that provenance gap.

## 2. Evidence

The rejected run completed 180 optimizer steps and selected checkpoint 60 by development label-token loss. Its recovery displayed **0/124** strictly structure-valid development responses and macro-F1 0.0, transcribed from the private notebook; the full recovery predictions/metrics were not preserved locally. The subsequent fixed, two-per-class development probe preserved raw text and recorded **12/12** generations, **0/12** valid four-field JSON responses. Five began with a bare label followed by disconnected JSON fragments, six were YAML-like, and one was a malformed nested object. All emitted additional text after an apparent label; none merely stopped at the label. Four apparent labels (`DV0003`, `DV0005`, `DV0058`, `DV0120`) disagreed with reviewed development truth. Apparent labels in malformed text are diagnostic observations, **not** valid classifications.

The private, ignored raw-probe ZIP is `archive/phase_iii_j/drift_phase3j_raw_probe.zip`, SHA-256 `178d44fd5feb7c4db5c01a84bb52ad11d8ea33a80415961e4ffe8f5200ba0039`; the rejected adapter SHA-256 is `907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21`. See [baseline outcome](phase_iii_j_baseline_outcome.md) and [probe report](phase_iii_j_structural_failure_probe.md). Neither the final payload nor a final prediction was used.

## 3. Root-Cause Hypothesis

The source code proves that the training loss rewards a label fragment, whereas development generation begins before that fragment and the parser requires a complete object. The probe's malformed but label-bearing responses strongly support this mismatch as a contributor to structural failure. It does **not** prove that this is the only cause: the YAML-like/nested shapes and four apparent semantic disagreements remain unexplained. The best checkpoint's low label-token loss is not evidence of valid full-response generation or six-class improvement. A correction must be tested independently for structure and semantics.

## 4. Existing Training Contract

[`prompt_for`](../tools/phase3j_kaggle/phase3j.py#L171-L177) ends exactly with `<|im_start|>assistant\n` after the P1 system/user messages. [`encode_rows`](../tools/phase3j_kaggle/phase3j.py#L180-L191) appends the literal prefix `{"label":"` to that prompt, then appends `row["review"]["reviewed_label"] + '"'`. It independently tokenizes the prefix as `before` and the latter substring as `target`; `input_ids = before + target` and `labels = [-100] * len(before) + target`. Thus the system/user prompt, assistant marker, `{"label":"` prefix, and all preceding tokens are loss-masked. Only the reviewed label value and closing quote are supervised. There is no supervised comma, remaining key, value, closing brace, or EOS. Separate tokenization is an implementation detail; the exact effective token sequence must be checked in any correction.

[`train`](../tools/phase3j_kaggle/phase3j.py#L280-L353) uses this encoder for both 477 training and 124 development rows, selecting a checkpoint by the resulting masked-token development loss. That loss cannot be compared numerically to a changed objective. The reviewed rows expose `reviewed_label` and occasional `review.reason` adjudication notes (44/477 train, 16/124 development), but no reviewed `confidence`, P1 `reasoning`, or `changed_elements` targets in either split. The notes are not full P1 explanations or element annotations. No deterministic function of a six-class label can produce a calibrated confidence, case-grounded explanation, or case-specific changed-elements list without adding unsupported semantics. The original review was AI review, not human review.

## 5. Existing Evaluation Contract

[`evaluate_development`](../tools/phase3j_kaggle/phase3j.py#L253-L273) generates from **only** `prompt_for(row, p1)`, not the training-time `{"label":"` prefix. It uses greedy decoding (`do_sample=False`), a 120-new-token limit, and decodes the raw continuation before [`strict_prediction`](../tools/phase3j_kaggle/phase3j.py#L207-L219). The parser applies `json.loads(text.strip())` and accepts only one object with **exactly** `label`, `confidence`, `reasoning`, and `changed_elements`; label must be one of six classes, confidence a finite non-Boolean number in `[0,1]`, reasoning a string, and changed_elements an array of strings. Missing/extra keys, `null` confidence, YAML, bare labels, and trailing fragments fail. A recovered apparent label is never scored as valid.

All four fields also matter downstream, though production parsing has some normalization not permitted by the frozen evaluation parser. The [inference contract](../services/inference/contracts.py#L30-L84) requires them; the [Go client](../server-go/internal/modules/drift/inference_client.go#L99-L134) rejects absent fields. Go uses confidence for detected-change confidence and a `<0.35` decision filter, reasoning for description/summary, and changed_elements for impact/title construction ([client](../server-go/internal/modules/drift/inference_client.go#L177-L201), [service](../server-go/internal/modules/drift/drift_service.go#L145-L198)). The [UI](../client/src/features/drift/DriftAnalysisPanel.tsx#L326-L340) displays all three; the [benchmark](../server-go/internal/modules/evaluation/evaluation_benchmark.go#L270-L280) checks confidence and nonempty reasoning. These are not merely debug fields. A later architecture review could reconsider their provenance and product use, but **this experiment does not change the production or frozen evaluation contract**.

## 6. Candidate Corrections

| Option | Semantic integrity / fabricated supervision | Existing parser and comparability | Structure learning / constant or semantic risk | Change and audit cost |
| --- | --- | --- | --- | --- |
| A. Full object with reviewed label, fixed confidence, empty reasoning and `[]` | **Fails**: constants/empties become learned pseudo-truth; `1.0` falsely implies certainty and empties erase useful fields | Syntax and types pass; same parser/P1 | Likely improves shape but can train false certainty, blank explanations, and empty element lists; may impair classification | Small code change, easy to audit syntactically, poor semantic auditability |
| B. Full object with `null`/placeholder unsupported values | No claimed annotation if explicitly marked, but supervised placeholder values are artificial | `null` confidence/reasoning/list fail the frozen parser; a string sentinel can pass while being meaningless | May teach invalid/null or sentinel outputs; semantic label can be drowned by scaffold | Small–medium change; requires an incompatible schema or masking to be viable |
| C. Make unsupported fields optional | Avoids fabricating values | **Breaks** frozen P1/parser/product contract and baseline comparability | Can produce valid label-only text only under a different task; does not teach the required envelope | High evaluation/architecture change; outside scope |
| D. Supervise only `{"label":"removed"}` | Preserves reviewed label; no invented values | Valid JSON but **fails** exact four-key parser | Teaches object closure, not the required response | Very small change; insufficient |
| **E. Full four-key syntactic scaffold with loss only on reviewed label and structural tokens** | No *direct* loss on unsupported values, but later supervised tokens are conditioned on them | Keeps P1, raw parser, decoding, and gate unchanged | **Not clean as written:** artificial values enter teacher-forced context for punctuation, later keys and closure; may induce constants or fail on self-generated values | Moderate code change, but a zero-loss value mask does not resolve the causal mismatch |

E was selected in the earlier draft, but the audit below shows that its mask cannot make placeholder-conditioned suffix training equivalent to free-running inference. A–D either invent semantic targets or evade the frozen contract. **None of A–E is currently a runnable recommendation satisfying every constraint.** This restores the [baseline outcome](phase_iii_j_baseline_outcome.md)'s stop-without-supported-full-responses boundary; do not silently fall back to A or implement E.

## 7. Previously Selected Correction (Withdrawn)

The earlier draft proposed retaining the exact P1 prompt and reviewed label while constructing this **training scaffold** for each row:

```json
{"label":"removed","confidence":0.5,"reasoning":"__UNSUPERVISED_REASONING__","changed_elements":["__UNSUPERVISED_ELEMENT__"]}
```

`removed` would be replaced by that row's reviewed label. The `0.5` and uppercase markers were intended as unsupervised scaffolding, **not** annotations or claims of 50% certainty. The proposed loss covered the object opening, field names, separators/delimiters, reviewed label, final brace, and EOS, while masking the P1 prompt and unsupported value interiors. This prevents *direct* loss on those value tokens, but does **not** make them inert: the later supervised tokens are predicted with those artificial tokens in context. The proposed mask audit of all 601 rows would not have detected this conceptual defect.

It was described as a *format-plus-label* objective, not full semantic-response supervision. That description understated the mismatch: training would optimize structural continuation after fixed artificial values, while inference must first generate its own unknown values. It could produce `0.5`, markers, a one-element list, hallucinated elements, or generic reasoning. The 120-token generation limit and 768-token training limit are unchanged; neither a length audit nor later development testing makes the target construction sound. At inference, generation still begins at `<|im_start|>assistant\n` and must produce the entire object unaided.

The previously contemplated code delta was a new version of [`encode_rows`](../tools/phase3j_kaggle/phase3j.py#L180-L191) using the scaffold plus EOS and a token-level mask, while retaining `prompt_for`, generation, and `strict_prediction`. **Do not implement it.** Versioning, mask-alignment tests, a renamed loss metric, and the export-guard repair would be necessary if some future design were approved, but none addresses this teacher-forcing defect. The rejected artifact remains unchanged.

## Teacher-Forcing and Masked-Value Audit

**Actual encoding and tokenizer.** [`encode_rows`](../tools/phase3j_kaggle/phase3j.py#L180-L191) places all `before + target` token IDs in `input_ids`; only `labels` are set to `-100` for `before`. [`collate`](../tools/phase3j_kaggle/phase3j.py#L194-L204) assigns attention mask `1` to every non-padding input token, regardless of its loss label. In a causal LM, a loss-masked token is still a prior input token for predicting a later, unmasked token; `-100` suppresses loss **for predicting that token**, not its presence in context ([Transformers causal-LM model documentation](https://huggingface.co/docs/transformers/main/model_doc/gpt2)). No proposed masked-placeholder encoder exists in the repository; the table below audits the **proposed** mask against actual tokenizer IDs, not a run of a changed trainer.

The tokenizer was read **in memory** from the rejected run's `best_adapter/tokenizer.json` inside the ignored original-backup ZIP (tokenizer JSON SHA-256 `3fd169731d2cbde95e10bf356d66d5997fd885dd8dbb6fb4684da3f23b2585d8`). For development row `DV0001` (reviewed label `removed`), the current code's separate encodes yield 302 masked prefix tokens, then supervised token `45756` (`removed`) and token `1` (`"`). The plain P1 prompt alone is 299 tokens. The proposed scaffold is 34 tokens, and tokenizing `prompt + scaffold` gives 333 tokens with the same 34-token response suffix; proposed EOS would be token `151645` (`<|im_end|>`). This inspection loaded neither model weights nor final-holdout data.

Here is **every response token** for that one proposed target. “Loss” is what the withdrawn proposal intended, not what current code implements. “Later context” means the token remains in `input_ids` with attention mask `1` and can condition subsequent response-token predictions. The EOS row has no later target.

| Index | Token ID | Token text | Proposed loss? | Visible to later tokens? |
| ---: | ---: | --- | :---: | :---: |
| 0 | 4913 | `{"` | Yes | Yes |
| 1 | 1502 | `label` | Yes | Yes |
| 2 | 3252 | `":"` | Yes | Yes |
| 3 | 45756 | `removed` | Yes | Yes |
| 4 | 2198 | `","` | Yes | Yes |
| 5 | 81929 | `confidence` | Yes | Yes |
| 6 | 788 | `":` | Yes | Yes |
| 7 | 15 | `0` | **No** | **Yes** |
| 8 | 13 | `.` | **No** | **Yes** |
| 9 | 20 | `5` | **No** | **Yes** |
| 10 | 1335 | `,"` | Yes | Yes |
| 11 | 19895 | `reason` | Yes | Yes |
| 12 | 287 | `ing` | Yes | Yes |
| 13 | 3252 | `":"` | Yes | Yes |
| 14 | 563 | `__` | **No** | **Yes** |
| 15 | 88673 | `UNS` | **No** | **Yes** |
| 16 | 33604 | `UPER` | **No** | **Yes** |
| 17 | 53 | `V` | **No** | **Yes** |
| 18 | 26458 | `ISED` | **No** | **Yes** |
| 19 | 71945 | `_REASON` | **No** | **Yes** |
| 20 | 1718 | `ING` | **No** | **Yes** |
| 21 | 563 | `__` | **No** | **Yes** |
| 22 | 2198 | `","` | Yes | Yes |
| 23 | 17353 | `changed` | Yes | Yes |
| 24 | 22801 | `_elements` | Yes | Yes |
| 25 | 36799 | `":["` | Yes | Yes |
| 26 | 563 | `__` | **No** | **Yes** |
| 27 | 88673 | `UNS` | **No** | **Yes** |
| 28 | 33604 | `UPER` | **No** | **Yes** |
| 29 | 53 | `V` | **No** | **Yes** |
| 30 | 26458 | `ISED` | **No** | **Yes** |
| 31 | 27156 | `_ELEMENT` | **No** | **Yes** |
| 32 | 563 | `__` | **No** | **Yes** |
| 33 | 92446 | `"]}` | Yes | Yes, for EOS |
| 34 | 151645 | `<|im_end|>` | Yes | No later target |

The causal dependency is concrete: supervised token 10 (comma/opening quote) and tokens 11–13 (`reasoning` and its delimiter) are predicted after masked `0.5`; supervised token 22 **combines the reasoning closing quote, comma, and next opening quote** after the masked reasoning marker. Tokens 23–25 (next field name, bracket and quote) inherit that context. Supervised token 33 **combines the changed-element closing quote, closing bracket, and final brace** after the masked element marker; EOS follows it. Thus **yes**: closing quotes, commas, later field names, brackets, and final brace are trained with artificial placeholder text in their causal history. This is true even with a perfect token-offset mask. Token merging additionally makes some structural pieces inseparable at the token level.

During real inference the model starts at the plain P1 assistant prompt and must generate its own confidence, reasoning, and changed-elements content before those suffix tokens. If it generates different values, the trained structural predictions face a different history; if it repeats the scaffold, the outputs are semantically misleading or nonsensical. The table establishes a **teacher-forcing/inference context mismatch**, not that a particular future model would necessarily copy placeholders or fail. Zero direct loss on placeholder IDs is therefore insufficient to call them semantically inert or to guarantee full-envelope generation.

Alternatives within the current boundary were checked: supervising only the reviewed label or a prefix ending before the first unsupported value avoids fabricated value context but does **not** teach the complete four-field object; reordering fields merely moves the first unsupported span; fixed/empty/null values directly teach invented semantics or fail the parser; hiding placeholder input tokens with an attention mask creates a different artificial gap and still does not train continuation after the model's own values. On-policy or grammar-constrained methods might address syntax in a *different* experiment, but would change the training/generation design and still provide no ground truth for confidence, reasoning, or changed elements. They are not approved substitutes or post-processing loopholes here.

For an ordinary teacher-forced causal-LM loss on a complete literal four-field response, there is **no clean way under the current data and constraints** to supervise every structural suffix without choosing concrete preceding values. Masking their loss does not remove their conditioning effect. The deeper architectural issue is that P1 and the product require the classifier to generate three operationally used fields for which the reviewed dataset has no authoritative targets. Resolving that may require genuinely reviewed field data or a separately approved inference/contract architecture decision; **neither is undertaken here**, and the existing parser, P1, dataset, partitions, and acceptance gate remain unchanged.

**Verdict: CORRECTIVE TRAINING DESIGN NOT YET SOUND.** Do not implement the withdrawn scaffold or run Corrective Iteration 1. A new evidence-backed design decision is required before any training authorization.

## 8. Semantic Integrity

- **Confidence:** No reviewed per-row confidence exists. Omission or `null` fails the frozen parser; a supervised constant implies unjustified calibration and can distort the product's 0.35 threshold. The withdrawn draft's masked `0.5` still conditions later structural losses. Neither a varying generated score nor parser validity proves calibration.
- **Reasoning:** No reviewed P1 reasoning exists. The occasional `review.reason` is an adjudication note, not an explanation target. Do not synthesize rationales with another model, derive them from labels, or call empty strings human-reviewed. The withdrawn marker would condition the closing quote and next key despite its zero direct loss.
- **Changed elements:** No reviewed changed-elements annotations exist. Do not infer pseudo-labels from the text and present them as truth. The withdrawn marker would condition the closing quote, bracket, brace and EOS despite its zero direct loss.

The reviewed label is the only available semantic target. Direct value-loss masking does **not** isolate structure from artificial value context; the earlier claim that a mask audit could establish that separation was too strong. Because the other three fields are consumed by the product, passing the frozen classification/structure gate alone would **not** justify product promotion. A separate architecture decision may reconsider the product contract, but no contract change is made here.

## 9. Historical Experiment Delta (Not Approved)

The following table records what the **withdrawn draft** would have held fixed or changed. It is not an implementation specification or permission to run.

| Item | Rejected baseline | Withdrawn `phase3j-corrective-1` draft |
| --- | --- | --- |
| Status/identity | Permanently rejected historical run and artifacts | Hypothetical new identity only; **not approved** |
| Reviewed data and provenance | 477 train / 124 development, AI-authored and separately AI-reviewed | **Same bytes, same provenance; no new, removed, or relabeled rows** |
| Partitions / final | Existing train/development and sealed 182-case final | **Unchanged** membership and seal; final not packaged for training/development |
| Base/tokenizer | `Qwen/Qwen2.5-7B-Instruct` at `a09a35458c702b33eeacc393d103063234e8bc28` | **Unchanged** |
| P1 / ontology | Frozen P1 SHA-256 `902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339`; six labels | **Unchanged** |
| Seed / quantization | 1729; 4-bit NF4, double quantization, float16 compute | **Unchanged** |
| LoRA | rank 16, alpha 32, dropout 0.05, same target modules/bias | **Unchanged** |
| Optimizer / schedule | paged_adamw_8bit; LR `2e-4`; linear scheduler, 12 warmup steps | **Unchanged** |
| Epochs / batches | 3 epochs; batch 1 train/eval, accumulation 8; epoch checkpoint/eval | **Unchanged** |
| Limits / decoding | 768 sequence tokens; greedy, 120 new tokens | **Unchanged**; overflow is a stop condition |
| Target / loss mask | Label value plus closing quote after a masked JSON prefix | Withdrawn full four-key scaffold; value loss mask does not remove artificial context |
| Checkpoint metric | Label-token development loss | Hypothetical masked-target loss, **not numerically comparable** and never run |
| Raw parser / product schema | Exact four-key `strict_prediction`; existing product fields | **Unchanged**; no repair/post-processing |
| Acceptance gate | Frozen `acceptance_gate_v1.json` | **Unchanged**; added development-only prerequisites do not lower it |
| Final-holdout policy | No final use for rejected candidate | No candidate exists; holdout remains sealed |

The frozen config and gate live in [`evaluation/phase_iii_j/frozen/`](../evaluation/phase_iii_j/frozen/); P1 lives in [`evaluation/prompts/`](../evaluation/prompts/). No package or code change is made by this document. Any future proposal must be independently justified and versioned without rewriting frozen originals.

## 10. Development Gates (Nonoperative Until Redesign)

These gates were drafted for the withdrawn target and **do not make that target sound or authorize a run**. They are retained as possible downstream checks only if a new design is separately approved. Such a future design would need to preserve raw continuations, token IDs, masks, run identities/hashes, class confusion matrices, and machine-readable metrics. The exact old-model comparator would be the frozen raw Q4_K_M model under P1 on the same 124 development cases, not post-processed predictions. The rejected adapter is a structural reference (0/124), not a meaningful strict-label comparator; its label-token loss cannot be compared to a different objective.

| Gate | Permission-to-proceed rule | Reject | Inconclusive / stop for investigation |
| --- | --- | --- | --- |
| Model-free target audit | No permission under E: zero direct loss on 601 rows would still leave synthetic values in context. A new design must resolve that dependency before ordinary mask/length/hash checks matter | Artificial-context dependency or unintended value-token supervision; **no training** | Unverified tokenization or encoding overflow also blocks any later design |
| Raw structure | **124/124** candidate development continuations pass unchanged `strict_prediction`; no malformed JSON, parser failure, marker, or extra text | Any model-produced invalid or marker-bearing output | Missing raw outputs, environment mismatch, or inability to reproduce parser/settings |
| Separate semantic score | Score only strict-valid outputs; candidate macro-F1 at least old-model development macro-F1 **+0.03**, and total correct not lower. Publish all six precision/recall/F1 values and full confusion matrix; no diagnostic label rescue | Either threshold missed; structure success cannot conceal this | Old comparator or development truth unavailable/mismatched |
| Class regressions | Versus old on the 124: removed and contradiction each gain **at least one** correct case and each have **at least one fewer** `→modified` error; added has no fewer correct and no more `→modified`; modified and unchanged each lose at most one correct; ambiguous (only two cases) loses none | Any threshold missed or a class collapses | Missing paired case-level old results; tiny ambiguous support is explicitly reported, not overinterpreted |
| Unsupported-field quality | No generated scaffold marker; all 124 reasoning strings nonblank; no confidence collapse to the single scaffold value across all 124; compare candidate and old confidence Brier scores on the same reviewed labels, candidate **no worse**. A human, blinded to candidate identity, reviews the preselected 12 two-per-class probe IDs for input-grounded reasoning and changed elements; all 12 must be supported, not boilerplate or fabricated | Marker/blank output, constant scaffold confidence, worse Brier score, or any unsupported audited statement | No human field audit or comparable old confidence data. This audit is **not** new training truth, human review of the original dataset, or a calibration guarantee |
| Determinism | Rank development IDs by SHA-256 of `phase3j-dev-repeat-v1` plus ID, take first 30; repeat raw greedy calls once. Candidate has 30/30 valid outputs on both passes and ≥29/30 identical labels; its repeat disagreements exceed old's by at most one | Reproducible failure of any limit | Missing second calls or unequal runtime/settings |
| Operability before final | Same-host, same-build P1 singleton comparison; p95 latency ≤1.25× old, peak RSS ≤7 GiB, zero swap, candidate GGUF ≤6 GB; record conversion identity and hashes | Measured excess | Missing GGUF/conversion, mismatch, or unmeasured resource figure; do not open final |

These checks would be **development prerequisites**, not replacements for the frozen [final acceptance gate](../evaluation/phase_iii_j/frozen/acceptance_gate_v1.json). They do not grant permission to train E or open the final holdout. A field audit or Brier check on 124 cases cannot retroactively repair an unsound target, and neither proves calibration. No malformed-but-semantic output may be counted as correct in any future design.

## 11. Final Holdout Policy

The final payload remains unopened during this design audit. No candidate is currently justified. Only a **future, separately approved** design that yields one frozen candidate and passes predeclared development prerequisites could request a separately authorized, exactly one old-versus-new raw comparison under the unchanged final gate. Use the same P1 singleton contract and matched inference/resource settings; preserve the final seal. Do not relabel final, tune thresholds from final, choose another checkpoint after seeing final, run a second look to rescue failure, or iterate on the final. Passing development would be permission to request that comparison, **not** permission to promote. Any final acceptance failure would leave the old model unchanged and the rejected baseline rejected.

## 12. Stop Conditions

**No corrective training iteration is authorized by this audited proposal.** The withdrawn draft's one-run cap is not permission to execute it. Any future design requires a new evidence review and explicit decision before even one run. If a future candidate structurally fails, stop and reconsider architecture/supervision rather than repair outputs; if semantics regress, reject; if development is inconclusive, investigate without automatic retraining; if final acceptance fails, reject and stop Phase III-J model promotion. No sweep, automatic retry, or inherited permission for another iteration.

## 13. Risks

Teacher-forced scaffolding would train structural continuations after artificial `0.5` and marker text, even with zero direct value loss. It could elicit constants, one-element arrays, or generic prose and fail after self-generated values. A model could overfit syntax while misclassifying removed/contradiction/added as modified, or emit a semantic-looking label in malformed text. The 12-case diagnostic and 124-case development set can be overinterpreted, especially ambiguous support of two; neither proves final improvement. Tokenizer merges and the input-context dependency are distinct problems; auditing merges alone cannot fix the latter. Even valid, nonconstant confidence is not calibrated by label-only supervision, and the product uses all three unsupported fields. Human auditing 12 outputs would not substitute for the unmet human review of source labels. The present risk is **not bounded**, so do not run the withdrawn design.

## 14. Authorization Boundary

**THIS DOCUMENT DOES NOT AUTHORIZE TRAINING.** It does not authorize code/config/data edits, package construction, GPU use, model download, Kaggle execution, sealed-final access, adapter promotion, production deployment, commit, push, merge, or tag. It only defines a proposal for review. The existing frozen acceptance gate, P1, dataset partitions, and rejected historical artifacts remain untouched.

## 15. Recommended Next Action

Review the teacher-forcing finding and decide whether to obtain authoritative field targets or commission a separate architecture/design proposal. Do not train yet.
