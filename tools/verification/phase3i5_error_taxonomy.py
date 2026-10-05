#!/usr/bin/env python3
"""Classify every raw error by observed truth/prediction boundary, not guessed cause."""

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

from phase3i5_score_raw import save_new


def primary_family(row):
    truth, predicted = row["truth"], row["predicted"]
    if predicted is None:
        return "OTHER", "Structurally invalid raw response; this is not a semantic-boundary claim."
    if truth == "removed" and predicted == "modified":
        return "REMOVAL_AS_MODIFICATION", "Explicit removal was labeled as a surviving-behavior modification."
    if truth == "modified" and predicted == "removed":
        return "MODIFICATION_AS_REMOVAL", "A surviving capability was labeled as eliminated."
    if truth == "contradiction":
        return "CONTRADICTION_MISSED", "An incompatible explicit invariant was not labeled contradiction."
    if predicted == "contradiction":
        return "FALSE_CONTRADICTION", "No reviewed explicit-invariant contradiction was present."
    if truth == "ambiguous":
        return "AMBIGUITY_MISSED", "Reviewed intent was unresolved but received a definite label."
    if predicted == "ambiguous":
        return "FALSE_AMBIGUITY", "Reviewed intent was definite but labeled ambiguous."
    if truth == "added":
        return "ADDITION_BOUNDARY_ERROR", "Reviewed addition was assigned another class."
    if truth == "unchanged":
        return "UNCHANGED_BOUNDARY_ERROR", "Reviewed unchanged behavior was assigned another class."
    return "OTHER", f"{truth} was labeled {predicted}; no narrower preregistered primary family fits."


def analyze(ledger, robustness):
    relation_tags = defaultdict(set)
    relation_to_tag = {"paraphrase_invariance": "PARAPHRASE_INSTABILITY",
                       "distractor_invariance": "DISTRACTOR_SENSITIVITY",
                       "order_invariance": "ORDER_SENSITIVITY"}
    for relation in robustness["relations"]:
        if relation.get("eligible") and not relation.get("metamorphic_consistent"):
            tag = relation_to_tag.get(relation["type"])
            if tag:
                for case_id in relation["case_ids"]:
                    relation_tags[case_id].add(tag)
    rows = []
    counts = Counter()
    for error in ledger["errors"]:
        family, explanation = primary_family(error)
        counts[family] += 1
        rows.append({"case_id": error["case_id"], "truth": error["truth"],
                     "predicted": error["predicted"], "primary_family": family,
                     "boundary_explanation": explanation,
                     "phenomena_present_not_proven_causal": error["phenomenon_tags"],
                     "observed_relation_instability": sorted(relation_tags[error["case_id"]]),
                     "difficulty_tier": error["difficulty_tier"], "domain": error["domain"]})
    if len(rows) != len({row["case_id"] for row in rows}):
        raise ValueError("duplicate error IDs")
    return {"role": "PHASE_III_I_5_POST_HOC_RAW_ERROR_TAXONOMY",
            "dataset_sha256": ledger["dataset_sha256"], "error_count": len(rows),
            "primary_family_counts": dict(sorted(counts.items())),
            "causal_warning": "Boundary families describe observed labels; phenomenon tags are exposure context, not established causes.",
            "rows": rows}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--error-ledger", type=Path, required=True)
    parser.add_argument("--robustness", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    ledger = json.loads(args.error_ledger.read_text())
    robustness = json.loads(args.robustness.read_text())
    if ledger["dataset_sha256"] != robustness["dataset_sha256"]:
        raise ValueError("ledger/robustness corpus mismatch")
    result = analyze(ledger, robustness)
    save_new(args.out, result)
    print(json.dumps({"error_count": result["error_count"],
                      "primary_family_counts": result["primary_family_counts"]}, indent=2))


if __name__ == "__main__":
    main()
