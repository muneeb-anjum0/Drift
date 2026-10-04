#!/usr/bin/env python3
"""Summarize development retrieval evidence without reading closed test cases."""

import argparse
import hashlib
import json
from pathlib import Path

from phase3e_bm25_dev import require_development, summarize


def baseline_rows(dataset, report):
    categories = {q["id"]: q.get("categories", ["legacy_unclassified"])
                  for p in dataset["projects"] for q in p["queries"]}
    rows = []
    for r in report["results"]:
        expected = set(r["expected_requirement_ids"])
        selected = set(r["selected_requirement_ids"])
        misses = expected - selected
        rows.append({
            "query_id": r["query_id"], "project_id": r["project_id"], "project_size": r["project_size"],
            "categories": categories[r["query_id"]], "expected_count": len(expected),
            "selected_ids": r["selected_requirement_ids"], "candidate_count": r["candidate_count"],
            "hits": r["model_hits"], "hits_at_1": r["hits_at_1"],
            "hits_at_3": r["hits_at_3"], "hits_at_k": r["hits_at_k"],
            "reciprocal_rank": r["reciprocal_rank"],
            "false_ids": sorted(selected - expected), "missed_ids": sorted(misses),
            "missed_stages": {rid: next(x["decision"] for x in r["ranked_requirements"] if x["id"] == rid) for rid in misses},
        })
    return rows


def digest_check(dataset_path, report, label):
    digest = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    actual = report.get("dataset_sha256", report.get("dataset", {}).get("sha256"))
    if actual != digest:
        raise SystemExit(f"{label} does not match dataset hash")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--r0", type=Path, required=True)
    parser.add_argument("--r5", type=Path, required=True)
    parser.add_argument("--s1", type=Path, required=True)
    parser.add_argument("--q2", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    dataset = json.loads(args.dataset.read_text())
    require_development(dataset, hashlib.sha256(args.dataset.read_bytes()).hexdigest())
    reports = {key: json.loads(getattr(args, key).read_text()) for key in ("r0", "r5", "s1", "q2")}
    for key, report in reports.items():
        digest_check(args.dataset, report, key)
    candidates = {
        "R0": baseline_rows(dataset, reports["r0"]),
        "R5": baseline_rows(dataset, reports["r5"]),
        "R6-S1-t0.45": reports["s1"]["thresholds"]["0.45"]["results"],
        "R6-Q2-t0.45": reports["q2"]["thresholds"]["0.45"]["results"],
    }
    output = {}
    for name, rows in candidates.items():
        sizes = sorted({r["project_size"] for r in rows})
        categories = sorted({c for r in rows for c in r["categories"]})
        output[name] = {
            "metrics": summarize(rows),
            "by_size": {size: summarize([r for r in rows if r["project_size"] == size]) for size in sizes},
            "by_category": {category: summarize([r for r in rows if category in r["categories"]]) for category in categories},
            "error_ledger": [{"case_id": r["query_id"], "project_id": r["project_id"],
                              "project_size": r["project_size"], "categories": r["categories"],
                              "missed_ids": r["missed_ids"], "false_ids": r["false_ids"],
                              "missed_stages": r["missed_stages"]}
                             for r in rows if r["missed_ids"] or r["false_ids"]],
        }
    args.output.write_text(json.dumps({"role": "DEVELOPMENT_COMPARISON", "dataset_sha256": hashlib.sha256(args.dataset.read_bytes()).hexdigest(),
                                        "candidates": output}, indent=2) + "\n")
    print(json.dumps({key: value["metrics"] for key, value in output.items()}, indent=2))


if __name__ == "__main__":
    main()
