#!/usr/bin/env python3
"""Predeclared development-only R6-H1 grid over frozen R5/S1 scores."""

import argparse
import hashlib
import json
from pathlib import Path

from phase3e_bm25_dev import require_development, summarize


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--r5-trace", type=Path, required=True)
    parser.add_argument("--semantic-trace", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    require_development(data, hashlib.sha256(raw).hexdigest())
    digest = hashlib.sha256(raw).hexdigest()
    r5 = json.loads(args.r5_trace.read_text())
    sem = json.loads(args.semantic_trace.read_text())
    if r5["dataset"]["sha256"] != digest or sem["dataset_sha256"] != digest:
        raise SystemExit("trace/dataset hash mismatch")
    lexical = {r["query_id"]: r for r in r5["results"]}
    semantic = {r["query_id"]: r for r in sem["thresholds"]["0.25"]["results"]}
    reports = {}
    for alpha in (0.25, 0.50, 0.75):
        for threshold in (0.25, 0.35, 0.45):
            rows = []
            for project in data["projects"]:
                for query in project["queries"]:
                    query_id = query["id"]
                    lexical_scores = {item["id"]: item["score"] for item in lexical[query_id]["ranked_requirements"]}
                    semantic_scores = {item["id"]: item["score"] for item in semantic[query_id]["ranked"]}
                    ranked = [{"id": item["id"], "lexical_score": lexical_scores[item["id"]],
                               "semantic_score": semantic_scores[item["id"]],
                               "score": alpha * lexical_scores[item["id"]] + (1 - alpha) * max(0, semantic_scores[item["id"]])}
                              for item in project["requirements"]]
                    ranked.sort(key=lambda item: -item["score"])
                    selected = []
                    for rank, item in enumerate(ranked, 1):
                        item["rank"] = rank
                        item["passed_threshold"] = item["score"] >= threshold
                        item["selected"] = item["passed_threshold"] and len(selected) < 3
                        item["decision"] = "SELECTED" if item["selected"] else ("BELOW_THRESHOLD" if not item["passed_threshold"] else "TOP_K_EXCLUDED")
                        if item["selected"]:
                            selected.append(item["id"])
                    expected = set(query["expected_requirement_ids"])
                    ids = [item["id"] for item in ranked]
                    first_rank = next((i for i, rid in enumerate(ids, 1) if rid in expected), None)
                    misses = expected - set(selected)
                    rows.append({
                        "query_id": query_id, "project_id": project["id"], "project_size": project["size"],
                        "categories": query.get("categories", ["legacy_unclassified"]),
                        "message": query["message"], "expected_ids": sorted(expected), "expected_count": len(expected),
                        "candidate_count": len(ranked), "ranked": ranked, "selected_ids": selected,
                        "missed_ids": sorted(misses),
                        "missed_stages": {rid: next(item["decision"] for item in ranked if item["id"] == rid) for rid in misses},
                        "false_ids": sorted(set(selected) - expected), "hits": len(expected & set(selected)),
                        "hits_at_1": len(expected & set(ids[:1])), "hits_at_3": len(expected & set(ids[:3])),
                        "hits_at_k": len(expected & set(ids[:3])), "reciprocal_rank": 1 / first_rank if first_rank else 0,
                    })
            categories = sorted({category for row in rows for category in row["categories"]})
            reports[f"a{alpha}-t{threshold}"] = {
                "alpha": alpha, "threshold": threshold, "metrics": summarize(rows),
                "by_size": {size: summarize([r for r in rows if r["project_size"] == size]) for size in ("small", "medium", "large")},
                "by_category": {category: summarize([r for r in rows if category in r["categories"]]) for category in categories},
                "results": rows,
            }
    report = {"identity": "R6-H1", "role": "DEVELOPMENT_EXPERIMENT", "dataset_sha256": digest,
              "method": "alpha*R5_score + (1-alpha)*max(0,S1_cosine); no specific gate; stable source-order ties; cap=3",
              "grid": reports}
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: value["metrics"] for key, value in reports.items()}, indent=2))


if __name__ == "__main__":
    main()
