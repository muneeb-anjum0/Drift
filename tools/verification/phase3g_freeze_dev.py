#!/usr/bin/env python3
"""Validate and freeze development-only pipeline labels before predictions."""

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
CLOSED = (
    "evaluation/phase_iii_d/retrieval_independent_v1.json",
    "evaluation/phase_iii_e/retrieval_independent_v1.json",
)


def messages(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"message", "client_message", "new_client_message"} and isinstance(value, str):
                yield value
            elif isinstance(value, (dict, list)):
                yield from messages(value)
    elif isinstance(node, list):
        for value in node:
            yield from messages(value)


def terms(value):
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    if data.get("role") != "DEVELOPMENT_NOT_FINAL":
        raise SystemExit("refusing non-development dataset")
    source = {c["id"]: c for c in json.loads((ROOT / "evaluation/datasets/drift_raw_dev_v1.json").read_bytes())["cases"]}
    seen = set()
    for case in data["cases"]:
        cid = case["id"]
        if cid in seen or not case["message"].strip() or case.get("ambiguous"):
            raise SystemExit("duplicate, blank, or unresolved case")
        seen.add(cid)
        ids = [r["id"] for r in case["requirements"]]
        if len(ids) != len(set(ids)) or not ids or not all(r["text"].strip() for r in case["requirements"]):
            raise SystemExit("invalid requirements")
        expected = case["expected_affected_ids"]
        labels = case["expected_labels"]
        if len(expected) != len(set(expected)) or not set(expected) <= set(ids) or set(labels) != set(expected):
            raise SystemExit("affected IDs and labels mismatch")
        if any(label not in LABELS for label in labels.values()):
            raise SystemExit("invalid six-class label")
        if "source_case" in case:
            original = source[case["source_case"]]
            if case["message"] != original["client_message"] or len(expected) != 1:
                raise SystemExit("raw-development source message mismatch")
            target = next(r for r in case["requirements"] if r["id"] == expected[0])
            if target["text"] != original["baseline_requirement"] or labels[expected[0]] != original["expected_label"]:
                raise SystemExit("raw-development source requirement/label mismatch")
    query_terms = [terms(case["message"]) for case in data["cases"]]
    closed_counts = {}
    for relative in CLOSED:
        other = [terms(text) for text in messages(json.loads((ROOT / relative).read_bytes()))]
        scores = [len(a & b) / len(a | b) if a | b else 1 for a in query_terms for b in other]
        closed_counts[relative] = {"source_queries": len(other), "exact_pairs": sum(score == 1 for score in scores),
                                   "near_pairs_jaccard_ge_0_8": sum(score >= 0.8 for score in scores),
                                   "max_token_jaccard": max(scores, default=0)}
        if any(score >= 0.8 for score in scores):
            raise SystemExit("closed dataset query overlap requires review")
    manifest = {"role": "DEVELOPMENT_LABEL_FREEZE", "dataset": str(args.dataset),
                "dataset_sha256": hashlib.sha256(raw).hexdigest(), "case_count": len(seen),
                "affected_pair_count": sum(len(c["expected_affected_ids"]) for c in data["cases"]),
                "zero_target_count": sum(not c["expected_affected_ids"] for c in data["cases"]),
                "review_status": "AUTHOR_LABELS_NOT_INDEPENDENTLY_REVIEWED",
                "closed_overlap_aggregate_only": closed_counts,
                "predictions_at_freeze": 0,
                "limitations": ["Not an independent holdout", "Raw-development overlap intentional for four positive cases",
                                "Original adapter-training overlap UNKNOWN", "Closed cases not emitted or inspected"]}
    args.output.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({key: manifest[key] for key in ("dataset_sha256", "case_count", "affected_pair_count", "closed_overlap_aggregate_only")}, indent=2))


if __name__ == "__main__":
    main()
