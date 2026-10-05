#!/usr/bin/env python3
"""Read-only, pre-inference overlap check for Phase III-I decision proposals."""

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

from phase3i_audit_archive import norm, tokens


def pair(row):
    return norm(row["baseline_requirement"]), norm(row["message"])


def csv_pairs(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        for row in csv.DictReader(source):
            yield norm(row["baseline_requirement"]), norm(row["new_client_message"])


def sft_pairs(path):
    with path.open(encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            row = json.loads(line)
            user = next(item["content"] for item in row["messages"] if item["role"] == "user")
            baseline, message = user.split("\nNew client message: ", 1)
            if not baseline.startswith("Baseline requirement: "):
                raise ValueError(f"Unknown training format: {path}")
            yield norm(baseline.removeprefix("Baseline requirement: ")), norm(message)


def template(message):
    return re.sub(r"\b\d+(?:\.\d+)?\b", "#", message)


def audit(draft_path, archive):
    cases = json.loads(draft_path.read_text(encoding="utf-8"))["cases"]
    sources = {
        "sft_train": sft_pairs(archive / "data/train/qwen_sft_train.jsonl"),
        "csv_train": csv_pairs(archive / "data/train/driftledger_train.csv"),
        "sft_validation": sft_pairs(archive / "data/validation/qwen_sft_val.jsonl"),
        "sft_test": sft_pairs(archive / "data/test/qwen_sft_test.jsonl"),
    }
    results = {}
    for name, iterator in sources.items():
        keys = set(iterator)
        by_baseline = defaultdict(list)
        messages = set()
        templates = set()
        for baseline, message in keys:
            by_baseline[baseline].append(tokens(message))
            messages.add(message)
            templates.add(template(message))
        exact = []
        same_baseline = []
        same_message = []
        template_match = []
        near = []
        for case in cases:
            baseline, message = pair(case)
            words = tokens(message)
            if (baseline, message) in keys:
                exact.append(case["id"])
            if baseline in by_baseline:
                same_baseline.append(case["id"])
                for other in by_baseline[baseline]:
                    union = len(words | other)
                    if union and len(words & other) / union >= 0.8:
                        near.append(case["id"])
                        break
            if message in messages:
                same_message.append(case["id"])
            if template(message) in templates:
                template_match.append(case["id"])
        results[name] = {
            "rows_unique_pairs": len(keys),
            "exact_normalized_pair_case_ids": exact,
            "same_baseline_case_ids": same_baseline,
            "same_message_case_ids": same_message,
            "numeric_mask_message_template_case_ids": template_match,
            "same_baseline_near_message_jaccard_ge_0_8_case_ids": near,
        }
    return {
        "role": "PRE_PREDICTION_CONTAMINATION_SCREEN",
        "scope": "User-supplied V5 archive train/validation/test; other unavailable sources remain unknown",
        "decision_cases": len(cases),
        "sources": results,
        "interpretation": "Exact pair overlap is strong contamination evidence; same baseline, message or template alone are risks, not proof. Archive-to-adapter exact-byte identity is unproven.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--archive", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(audit(args.draft, args.archive), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
