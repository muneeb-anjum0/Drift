#!/usr/bin/env python3
"""Report aggregate overlap only; never print protected case text or IDs."""

import argparse
import json
import re
from pathlib import Path


def messages(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"message", "client_message", "query"} and isinstance(value, str):
                yield value
            elif isinstance(value, (dict, list)):
                yield from messages(value)
    elif isinstance(node, list):
        for value in node:
            yield from messages(value)


def normalized(value):
    return " ".join(re.findall(r"[a-z0-9]+", value.lower()))


def strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from strings(value)
    elif isinstance(node, list):
        for value in node:
            yield from strings(value)


def similarity(left, right):
    a, b = set(left.split()), set(right.split())
    return len(a & b) / len(a | b) if a | b else 1.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.dataset.read_text())
    if data.get("role") not in {"DEVELOPMENT_NOT_FINAL", "REVIEW_DRAFT_NOT_FINAL_TEST"}:
        raise SystemExit("corpus must be development or pre-review draft")
    project_ids = set()
    query_ids = set()
    for project in data["projects"]:
        if project["id"] in project_ids or project["size"] not in {"small", "medium", "large"}:
            raise SystemExit("duplicate project or invalid size")
        project_ids.add(project["id"])
        requirement_ids = [item["id"] for item in project["requirements"]]
        if len(requirement_ids) != len(set(requirement_ids)):
            raise SystemExit("duplicate requirement ID")
        for query in project["queries"]:
            if query["id"] in query_ids or not set(query["expected_requirement_ids"]) <= set(requirement_ids):
                raise SystemExit("duplicate query or unknown expected requirement ID")
            if not query.get("categories") or query.get("provenance") != "MODEL_GENERATED":
                raise SystemExit("missing category or synthetic provenance")
            query_ids.add(query["id"])
    current = [normalized(text) for text in messages(data)]
    if len(current) != len(set(current)):
        raise SystemExit("new corpus has an internal duplicate query")
    corpus_paths = {
        "retrieval_dev_v1": "evaluation/datasets/retrieval_dev_v1.json",
        "retrieval_dev_v2": "evaluation/datasets/retrieval_dev_v2.json",
        "raw_dev": "evaluation/datasets/drift_raw_dev_v1.json",
        "retrieval_historical_final": "evaluation/heldout/retrieval_final_v1.json",
        "raw_historical_final": "evaluation/heldout/drift_raw_final_v1.json",
        "phase_iii_d_protected": "evaluation/phase_iii_d/retrieval_independent_v1.json",
    }
    if data.get("role") == "REVIEW_DRAFT_NOT_FINAL_TEST":
        corpus_paths["phase_iii_e_development"] = "evaluation/phase_iii_e/retrieval_dev_v1.json"
    report = {"role": "PRE_REVIEW_LEAKAGE_AUDIT" if data.get("role") == "REVIEW_DRAFT_NOT_FINAL_TEST" else "DEVELOPMENT_LEAKAGE_AUDIT", "new_query_count": len(current), "sources": {}}
    extra = {
        "prompt_examples": [text for path in Path("evaluation/prompts").glob("*.json")
                            for text in strings(json.loads(path.read_text())) if len(text.split()) >= 4],
        "repository_tests": [text for path in list(Path("server-go").rglob("*_test.go")) + list(Path("tools").rglob("test_*.py"))
                             for text in re.findall(r'"([^"\n]{20,})"', path.read_text())],
    }
    for label, path in corpus_paths.items():
        other = [normalized(text) for text in messages(json.loads(Path(path).read_text()))]
        comparisons = [similarity(a, b) for a in current for b in other]
        report["sources"][label] = {
            "compared_query_count": len(other),
            "exact_pairs": sum(score == 1.0 for score in comparisons),
            "near_pairs_jaccard_ge_0_8": sum(score >= 0.8 for score in comparisons),
            "max_token_jaccard": max(comparisons, default=0.0),
        }
    for label, texts in extra.items():
        other = [normalized(text) for text in texts]
        comparisons = [similarity(a, b) for a in current for b in other]
        report["sources"][label] = {
            "compared_query_count": len(other),
            "exact_pairs": sum(score == 1.0 for score in comparisons),
            "near_pairs_jaccard_ge_0_8": sum(score >= 0.8 for score in comparisons),
            "max_token_jaccard": max(comparisons, default=0.0),
        }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
