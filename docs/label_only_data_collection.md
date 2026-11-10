# New Label-Only Data Collection

**Status: a separate 600-case review was reported complete; local partitions and the development-only prompt/parser/gate are frozen, but no model run is authorized.** See the [baseline protocol](label_only_600_baseline_protocol.md).

The 36 cases in [`candidates_v1.csv`](../evaluation/label_only_new/candidates_v1.csv) are a small, synthetic review pilot written for this effort. Their `reviewed_label`, `reviewer_id`, and `review_notes` cells are deliberately blank. They are not gold labels, training data, or a quality score. The six case families must remain together in any future split. Do not infer that the order of rows within a family supplies a label.

## Review task

For each row, compare one agreed requirement with one new client message. Assign exactly one label:

| Label | Meaning |
| --- | --- |
| `added` | A genuinely new capability beyond the agreed requirement. |
| `modified` | A change to an existing capability's behavior, limit, channel, or timing. |
| `removed` | An explicit request to drop an agreed capability. |
| `contradiction` | The message asserts incompatible requirements at once or conflicts with the agreed requirement without a coherent replacement. |
| `ambiguous` | The requested relationship cannot be determined without clarification. |
| `unchanged` | Equivalent scope, including paraphrase with no material change. |

The reviewer must be a human other than the case author. Record a stable reviewer identifier and notes where the wording is disputable. Adjudicate disagreements with a second human before treating a row as reviewed. Do not send real client text or identifiers into this public candidate file. Keep any private review material out of Git until its data custody is agreed.

The separate 600-case files in Downloads use `final_label` / `Final_label` headers. The original files remain unchanged. `tools/verification/prepare_label_only_600.py` checks both files against each other, requires 600 unique IDs and families, checks exact pair uniqueness and 100 valid final labels per class, and writes a normalized private copy under `evaluation/label_only_new/local_review/`. That directory is ignored by Git. The normal validator can then check the normalized copy. Validation checks structure and recorded provenance fields; it cannot prove reviewer independence or label correctness.

The user reports that Muhammad Malik independently reviewed all 600. The latest statement says no proposed labels changed; an earlier statement said a few were revised. The supplied final-only files do not contain the original proposals, revision history, case author, or row-level notes, so the discrepancy cannot be resolved from the files. The local manifest records those limits; it does not claim to verify the review history. No obviously identifying email addresses, URLs, or phone numbers were found in the case text by a basic scan. This is not a complete privacy or source-rights review. Do not commit these files or their local partitions until custody and publication rights are settled.

## Before any model comparison

The user chose to keep the 600 reviewed cases rather than expand to the earlier proposed 900-case minimum. Before any model run, use the predeclared 50 training, 25 development, and 25 locked test cases **per class** (300 / 150 / 150 total). The split ranks each unique family within its reviewed class by SHA-256 of `drift-label-only-600-v1:<class>:<family_id>:<case_id>`; it does not select cases by manual difficulty or model result. The 36-case pilot remains outside these partitions. The smaller training partition raises uncertainty about fine-tuning benefits, and the synthetic style may overstate generalization to real client messages. Do not reinterpret the locked test as development evidence if the result is weak.

The prompt, output parser, metrics, partition hashes, and development screening gate are now versioned in the [baseline protocol](label_only_600_baseline_protocol.md). Exact small-model identity, runtime, source rights/custody, and the reviewer-history discrepancy remain documented execution prerequisites. Keep the new locked test out of model tuning. The Phase III-J development set remains closed; the original sealed final holdout remains untouched. Nothing in this document authorizes model training or calls to an external provider.
