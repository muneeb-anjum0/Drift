# Phase III-E independent retrieval-label review packet

Status: **review draft only; no retrieval predictions have been run on these cases.** The R6 research candidate and decision rule were frozen in commit `f344adc` before this draft was created. The draft is [retrieval_independent_draft_v1.json](../evaluation/phase_iii_e/retrieval_independent_draft_v1.json), SHA256 `2236806580071f3ad9ef9bd9e2e3d4f0eb22465d3dfcf9d0af07919605f0ed79`.

Review task: for each of the 30 query IDs, identify exactly which baseline requirements are **materially affected by the message**. Do not label requirements merely mentioned as context, unless their own behavior or contract changes. Do not infer a six-class drift label. Apply the same semantic standard to additions, removals, questions, conditional language, and zero-target cases. Project requirements and proposed target IDs are in the draft JSON. Treat proposals as fallible; do not try to preserve their 0/1/2/3+ distribution. Three project sizes are represented: 8, 16, and 32 requirements.

Please return reviewer ID and review date plus one decision per case:

```json
{
  "reviewer": "independent-reviewer-id",
  "review_date": "YYYY-MM-DD",
  "draft_sha256": "2236806580071f3ad9ef9bd9e2e3d4f0eb22465d3dfcf9d0af07919605f0ed79",
  "decisions": [
    {
      "case_id": "bs-q01",
      "status": "CONFIRMED",
      "reviewed_requirement_ids": ["bs-unlock"],
      "note": ""
    }
  ]
}
```

Use `CONFIRMED` only when reviewed IDs equal the proposal; `REVISED` when they differ; `AMBIGUOUS` when a determinate target set cannot be justified; `EXCLUDE` for an unusable case. All 30 cases must be accounted for. For `AMBIGUOUS` or `EXCLUDE`, explain why in `note`. In particular, scrutinize the draft's explicit `review_note` fields (bs-q02, bs-q06, bs-q09, mc-q05, mc-q06, mc-q10, ur-q08). Do not change otherwise valid labels to restore a count quota; a four-target case may be valid even though R6 can select only three.

The proposed distribution is 4 zero-target, 14 single-target, 9 two-target, 2 three-target, and 1 four-target cases. These are **not** quotas. The lexical overlap audit found zero exact and zero token-Jaccard ≥0.8 query pairs against prior retrieval/raw development, historical finals, Phase III-D, the new development set, prompt examples, and repository test literals. It cannot prove absence of semantic/template overlap or unknown adapter-training overlap.

I will validate the complete record, preserve proposals beside reviewed IDs, freeze and hash the reviewed dataset, and only then run one blind R0/R5/R6 comparison. Without this independent review, the final retrieval decision, V3, and retraining gate remain unexecuted/inconclusive; no candidate will be promoted or merged.
