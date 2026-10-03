#!/usr/bin/env python3
"""Build atomic oracle-retrieval classification pairs from the frozen development project corpus."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


EXPECTED_LABELS = {
    "cq-01": {"c-reset": "added"},
    "cq-02": {"c-cancel": "modified"},
    "cq-03": {"c-invoice": "removed"},
    "cq-04": {"c-notify": "added"},
    "cq-05": {"c-report": "modified"},
    "cq-06": {"c-prescription": "modified"},
    "cq-07": {"c-login": "modified"},
    "cq-08": {"c-book": "added", "c-notify": "added"},
    "eq-01": {"e-promo": "modified"},
    "eq-02": {"e-stock": "contradiction"},
    "eq-03": {"e-pay": "added"},
    "eq-04": {"e-review": "contradiction"},
    "eq-05": {"e-ship": "added", "e-email": "added"},
    "eq-06": {"e-guest": "removed", "e-auth": "added"},
    "eq-07": {"e-search": "added"},
    "eq-08": {"e-refund": "modified"},
    "sq-01": {"s-file": "modified"},
    "sq-02": {"s-notify": "added"},
    "sq-03": {"s-audit": "modified"},
    "sq-04": {"s-api": "added"},
    "sq-05": {"s-hook": "unchanged"},
    "sq-06": {"s-dashboard": "modified"},
    "sq-07": {"s-search": "added", "s-file": "added"},
    "sq-08": {"s-retain": "modified"},
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("evaluation/datasets/retrieval_dev_v1.json"))
    parser.add_argument("--output", type=Path, default=Path("evaluation/datasets/retrieval_oracle_dev_v1.json"))
    args = parser.parse_args()
    source = json.loads(args.input.read_text(encoding="utf-8"))
    cases = []
    seen_queries = set()
    for project in source["projects"]:
        requirements = {item["id"]: item for item in project["requirements"]}
        for query in project["queries"]:
            seen_queries.add(query["id"])
            labels = EXPECTED_LABELS[query["id"]]
            if set(labels) != set(query["expected_requirement_ids"]):
                raise RuntimeError(f"Oracle labels do not match expected IDs for {query['id']}")
            for requirement_id in query["expected_requirement_ids"]:
                item = requirements[requirement_id]
                cases.append({
                    "id": f"oracle_{query['id']}_{requirement_id}",
                    "source_query_id": query["id"],
                    "source_requirement_id": requirement_id,
                    "domain": project["id"],
                    "difficulty": "diagnostic",
                    "tags": ["oracle-retrieval"],
                    "baseline_requirement": item["description"],
                    "client_message": query["message"],
                    "expected_label": labels[requirement_id],
                })
    if seen_queries != set(EXPECTED_LABELS):
        raise RuntimeError("Oracle label map and retrieval query IDs differ")
    output = {
        "name": "drift-retrieval-oracle-dev",
        "version": "1.0.0",
        "role": "DEVELOPMENT_DIAGNOSTIC",
        "source_dataset": source["name"] + "@" + source["version"],
        "source_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
        "methodology": "Each query is paired directly with every human-labeled expected requirement; no production retrieval result is used.",
        "labels": ["added", "modified", "removed", "contradiction", "ambiguous", "unchanged"],
        "cases": cases,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} with {len(cases)} oracle pairs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
