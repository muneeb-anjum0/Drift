#!/usr/bin/env python3
"""Aggregate-only contamination audit; never emit closed examples or IDs."""

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    "retrieval_dev_v1": "evaluation/datasets/retrieval_dev_v1.json",
    "retrieval_dev_v2": "evaluation/datasets/retrieval_dev_v2.json",
    "phase_iii_e_dev": "evaluation/phase_iii_e/retrieval_dev_v1.json",
    "raw_dev": "evaluation/datasets/drift_raw_dev_v1.json",
    "historical_retrieval_final": "evaluation/heldout/retrieval_final_v1.json",
    "phase_iii_d_closed": "evaluation/phase_iii_d/retrieval_independent_v1.json",
    "phase_iii_e_closed": "evaluation/phase_iii_e/retrieval_independent_v1.json",
}


def messages(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"message", "client_message", "query", "new_client_message"} and isinstance(value, str):
                yield value
            elif isinstance(value, (dict, list)):
                yield from messages(value)
    elif isinstance(node, list):
        for value in node:
            yield from messages(value)


def words(value):
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def compare(left, right):
    pairs = [(a, b) for a in left for b in right]
    scores = [len(a & b) / len(a | b) if a | b else 1.0 for a, b in pairs]
    return {"source_queries": len(right), "exact_pairs": sum(a == b for a, b in pairs),
            "near_pairs_jaccard_ge_0_8": sum(score >= 0.8 for score in scores),
            "max_token_jaccard": max(scores, default=0)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    if data.get("role") != "DEVELOPMENT_NOT_FINAL":
        raise SystemExit("refusing non-development input")
    unique_queries = sorted({q["message"] for p in data["projects"] for q in p["queries"]})
    left = [words(text) for text in unique_queries]
    results = {}
    for name, relative in SOURCES.items():
        path = ROOT / relative
        right = [words(text) for text in messages(json.loads(path.read_bytes()))]
        results[name] = compare(left, right)
    prompt_text = [text for path in (ROOT / "evaluation/prompts").glob("*.json")
                   for text in messages(json.loads(path.read_bytes()))]
    results["prompt_examples"] = compare(left, [words(text) for text in prompt_text])
    test_text = [text for path in list((ROOT / "server-go").rglob("*_test.go")) + list((ROOT / "tools").rglob("test_*.py"))
                 for text in re.findall(r'"([^"\n]{20,})"', path.read_text())]
    results["repository_tests"] = compare(left, [words(text) for text in test_text])
    report = {"role": "DEVELOPMENT_AGGREGATE_CONTAMINATION_AUDIT", "dataset_sha256": hashlib.sha256(raw).hexdigest(),
              "unique_query_count": len(unique_queries), "repeated_query_instances": sum(len(p["queries"]) for p in data["projects"]) - len(unique_queries),
              "sources": results,
              "limitations": ["No case-level closed records emitted; aggregate token overlap is not semantic contamination proof.",
                              "Requirements are intentionally reused from open development sources.",
                              "Unknown original adapter-training overlap remains UNKNOWN."]}
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"dataset_sha256": report["dataset_sha256"], "sources": results}, indent=2))


if __name__ == "__main__":
    main()
