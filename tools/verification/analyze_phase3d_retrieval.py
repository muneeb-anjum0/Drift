"""Analyze a frozen, paired Phase III-D retrieval comparison without tuning it."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from collections import defaultdict
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summarize(rows: list[dict]) -> dict:
    expected = sum(len(row["expected"]) for row in rows)
    hits = sum(len(row["expected"] & row["selected"]) for row in rows)
    positives = [row for row in rows if row["expected"]]
    all_reached = sum(row["expected"] <= row["selected"] for row in positives)
    any_reached = sum(bool(row["expected"] & row["selected"]) for row in positives)
    false_exposures = sum(len(row["selected"] - row["expected"]) for row in rows)
    hard_negatives = [row for row in rows if not row["expected"]]
    multi = [row for row in rows if len(row["expected"]) > 1]
    return {
        "queries": len(rows),
        "positive_queries": len(positives),
        "expected_links": expected,
        "expected_hits": hits,
        "model_input_micro_recall": hits / expected if expected else None,
        "all_target_queries": all_reached,
        "any_target_queries": any_reached,
        "false_exposures": false_exposures,
        "selected_requirements": sum(len(row["selected"]) for row in rows),
        "average_selected": sum(len(row["selected"]) for row in rows) / len(rows) if rows else None,
        "zero_target_queries": len(hard_negatives),
        "zero_target_queries_with_selection": sum(bool(row["selected"]) for row in hard_negatives),
        "multi_target_queries": len(multi),
        "multi_all_reached": sum(row["expected"] <= row["selected"] for row in multi),
        "multi_some_not_all": sum(bool(row["expected"] & row["selected"]) and not row["expected"] <= row["selected"] for row in multi),
        "multi_none_reached": sum(not row["expected"] & row["selected"] for row in multi),
        "multi_false_exposures": sum(len(row["selected"] - row["expected"]) for row in multi),
    }


def interval(values: list[float]) -> list[float]:
    values.sort()
    return [values[int(0.025 * len(values))], values[int(0.975 * len(values))]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--comparison-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("analysis target already exists")
    dataset = json.loads(args.dataset.read_text())
    comparison = json.loads((args.comparison_dir / "comparison.json").read_text())
    if dataset["role"] != "PROTECTED_INDEPENDENT_EVALUATION" or sha256(args.dataset) != comparison["dataset_sha256"]:
        raise ValueError("dataset identity mismatch")
    reports = {name: json.loads((args.comparison_dir / f"{name}.json").read_text()) for name in ("R0", "R5")}
    queries = {q["id"]: (p, q) for p in dataset["projects"] for q in p["queries"]}
    result_maps = {name: {r["query_id"]: r for r in report["results"]} for name, report in reports.items()}
    if any(set(results) != set(queries) for results in result_maps.values()):
        raise ValueError("report case IDs do not match frozen dataset")
    rows = {}
    for name in ("R0", "R5"):
        rows[name] = []
        for qid, (project, query) in queries.items():
            result = result_maps[name][qid]
            if result["project_id"] != project["id"] or result["expected_requirement_ids"] != query["expected_requirement_ids"]:
                raise ValueError(f"{name} label mismatch on {qid}")
            rows[name].append({
                "id": qid,
                "project": project["id"],
                "categories": query["categories"],
                "expected": set(query["expected_requirement_ids"]),
                "selected": set(result["selected_requirement_ids"]),
                "candidates": result["candidate_count"],
            })
    by_category = defaultdict(lambda: {"R0": [], "R5": []})
    by_project = defaultdict(lambda: {"R0": [], "R5": []})
    case_changes = []
    for r0, r5 in zip(rows["R0"], rows["R5"], strict=True):
        for name, row in (("R0", r0), ("R5", r5)):
            by_project[row["project"]][name].append(row)
            for category in row["categories"]:
                by_category[category][name].append(row)
        if r0["selected"] != r5["selected"]:
            case_changes.append({
                "case_id": r0["id"],
                "expected": sorted(r0["expected"]),
                "R0_selected": sorted(r0["selected"]),
                "R5_selected": sorted(r5["selected"]),
                "R0_hits": sorted(r0["selected"] & r0["expected"]),
                "R5_hits": sorted(r5["selected"] & r5["expected"]),
            })
    overall = {name: summarize(rows[name]) for name in ("R0", "R5")}
    deltas = {
        "expected_hits": overall["R5"]["expected_hits"] - overall["R0"]["expected_hits"],
        "all_target_queries": overall["R5"]["all_target_queries"] - overall["R0"]["all_target_queries"],
        "false_exposures": overall["R5"]["false_exposures"] - overall["R0"]["false_exposures"],
        "average_selected": overall["R5"]["average_selected"] - overall["R0"]["average_selected"],
        "zero_target_queries_with_selection": overall["R5"]["zero_target_queries_with_selection"] - overall["R0"]["zero_target_queries_with_selection"],
    }
    project_metrics = {project: {name: summarize(group[name]) for name in ("R0", "R5")} for project, group in sorted(by_project.items())}
    primary = deltas["expected_hits"] > 0 and deltas["all_target_queries"] > 0
    precision = deltas["false_exposures"] <= deltas["expected_hits"] and deltas["average_selected"] <= 0.3
    safety = deltas["zero_target_queries_with_selection"] <= 0 and all(
        metrics["R5"]["expected_hits"] >= metrics["R0"]["expected_hits"] - 1 for metrics in project_metrics.values()
    )
    decision = "R5 GENERALISATION SUPPORTED" if primary and precision and safety else "R5 GENERALISATION NOT SUPPORTED"
    rng = random.Random(3104)
    boot = {"expected_hit_rate_delta": [], "all_target_reach_rate_delta": [], "false_exposure_per_query_delta": []}
    for _ in range(10000):
        indices = [rng.randrange(len(queries)) for _ in queries]
        paired = {name: [rows[name][i] for i in indices] for name in ("R0", "R5")}
        summaries = {name: summarize(paired[name]) for name in ("R0", "R5")}
        if summaries["R0"]["expected_links"]:
            boot["expected_hit_rate_delta"].append(summaries["R5"]["model_input_micro_recall"] - summaries["R0"]["model_input_micro_recall"])
        for name, key, denom in (("all_target_reach_rate_delta", "all_target_queries", "positive_queries"), ("false_exposure_per_query_delta", "false_exposures", "queries")):
            if summaries["R0"][denom]:
                boot[name].append((summaries["R5"][key] - summaries["R0"][key]) / summaries["R0"][denom])
    output = {
        "dataset_sha256": comparison["dataset_sha256"],
        "report_sha256": {name: sha256(args.comparison_dir / f"{name}.json") for name in ("R0", "R5")},
        "gate_sha256": sha256(Path("evaluation/phase_iii_d/gates_v1.json")),
        "overall": overall,
        "deltas_R5_minus_R0": deltas,
        "by_category": {category: {name: summarize(group[name]) for name in ("R0", "R5")} for category, group in sorted(by_category.items())},
        "by_project": project_metrics,
        "case_changes": case_changes,
        "paired_bootstrap_95_percentile_intervals": {key: interval(values) for key, values in boot.items()},
        "bootstrap_method": "10000 paired query resamples, fixed seed 3104; descriptive, not a significance test",
        "gate_checks": {"primary": primary, "precision_cost": precision, "safety": safety},
        "decision": decision,
        "limitation": "Only four medium-sized synthetic projects; human-review independence and adapter-training overlap cannot be independently verified.",
    }
    with args.output.open("x") as stream:
        json.dump(output, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"decision": decision, "deltas": deltas, "case_changes": len(case_changes)}))


if __name__ == "__main__":
    main()
