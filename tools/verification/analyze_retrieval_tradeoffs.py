#!/usr/bin/env python3
"""Derive top-k workload/quality tradeoffs from a retrieval report without reranking."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def metrics_at_k(results: list[dict[str, Any]], k: int) -> dict[str, Any]:
    recall_total = 0.0
    precision_total = 0.0
    all_count = 0
    any_count = 0
    selected_total = 0
    false_exposure = 0
    for item in results:
        selected = [ranked["id"] for ranked in item["ranked_requirements"] if ranked["is_relevant"]][:k]
        expected = set(item["expected_requirement_ids"])
        hits = len(expected.intersection(selected))
        recall_total += hits / len(expected)
        precision_total += hits / len(selected) if selected else 0.0
        all_count += hits == len(expected)
        any_count += hits > 0
        selected_total += len(selected)
        false_exposure += len(selected) - hits
    count = len(results)
    return {
        "k": k,
        "query_count": count,
        "model_input_recall": recall_total / count,
        "selected_precision": precision_total / count,
        "all_expected_reached_count": all_count,
        "all_expected_reached_rate": all_count / count,
        "at_least_one_reached_count": any_count,
        "at_least_one_reached_rate": any_count / count,
        "average_model_calls": selected_total / count,
        "false_candidate_exposure_count": false_exposure,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("evaluation/reports/retrieval_dev_v1.json"))
    parser.add_argument("--output", type=Path, default=Path("evaluation/reports/retrieval_topk_v0.json"))
    args = parser.parse_args()
    source = json.loads(args.input.read_text(encoding="utf-8"))
    report = {
        "schema_version": 1,
        "evaluation_id": "V0-retrieval-topk-diagnostic",
        "source_report": str(args.input),
        "dataset": source["dataset"],
        "note": "Uses unchanged V0 rankings/relevance decisions; only the number of eligible requirements admitted is varied.",
        "levels": [metrics_at_k(source["results"], k) for k in [1, 2, 3, 5]],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
