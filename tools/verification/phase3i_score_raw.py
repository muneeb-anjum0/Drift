#!/usr/bin/env python3
"""Score frozen Phase III-I raw singleton predictions without changing truth."""

import argparse
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

from phase3h_contracts import LABELS
from phase3i_run_oracle import DATASET, SHA, case_path

DRIFT = {"added", "modified", "removed", "contradiction"}


def ratio(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def metrics(rows):
    labels = tuple(LABELS)
    matrix = {truth: {predicted: 0 for predicted in labels} for truth in labels}
    support = Counter()
    predictions = Counter()
    invalid = Counter()
    correct = 0
    for row in rows:
        truth = row["truth"]
        predicted = row["predicted"]
        support[truth] += 1
        if predicted is None:
            invalid[row["structural_category"]] += 1
        else:
            matrix[truth][predicted] += 1
            predictions[predicted] += 1
        correct += predicted == truth
    per_class = {}
    for label in labels:
        true_positive = matrix[label][label]
        false_positive = sum(matrix[other][label] for other in labels if other != label)
        false_negative = support[label] - true_positive
        precision = ratio(true_positive, true_positive + false_positive)
        recall = ratio(true_positive, support[label])
        f1 = ratio(2 * precision * recall, precision + recall)
        per_class[label] = {
            "support": support[label], "correct": true_positive,
            "false_positive": false_positive, "false_negative_including_invalid": false_negative,
            "precision": precision, "recall": recall, "f1": f1,
        }
    confusion_pairs = Counter((row["truth"], row["predicted"] or "INVALID")
                              for row in rows if row["predicted"] != row["truth"])
    critical = {
        "actual_drift_predicted_unchanged": sum(row["truth"] in DRIFT and row["predicted"] == "unchanged"
                                                for row in rows),
        "unchanged_predicted_drift": sum(row["truth"] == "unchanged" and row["predicted"] in DRIFT
                                          for row in rows),
        "contradiction_missed": sum(row["truth"] == "contradiction" and
                                     row["predicted"] != "contradiction" for row in rows),
        "contradiction_overpredicted": sum(row["truth"] != "contradiction" and
                                           row["predicted"] == "contradiction" for row in rows),
        "ambiguous_overpredicted": sum(row["truth"] != "ambiguous" and
                                       row["predicted"] == "ambiguous" for row in rows),
        "added_or_removed_predicted_modified": sum(row["truth"] in {"added", "removed"} and
                                                    row["predicted"] == "modified" for row in rows),
    }
    return {
        "role": "PHASE_III_I_RAW_ORACLE_SCORE",
        "dataset_sha256": SHA["dataset"],
        "total_cases": len(rows), "valid_cases": len(rows) - sum(invalid.values()),
        "invalid_cases": sum(invalid.values()), "invalid_categories": dict(sorted(invalid.items())),
        "correct_cases": correct, "accuracy": ratio(correct, len(rows)),
        "macro_precision": sum(item["precision"] for item in per_class.values()) / len(labels),
        "macro_recall": sum(item["recall"] for item in per_class.values()) / len(labels),
        "macro_f1": sum(item["f1"] for item in per_class.values()) / len(labels),
        "per_class": per_class, "confusion_matrix": matrix,
        "prediction_distribution": {label: predictions[label] for label in labels},
        "confusion_pairs_ranked": [{"truth": truth, "predicted": predicted, "count": count}
                                   for (truth, predicted), count in
                                   sorted(confusion_pairs.items(), key=lambda item: (-item[1], item[0]))],
        "critical_errors": critical,
        "confidence_calibration": "NOT_MEASURED",
    }


def load_rows(result_dir):
    cases = json.loads(DATASET.read_text())["cases"]
    expected_ids = {case["id"] for case in cases}
    files = {path.stem for path in result_dir.glob("*.json") if path.name != "manifest.json"}
    if files != expected_ids:
        raise RuntimeError(f"incomplete or unexpected case files: missing={sorted(expected_ids-files)} "
                           f"extra={sorted(files-expected_ids)}")
    rows = []
    for case in cases:
        result = json.loads(case_path(result_dir, case["id"]).read_text())
        if (result.get("case_id") != case["id"] or
                result.get("dataset_sha256") != SHA["dataset"] or
                result.get("baseline_requirement") != case["baseline_requirement"] or
                result.get("message") != case["message"] or
                result.get("reviewed_ground_truth") != case["review"]["reviewed_label"]):
            raise RuntimeError(f"result provenance mismatch: {case['id']}")
        predicted = result.get("raw_predicted_class")
        validation = result.get("validation", {})
        if predicted not in (None, *LABELS):
            raise RuntimeError(f"invalid predicted class: {case['id']}")
        if validation.get("valid") != (predicted is not None):
            raise RuntimeError(f"prediction/structure mismatch: {case['id']}")
        if result.get("runtime_error"):
            raise RuntimeError(f"runtime error remains: {case['id']}")
        rows.append({
            "case_id": case["id"], "domain": case["domain"],
            "truth": case["review"]["reviewed_label"], "predicted": predicted,
            "categories": case["categories"], "structural_category": validation.get("primary", "UNKNOWN"),
            "confidence": validation.get("parsed", {}).get("confidence") if validation.get("valid") else None,
            "latency_seconds": result["latency_seconds"],
            "prompt_tokens": result["prompt_tokens"],
            "generated_tokens": result.get("raw_response", {}).get("tokens_predicted"),
            "baseline_requirement": case["baseline_requirement"], "message": case["message"],
            "model_reasoning": validation.get("parsed", {}).get("reasoning") if validation.get("valid") else None,
        })
    return rows


def category_results(rows):
    grouped = defaultdict(list)
    for row in rows:
        for category in set(row["categories"]):
            grouped[category].append(row)
    return {
        "role": "PHASE_III_I_CATEGORY_RESULTS",
        "dataset_sha256": SHA["dataset"],
        "categories": {
            category: {
                "support": len(members),
                "correct": sum(row["predicted"] == row["truth"] for row in members),
                "accuracy": ratio(sum(row["predicted"] == row["truth"] for row in members), len(members)),
                "error_case_ids": [row["case_id"] for row in members if row["predicted"] != row["truth"]],
            }
            for category, members in sorted(grouped.items())
        },
    }


def save_new(path, value):
    body = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(descriptor, "wb") as target:
        target.write(body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    rows = load_rows(args.results)
    errors = [row for row in rows if row["predicted"] != row["truth"]]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    save_new(args.output_dir / "raw_metrics_v1.json", metrics(rows))
    save_new(args.output_dir / "category_results_v1.json", category_results(rows))
    save_new(args.output_dir / "raw_error_ledger_v1.json", {
        "role": "PHASE_III_I_RAW_ERROR_LEDGER", "dataset_sha256": SHA["dataset"], "errors": errors,
    })
    print(f"scored {len(rows)} cases; {len(errors)} errors", flush=True)


if __name__ == "__main__":
    main()
