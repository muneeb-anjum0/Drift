#!/usr/bin/env python3
"""Post-run analysis only: frozen Phase III-E R0/R5/R6 retrieval reports."""

import argparse
import collections
import hashlib
import json
import random
from pathlib import Path

from phase3e_bm25_dev import summarize
from phase3e_dev_comparison import baseline_rows


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def effects(left, right):
    keys = ("selected_hits", "false_exposures", "hard_negative_exposed", "mean_selected")
    result = {key: left[key] - right[key] for key in keys}
    result["all_target_reach_count"] = left["all_target_reach"][0] - right["all_target_reach"][0]
    result["at_least_one_reach_count"] = left["at_least_one_reach"][0] - right["at_least_one_reach"][0]
    result["micro_recall_percentage_points"] = 100 * (left["micro_recall"] - right["micro_recall"]) if left["micro_recall"] is not None else None
    return result


def percentile(values, fraction):
    values = sorted(values)
    return values[round((len(values) - 1) * fraction)]


def paired_bootstrap(r6_rows, baseline_rows_by_id):
    generator = random.Random(314159)
    ids = [row["query_id"] for row in r6_rows]
    r6_by_id = {row["query_id"]: row for row in r6_rows}
    recall_deltas, false_deltas = [], []
    for _ in range(10000):
        sample = [generator.choice(ids) for _ in ids]
        expected = sum(r6_by_id[key]["expected_count"] for key in sample)
        if not expected:
            continue
        recall_deltas.append((sum(r6_by_id[key]["hits"] - baseline_rows_by_id[key]["hits"] for key in sample) / expected) * 100)
        false_deltas.append(sum(len(r6_by_id[key]["false_ids"]) - len(baseline_rows_by_id[key]["false_ids"]) for key in sample))
    return {"resamples": len(recall_deltas), "seed": 314159,
            "recall_difference_percentage_points_95pct_percentile": [percentile(recall_deltas, 0.025), percentile(recall_deltas, 0.975)],
            "false_exposure_difference_count_95pct_percentile": [percentile(false_deltas, 0.025), percentile(false_deltas, 0.975)],
            "note": "Exploratory paired query bootstrap; small synthetic domain sample and overlapping target links limit inference."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("analysis output exists; refusing overwrite")
    base = Path("evaluation/phase_iii_e")
    freeze = json.loads((base / "independent_freeze_v1.json").read_text())
    development = json.loads((base / "r6_development_freeze_v1.json").read_text())
    dataset_path = Path(freeze["dataset"]["path"])
    if digest(dataset_path) != freeze["dataset"]["sha256"]:
        raise SystemExit("frozen dataset hash mismatch")
    dataset = json.loads(dataset_path.read_text())
    paths = {"R0": base / "R0_independent_v1.json", "R5": base / "R5_independent_v1.json", "R6": base / "R6_independent_v1.json"}
    reports = {name: json.loads(path.read_text()) for name, path in paths.items()}
    for name in ("R0", "R5"):
        report = reports[name]
        if report["dataset"]["sha256"] != digest(dataset_path):
            raise SystemExit(f"{name} did not use frozen dataset bytes")
        if report["configuration"]["threshold"] != 0.25 or report["configuration"]["max_selected"] != 3:
            raise SystemExit(f"{name} configuration changed")
    if reports["R6"]["dataset_sha256"] != digest(dataset_path):
        raise SystemExit("R6 did not use frozen dataset bytes")
    if reports["R6"]["source_sha256"] != development["source"]["sha256"]:
        raise SystemExit("R6 scorer source changed")
    if reports["R6"]["embedding_weights_sha256"] != development["model"]["weights_sha256"]:
        raise SystemExit("R6 model weights changed")
    rows = {"R0": baseline_rows(dataset, reports["R0"]),
            "R5": baseline_rows(dataset, reports["R5"]),
            "R6": reports["R6"]["results"]}
    expected_ids = {q["id"] for p in dataset["projects"] for q in p["queries"]}
    for name, group in rows.items():
        if len(group) != len(expected_ids) or {r["query_id"] for r in group} != expected_ids:
            raise SystemExit(f"{name} case coverage mismatch")
    candidate_summaries = {}
    for name, group in rows.items():
        categories = sorted({category for row in group for category in row["categories"]})
        ledger = [{"case_id": row["query_id"], "project_id": row["project_id"],
                   "project_size": row["project_size"], "categories": row["categories"],
                   "missed_ids": row["missed_ids"], "false_ids": row["false_ids"],
                   "missed_stages": row["missed_stages"]}
                  for row in group if row["missed_ids"] or row["false_ids"]]
        candidate_summaries[name] = {
            "metrics": summarize(group),
            "by_size": {size: summarize([row for row in group if row["project_size"] == size]) for size in ("small", "medium", "large")},
            "by_category": {category: summarize([row for row in group if category in row["categories"]]) for category in categories},
            "missed_stage_counts": dict(collections.Counter(stage for row in group for stage in row["missed_stages"].values())),
            "error_ledger": ledger,
        }
    r6_metrics = candidate_summaries["R6"]["metrics"]
    r5_metrics = candidate_summaries["R5"]["metrics"]
    gates = development["existing_retrieval_gates_unchanged"]
    overall_pass = r6_metrics["micro_recall"] >= gates["overall_micro_recall_minimum"]
    sizes_pass = all(value["micro_recall"] >= gates["per_project_size_micro_recall_minimum"]
                     for value in candidate_summaries["R6"]["by_size"].values())
    improves_r5 = r6_metrics["selected_hits"] > r5_metrics["selected_hits"]
    false_pass = r6_metrics["false_exposures"] <= r5_metrics["false_exposures"]
    negatives_pass = r6_metrics["hard_negative_exposed"] <= r5_metrics["hard_negative_exposed"]
    supported = all((overall_pass, sizes_pass, improves_r5, false_pass, negatives_pass))
    comparison = {}
    for baseline in ("R0", "R5"):
        comparison["R6_minus_" + baseline] = {
            "overall": effects(r6_metrics, candidate_summaries[baseline]["metrics"]),
            "by_size": {size: effects(candidate_summaries["R6"]["by_size"][size], candidate_summaries[baseline]["by_size"][size])
                        for size in ("small", "medium", "large")},
            "by_category": {category: effects(candidate_summaries["R6"]["by_category"][category], candidate_summaries[baseline]["by_category"][category])
                            for category in candidate_summaries["R6"]["by_category"]},
            "uncertainty": paired_bootstrap(rows["R6"], {row["query_id"]: row for row in rows[baseline]}),
        }
    output = {
        "role": "POST_FREEZE_BLIND_ANALYSIS", "dataset_sha256": digest(dataset_path),
        "report_sha256": {name: digest(path) for name, path in paths.items()},
        "candidate_summaries": candidate_summaries, "effects": comparison,
        "predeclared_gate_checks": {"overall_recall": overall_pass, "each_project_size_recall": sizes_pass,
                                    "more_hits_than_R5": improves_r5, "false_exposure_non_regression": false_pass,
                                    "hard_negative_non_regression": negatives_pass},
        "generalisation_decision": "R6 GENERALISATION SUPPORTED" if supported else "R6 GENERALISATION NOT SUPPORTED",
        "v3_decision": "NOT EXECUTED / INCONCLUSIVE" if not supported else "PENDING_DOWNSTREAM_ISOLATION",
        "retraining_gate_decision": "NOT YET JUSTIFIED" if not supported else "PENDING_DOWNSTREAM_ISOLATION",
        "limitations": ["Only 30 synthetic cases in three domains; reviewed labels are independent but real-user transfer remains unproven.",
                        "The one four-target case cannot be fully reached by any candidate with a frozen cap of three.",
                        "Retrieval timing is observational and Go versus Python harness times are not directly comparable.",
                        "Original adapter-training overlap remains unknown."],
    }
    with args.output.open("x") as file:
        json.dump(output, file, indent=2)
        file.write("\n")
    print(json.dumps({"decision": output["generalisation_decision"], "gates": output["predeclared_gate_checks"],
                      "metrics": {key: value["metrics"] for key, value in candidate_summaries.items()}}, indent=2))


if __name__ == "__main__":
    main()
