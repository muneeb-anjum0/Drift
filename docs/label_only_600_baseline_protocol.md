# Label-Only 600-Case Development Baseline Protocol

**Status: FROZEN PROTOCOL, NOT EXECUTED.** This fixes the prompt, strict parser, metrics, and decision gate before any model output on the new development partition. It does not authorize training, promotion, production API changes, or use of either locked test. The existing Phase III model decision remains unchanged.

## Scope and boundaries

The new source consists of 600 final-labeled requirement/message pairs, 100 per class. A deterministic split prepared before model inference assigns 50 training, 25 development, and 25 locked-test cases per class. Only the **150-case development** partition may be used for this baseline. The 300 training cases, new 150-case locked test, 36-case pilot, closed Phase III-J development set, and sealed Phase III-J final are outside the baseline input. Partition hashes are in [`protocol_freeze_v1.json`](../evaluation/label_only_new/protocol_freeze_v1.json); the private CSVs remain ignored by Git.

The primary baseline is an **unmodified, separately selected small model**, before any training on these cases. The baseline and any later authorized training will run on Kaggle; the local 8 GB GPU is the intended unquantized inference target, not the training host. Exact weights/tokenizer and the chat template are not selected in this freeze and must be recorded and hashed before execution. A run with a substituted or changed model is inconclusive. The existing production GGUF SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9` remains the production identity; it is not the small-model baseline by assumption. The rejected Phase III-J adapter remains research-only.

## Frozen task contract

[`prompt_v1.json`](../evaluation/label_only_new/prompt_v1.json) contains the exact system instruction and user template. Supply exactly one agreed requirement and one new client message in that order, as data. Render the two messages with the selected model's recorded chat template, starting with an empty assistant turn. No few-shot example, forced prefix, grammar, provider JSON mode, retry, repair, or postprocessing is allowed. Generate greedily with a maximum of 32 new tokens, batch size one, in development CSV order. Record EOS/stop/truncation reason and exact raw bytes. Keep tokenizer-specific EOS and runtime settings fixed for the run. A response stopped by the token limit is invalid even if it appears to contain a complete object.

The new ontology clarifies one conflict in historical P1 wording: an **explicitly incompatible requirement** is `contradiction`; underspecified or hypothetical intent is `ambiguous`. This aligns the prompt with the new review task. As a result, this prompt has a new identity and historical P1/P1-L1 scores are not directly comparable. The output is exactly one JSON object with only `"label"` and one canonical lowercase value. The model supplies no confidence, reasoning, changed elements, or human decision.

[`label_only_600_contract.py`](../tools/verification/label_only_600_contract.py) is the frozen raw parser and scorer. It rejects duplicate keys, aliases/case changes, extra fields, non-JSON constants, Markdown, trailing text, truncated/unknown finishes, and non-object output. Invalid output is `INVALID` in the confusion matrix and wrong for accuracy; no label is recovered from it.

## Metrics and repeatability

The first raw output for every one of the 150 development cases is primary. Report accuracy, macro F1 over all six classes, per-class support/TP/FP/FN/precision/recall/F1, six-by-seven confusion matrix including `INVALID`, structural validity, invalid-reason counts, and the directed added→modified, removed→modified, and contradiction→modified counts. Zero-denominator precision and F1 are zero. Preserve raw outputs and per-case results in a private evidence directory.

Select the first five SHA-256-ranked IDs within each reviewed class using seed `label-only-600-repeat-v1`, independent of model results, for 30 repeat calls. Require 30 valid repeats and 30 exact **label** agreements. Report raw-string agreement separately. The repeat cannot replace a first-pass prediction or be used to pick a better output. One case failure has no retry.

## Predeclared decision gate

The exact machine-readable thresholds and order are in [`gate_v1.json`](../evaluation/label_only_new/gate_v1.json). They are conservative screening rules, not statistical confidence limits or a production acceptance gate:

| Decision | Rule after identity, completeness, 150/150 primary validity, and 30/30 repeat validity and label agreement |
| --- | --- |
| `TRAINING_EXPERIMENT_JUSTIFIED` | Any of: at most 112/150 correct; macro F1 below 0.75; at least 6/25 removed→modified, contradiction→modified, or added→modified; or at most 12/25 ambiguous correct. This justifies designing a bounded experiment, not training automatically. |
| `NO_TRAINING_JUSTIFIED` | All of: at least 123/150 correct; macro F1 at least 0.80; at least 18/25 correct in every class; and at most 3/25 for each of the three directed confusions. This is only a development-set decision. |
| `INCONCLUSIVE` | Any prerequisite failure or any valid result between the two bands. Resolve the specific issue without adjusting cutoffs after seeing predictions. |

The 0.75 material-deficit band is informed by the historical Phase III-I.5 stress macro F1, while 0.80 reflects the Phase III-I oracle context. Those corpora and output contracts differ, so their scores are **context only**. Directed-confusion limits target the known product risk of collapsing added, removed, or contradiction into modified. With 25 examples per class, every decision must report raw counts and uncertainty; balanced synthetic data cannot establish field prevalence or deployment quality. The wider gray zone avoids turning a marginal development result into automatic training. A structural failure is diagnosed as a contract/runtime issue first, not called semantic training evidence.

## Evidence and remaining prerequisites

Before a Kaggle baseline run, freeze in a private execution manifest: selected model and tokenizer hashes, chat-template bytes/hash, Kaggle image and GPU identity, package versions, exact request settings, source revision, development/prompt/gate/parser hashes, and ordered case IDs. Verify all hashes immediately before calls. Keep raw data and output artifacts in private Kaggle storage rather than publishing a notebook output dataset by default. Save first-pass and repeat raw outputs, finish reasons, and a score ledger. Use only the frozen scorer and apply the gate once. No prompt variants or threshold changes after outputs. Later candidate comparisons require the same development IDs, prompt, parser, and protocol; the new locked test is reserved for a separately approved final comparison. Before local deployment, separately measure unquantized weight load, peak VRAM, latency, and sustained power behavior on the 8 GB laptop.

Review provenance is limited: the user reports Muhammad Malik reviewed all 600; the latest statement says no labels changed, while an earlier statement said some did. The final-only files cannot resolve that discrepancy, and case authorship/source rights are not recorded. This is disclosed rather than silently treated as verified gold. Prior to splitting, some source examples were inspected for QA; the new locked test is therefore protected from **future model tuning**, not claimed never to have been seen by the prompt author. Data publication rights and custody still need a decision before these private CSVs enter Git or an external service.

No model, GPU, external provider, or old final holdout was used to create this protocol. The new locked-test **partition file** was not opened for prompt or gate design after the split; pre-split source exposure is disclosed above. The next executable step is a separately documented **model identity and Kaggle runtime freeze** for the development-only baseline. This document itself authorizes no inference or training.
