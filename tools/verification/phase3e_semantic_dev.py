#!/usr/bin/env python3
"""Development-only, CPU-only semantic retrieval prototype."""

import argparse
import hashlib
import json
import os
import re
import resource
import time
from pathlib import Path

from phase3e_bm25_dev import require_development, summarize

MODEL = "sentence-transformers/all-MiniLM-L6-v2"
REVISION = "c9745ed1d9f207416be6d2e6f8de32d1f16199bf"


def encode(texts):
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "":
        raise SystemExit("set CUDA_VISIBLE_DEVICES='' before running this CPU-only experiment")
    import torch
    import torch.nn.functional as functional
    from transformers import AutoModel, AutoTokenizer

    torch.set_num_threads(2)
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
    model = AutoModel.from_pretrained(MODEL, revision=REVISION).to("cpu").eval()
    vectors = []
    with torch.inference_mode():
        for offset in range(0, len(texts), 16):
            batch = tokenizer(texts[offset:offset + 16], padding=True, truncation=True,
                              max_length=256, return_tensors="pt")
            output = model(**batch).last_hidden_state
            mask = batch["attention_mask"].unsqueeze(-1)
            pooled = (output * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            vectors.extend(functional.normalize(pooled, p=2, dim=1).tolist())
    return vectors


def dot(left, right):
    return sum(a * b for a, b in zip(left, right))


def rank_select(candidates, threshold, cap=3):
    """Stable baseline-order ties; exact boundary is eligible; empty is valid."""
    ranked = sorted(candidates, key=lambda row: -row["score"])
    selected = []
    for rank, item in enumerate(ranked, 1):
        item["rank"] = rank
        item["passed_threshold"] = item["score"] >= threshold
        item["selected"] = item["passed_threshold"] and len(selected) < cap
        item["decision"] = "SELECTED" if item["selected"] else ("BELOW_THRESHOLD" if not item["passed_threshold"] else "TOP_K_EXCLUDED")
        if item["selected"]:
            selected.append(item["id"])
    return ranked, selected


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--decompose", action="store_true")
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    require_development(data, hashlib.sha256(raw).hexdigest())
    texts = []
    indices = {}
    for project in data["projects"]:
        for requirement in project["requirements"]:
            indices[(project["id"], "requirement", requirement["id"])] = len(texts)
            texts.append(requirement["title"] + ". " + requirement["description"])
        for query in project["queries"]:
            clauses = [query["message"]]
            if args.decompose:
                clauses.extend(part.strip() for part in re.split(r"[,;]|\band\b", query["message"], flags=re.I)
                               if len(part.split()) >= 3)
            for variant, clause in enumerate(clauses):
                indices[(project["id"], "query", query["id"], variant)] = len(texts)
                texts.append(clause)
    started = time.perf_counter()
    vectors = encode(texts)
    encoding_seconds = time.perf_counter() - started
    reports = {}
    thresholds = (0.35, 0.45, 0.55) if args.decompose else (0.25, 0.35, 0.45, 0.55, 0.65)
    for threshold in thresholds:
        rows = []
        for project in data["projects"]:
            for query in project["queries"]:
                query_vectors = [vectors[index] for key, index in indices.items()
                                 if key[:3] == (project["id"], "query", query["id"])]
                ranked = [{"id": item["id"], "score": max(dot(query_vector, vectors[indices[(project["id"], "requirement", item["id"])]] ) for query_vector in query_vectors)}
                          for item in project["requirements"]]
                ranked, selected = rank_select(ranked, threshold)
                expected = set(query["expected_requirement_ids"])
                ids = [r["id"] for r in ranked]
                misses = expected - set(selected)
                first_rank = next((i for i, rid in enumerate(ids, 1) if rid in expected), None)
                rows.append({
                    "query_id": query["id"], "project_id": project["id"], "project_size": project["size"],
                    "categories": query.get("categories", ["legacy_unclassified"]),
                    "message": query["message"], "expected_ids": sorted(expected), "expected_count": len(expected),
                    "candidate_count": len(ranked), "ranked": ranked, "selected_ids": selected,
                    "missed_ids": sorted(misses),
                    "missed_stages": {rid: next(r["decision"] for r in ranked if r["id"] == rid) for rid in misses},
                    "false_ids": sorted(set(selected) - expected), "hits": len(expected & set(selected)),
                    "hits_at_1": len(expected & set(ids[:1])), "hits_at_3": len(expected & set(ids[:3])),
                    "hits_at_k": len(expected & set(ids[:3])),
                    "reciprocal_rank": 1 / first_rank if first_rank else 0,
                })
        category_names = sorted({category for row in rows for category in row["categories"]})
        reports[str(threshold)] = {
            "metrics": summarize(rows),
            "by_size": {size: summarize([r for r in rows if r["project_size"] == size]) for size in ("small", "medium", "large")},
            "by_category": {category: summarize([r for r in rows if category in r["categories"]]) for category in category_names},
            "results": rows,
        }
    report = {
        "identity": "R6-Q2" if args.decompose else "R6-S1", "role": "DEVELOPMENT_EXPERIMENT",
        "dataset_sha256": hashlib.sha256(raw).hexdigest(),
        "model": MODEL, "revision": REVISION, "dimension": len(vectors[0]),
        "representation": ("max cosine over whole query and >=3-word comma/semicolon/and clauses" if args.decompose else "whole query cosine") + " vs title + period + description; masked mean pooling, L2 normalization",
        "device": "cpu", "embedding_count": len(texts), "encoding_seconds": encoding_seconds,
        "peak_process_maxrss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "thresholds": reports,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: value["metrics"] for key, value in reports.items()}, indent=2))


if __name__ == "__main__":
    main()
