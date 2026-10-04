#!/usr/bin/env python3
"""One-shot R6 retrieval-only run on a previously frozen reviewed dataset."""

import argparse
import hashlib
import json
import time
from pathlib import Path

from phase3e_bm25_dev import summarize
from phase3e_semantic_dev import MODEL, REVISION, dot, encode, rank_select


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("blind report already exists; refusing overwrite or a second run")
    base = Path("evaluation/phase_iii_e")
    freeze = json.loads((base / "independent_freeze_v1.json").read_text())
    r6 = json.loads((base / "r6_development_freeze_v1.json").read_text())
    dataset_path = Path(freeze["dataset"]["path"])
    trail_path = Path(freeze["dataset"]["trail_path"])
    source_path = Path(r6["source"]["path"])
    if digest(dataset_path) != freeze["dataset"]["sha256"]:
        raise SystemExit("reviewed dataset hash mismatch")
    if digest(trail_path) != freeze["dataset"]["trail_sha256"]:
        raise SystemExit("review trail hash mismatch")
    if digest(source_path) != r6["source"]["sha256"]:
        raise SystemExit("R6 scorer source changed after development freeze")
    if r6["identity"] != "R6-S1-t0.45" or MODEL != r6["model"]["repository"] or REVISION != r6["model"]["revision"]:
        raise SystemExit("R6 identity or model revision mismatch")
    cfg = r6["configuration"]
    if cfg["threshold"] != 0.45 or cfg["max_selected"] != 3 or cfg["query_representation"] != "whole client message":
        raise SystemExit("R6 configuration mismatch")
    weights = Path.home() / ".cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots" / REVISION / "model.safetensors"
    if digest(weights) != r6["model"]["weights_sha256"]:
        raise SystemExit("embedding weight hash mismatch")
    data = json.loads(dataset_path.read_text())
    if data.get("role") != "PROTECTED_INDEPENDENT_EVALUATION":
        raise SystemExit("invalid final dataset role")
    trail = json.loads(trail_path.read_text())
    if trail["dataset_sha256"] != digest(dataset_path) or trail["decision_counts"].get("AMBIGUOUS", 0):
        raise SystemExit("invalid review trail")
    texts, indices = [], {}
    for project in data["projects"]:
        for requirement in project["requirements"]:
            indices[(project["id"], "requirement", requirement["id"])] = len(texts)
            texts.append(requirement["title"] + ". " + requirement["description"])
        for query in project["queries"]:
            indices[(project["id"], "query", query["id"])] = len(texts)
            texts.append(query["message"])
    started = time.perf_counter()
    vectors = encode(texts)
    embedding_seconds = time.perf_counter() - started
    rows = []
    scoring_us = []
    for project in data["projects"]:
        for query in project["queries"]:
            score_start = time.perf_counter_ns()
            qvec = vectors[indices[(project["id"], "query", query["id"])]]
            candidates = [{"id": requirement["id"],
                           "score": dot(qvec, vectors[indices[(project["id"], "requirement", requirement["id"])]] )}
                          for requirement in project["requirements"]]
            ranked, selected = rank_select(candidates, 0.45, 3)
            scoring_us.append((time.perf_counter_ns() - score_start) / 1000)
            expected = set(query["expected_requirement_ids"])
            ids = [item["id"] for item in ranked]
            missed = expected - set(selected)
            first_rank = next((index for index, rid in enumerate(ids, 1) if rid in expected), None)
            rows.append({
                "query_id": query["id"], "project_id": project["id"], "project_size": project["size"],
                "categories": query["categories"], "message": query["message"],
                "expected_ids": sorted(expected), "expected_count": len(expected),
                "candidate_count": len(ranked), "ranked": ranked, "selected_ids": selected,
                "missed_ids": sorted(missed),
                "missed_stages": {rid: next(item["decision"] for item in ranked if item["id"] == rid) for rid in missed},
                "false_ids": sorted(set(selected) - expected), "hits": len(expected & set(selected)),
                "hits_at_1": len(expected & set(ids[:1])), "hits_at_3": len(expected & set(ids[:3])),
                "hits_at_k": len(expected & set(ids[:3])),
                "reciprocal_rank": 1 / first_rank if first_rank else 0,
            })
    categories = sorted({category for row in rows for category in row["categories"]})
    report = {
        "identity": "R6-S1-t0.45", "role": "BLIND_FINAL_RETRIEVAL_ONLY",
        "dataset_sha256": digest(dataset_path), "review_trail_sha256": digest(trail_path),
        "source_sha256": digest(source_path), "embedding_weights_sha256": digest(weights),
        "configuration": cfg, "metrics": summarize(rows),
        "by_size": {size: summarize([row for row in rows if row["project_size"] == size]) for size in ("small", "medium", "large")},
        "by_category": {category: summarize([row for row in rows if category in row["categories"]]) for category in categories},
        "embedding_count": len(texts), "embedding_batch_seconds_including_load": embedding_seconds,
        "scoring_us_total_excluding_embedding": sum(scoring_us),
        "scoring_us_max_excluding_embedding": max(scoring_us),
        "results": rows,
        "limitations": ["Retrieval only; no 7B classifier inference.",
                        "Batch embedding time includes model load and is not a per-request production latency measurement."]}
    with args.output.open("x") as file:
        json.dump(report, file, indent=2)
        file.write("\n")
    print(json.dumps({"dataset_sha256": report["dataset_sha256"], "metrics": report["metrics"]}))


if __name__ == "__main__":
    main()
