#!/usr/bin/env python3
"""Validate and freeze Phase III-H open-development diagnostic selection."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTION = ROOT / "evaluation/phase_iii_h/diagnostic_selection_v1.json"
LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    selection = json.loads(SELECTION.read_bytes())
    if selection.get("role") != "DEVELOPMENT_NOT_INDEPENDENT":
        raise SystemExit("refusing non-development selection")
    raw_path = ROOT / selection["raw_dev_source"]
    batch_path = ROOT / selection["batch_source"]
    if sha(raw_path) != selection["raw_dev_source_sha256"] or sha(batch_path) != selection["batch_source_sha256"]:
        raise SystemExit("open source dataset hash mismatch")
    raw_cases = {item["id"]: item for item in json.loads(raw_path.read_bytes())["cases"]}
    batch_cases = {item["id"]: item for item in json.loads(batch_path.read_bytes())["cases"]}
    singles = selection["single_case_ids"]
    repeats = selection["single_repeat_ids"]
    batches = selection["batch_case_ids"]
    if (len(singles) != 12 or len(singles) != len(set(singles)) or
            len(repeats) != 3 or len(repeats) != len(set(repeats)) or not set(repeats) <= set(singles) or
            len(batches) != 4 or len(batches) != len(set(batches)) or
            not set(singles) <= set(raw_cases) or not set(batches) <= set(batch_cases)):
        raise SystemExit("invalid selected case IDs/cardinality")
    distribution = Counter(raw_cases[cid]["expected_label"] for cid in singles)
    if set(distribution) != LABELS or any(count != 2 for count in distribution.values()):
        raise SystemExit("single-item label coverage must be two per class")
    if selection["batch_sizes"] != [2, 3, 5]:
        raise SystemExit("unexpected batch sizes")
    for cid in batches:
        case = batch_cases[cid]
        ids = [item["id"] for item in case["requirements"]]
        if len(ids) != 5 or len(ids) != len(set(ids)) or not set(case["expected_affected_ids"]) <= set(ids):
            raise SystemExit("invalid batch case")
    manifest = {
        "role": "DEVELOPMENT_DIAGNOSTIC_FREEZE_NOT_INDEPENDENT",
        "selection_sha256": sha(SELECTION),
        "raw_dev_source_sha256": sha(raw_path),
        "batch_source_sha256": sha(batch_path),
        "single_cases": len(singles),
        "single_repeats": len(repeats),
        "batch_cases": len(batches),
        "class_distribution": dict(sorted(distribution.items())),
        "predictions_at_freeze": 0,
        "closed_iii_d_iii_e_used": False,
        "limitations": ["Development labels only", "Original adapter-training overlap UNKNOWN"],
    }
    args.output.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
