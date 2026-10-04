#!/usr/bin/env python3
"""Development-only R6-L1 prototype. Never accepts a closed/final dataset."""

import argparse
import collections
import hashlib
import json
import math
import time
from pathlib import Path


def ratio(top, bottom):
    return top / bottom if bottom else None


def require_development(data, digest):
    legacy_v2 = "a000bc087bf3d1455f98600a76648a078315e8d7a4377e1c32f8ed0185971ae9"
    if data.get("role") != "DEVELOPMENT_NOT_FINAL" and digest != legacy_v2:
        raise SystemExit("refusing non-development dataset")


def summarize(rows):
    positive = [r for r in rows if r["expected_count"]]
    expected = sum(r["expected_count"] for r in rows)
    hits = sum(r["hits"] for r in rows)
    return {
        "queries": len(rows), "positive_queries": len(positive),
        "expected_links": expected, "selected_hits": hits,
        "micro_recall": ratio(hits, expected),
        "all_target_reach": [sum(r["hits"] == r["expected_count"] for r in positive), len(positive)],
        "at_least_one_reach": [sum(r["hits"] > 0 for r in positive), len(positive)],
        "recall_at_1": [sum(r["hits_at_1"] for r in rows), expected],
        "recall_at_3": [sum(r["hits_at_3"] for r in rows), expected],
        "recall_at_k": [sum(r["hits_at_k"] for r in rows), expected],
        "precision_at_1": ratio(sum(r["hits_at_1"] for r in rows), len(rows)),
        "precision_at_3": ratio(sum(r["hits_at_3"] for r in rows), 3 * len(rows)),
        "precision_at_k": ratio(sum(r["hits_at_k"] for r in rows), 3 * len(rows)),
        "mrr": ratio(sum(r["reciprocal_rank"] for r in positive), len(positive)),
        "false_exposures": sum(len(r["false_ids"]) for r in rows),
        "hard_negative_exposed": sum(bool(r["selected_ids"]) for r in rows if r["expected_count"] == 0),
        "mean_selected": ratio(sum(len(r["selected_ids"]) for r in rows), len(rows)),
        "mean_candidates": ratio(sum(r["candidate_count"] for r in rows), len(rows)),
    }


def evaluate(dataset, traces, threshold):
    output = []
    k1, b, cap = 1.2, 0.75, 3
    for project in dataset["projects"]:
        cases = {row["query_id"]: row for row in traces["results"] if row["project_id"] == project["id"]}
        n = len(project["requirements"])
        for query in project["queries"]:
            start = time.perf_counter_ns()
            trace = cases[query["id"]]
            lexical = {item["id"]: item for item in trace["ranked_requirements"]}
            docs = {rid: set(lexical[rid]["trace"]["baseline_tokens"]) | set(lexical[rid]["trace"]["title_tokens"])
                    for rid in (item["id"] for item in project["requirements"])}
            df = collections.Counter(term for words in docs.values() for term in words)
            avg_length = sum(map(len, docs.values())) / n
            query_terms = set(trace["ranked_requirements"][0]["trace"]["input_tokens"])
            idf = {term: math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5)) for term in query_terms}
            ceiling = sum(idf.values()) * (k1 + 1)
            ranked = []
            for requirement in project["requirements"]:
                rid = requirement["id"]
                length = len(docs[rid])
                denom = 1 + k1 * (1 - b + b * length / avg_length)
                components = {term: idf[term] * (k1 + 1) / denom for term in query_terms & docs[rid]}
                raw = sum(components.values())
                score = raw / ceiling if ceiling else 0.0
                ranked.append({"id": rid, "score": score, "raw_bm25": raw, "matched_terms": components})
            ranked.sort(key=lambda row: -row["score"])
            selected = []
            for rank, row in enumerate(ranked, 1):
                row["rank"] = rank
                row["passed_threshold"] = row["score"] >= threshold
                row["selected"] = row["passed_threshold"] and len(selected) < cap
                row["decision"] = "SELECTED" if row["selected"] else ("BELOW_THRESHOLD" if not row["passed_threshold"] else "TOP_K_EXCLUDED")
                if row["selected"]:
                    selected.append(row["id"])
            expected = set(query["expected_requirement_ids"])
            ranked_ids = [row["id"] for row in ranked]
            hits = len(expected & set(selected))
            misses = expected - set(selected)
            missed_stages = {rid: next(row["decision"] for row in ranked if row["id"] == rid) for rid in misses}
            output.append({
                "query_id": query["id"], "project_id": project["id"], "project_size": project["size"],
                "categories": query.get("categories", ["legacy_unclassified"]),
                "message": query["message"], "expected_ids": sorted(expected), "expected_count": len(expected),
                "candidate_count": n, "ranked": ranked, "selected_ids": selected,
                "missed_ids": sorted(misses), "missed_stages": missed_stages,
                "false_ids": sorted(set(selected) - expected), "hits": hits,
                "hits_at_1": len(expected & set(ranked_ids[:1])),
                "hits_at_3": len(expected & set(ranked_ids[:3])),
                "hits_at_k": len(expected & set(ranked_ids[:cap])),
                "reciprocal_rank": 1 / (next((i for i, rid in enumerate(ranked_ids, 1) if rid in expected), 0)) if expected else 0,
                "latency_us": (time.perf_counter_ns() - start) / 1000,
            })
    by_size = {key: summarize([r for r in output if r["project_size"] == key]) for key in sorted({r["project_size"] for r in output})}
    categories = sorted({c for r in output for c in r["categories"]})
    by_category = {key: summarize([r for r in output if key in r["categories"]]) for key in categories}
    return output, by_size, by_category


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--r5-trace", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--threshold", type=float, default=0.25)
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    require_development(data, hashlib.sha256(raw).hexdigest())
    r5 = json.loads(args.r5_trace.read_text())
    if r5["dataset"]["sha256"] != hashlib.sha256(raw).hexdigest():
        raise SystemExit("R5 trace does not match dataset bytes")
    rows, by_size, by_category = evaluate(data, r5, args.threshold)
    report = {
        "identity": "R6-L1", "role": "DEVELOPMENT_EXPERIMENT",
        "dataset_sha256": hashlib.sha256(raw).hexdigest(),
        "method": "R5 normalized token sets; binary-tf BM25 over title+description union, k1=1.2, b=.75; score divided by sum(query IDF)*(k1+1); cap=3; no specific-match gate; stable source-order ties",
        "threshold": args.threshold,
        "metrics": summarize(rows), "by_size": by_size, "by_category": by_category,
        "latency_us_total": sum(r["latency_us"] for r in rows), "results": rows,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"identity": "R6-L1", "metrics": report["metrics"], "by_size": by_size}, indent=2))


if __name__ == "__main__":
    main()
