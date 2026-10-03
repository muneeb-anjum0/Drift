"""Freeze a human-reviewed Phase III-D retrieval set without running retrieval.

The decisions file is supplied by an independent reviewer. This script checks
its structure, preserves the proposal and review trail, and creates new files
exclusively so a prior freeze cannot be overwritten by accident.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path


DECISIONS = {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"}


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def freeze(draft: dict, review: dict) -> tuple[dict, dict]:
    reviewer = str(review.get("reviewer", "")).strip()
    if not reviewer or reviewer.lower() in {"ai", "assistant", "codex", "model", "unknown"}:
        raise ValueError("independent human reviewer identity or pseudonym is required")
    reviewed_at = str(review.get("reviewed_at", "")).strip()
    try:
        datetime.fromisoformat(reviewed_at)
    except ValueError as exc:
        raise ValueError("reviewed_at must be ISO-8601") from exc

    proposals = {query["id"]: (project, query) for project in draft["projects"] for query in project["queries"]}
    decisions = review.get("cases", [])
    if len(decisions) != len(proposals):
        raise ValueError(f"expected {len(proposals)} case decisions; received {len(decisions)}")
    if len({item.get("case_id") for item in decisions}) != len(decisions):
        raise ValueError("case decisions contain duplicate IDs")
    if set(item.get("case_id") for item in decisions) != set(proposals):
        raise ValueError("reviewed case IDs differ from the draft")

    by_id = {item["case_id"]: item for item in decisions}
    projects = []
    review_rows = []
    for project in draft["projects"]:
        output_queries = []
        valid_ids = {requirement["id"] for requirement in project["requirements"]}
        for query in project["queries"]:
            decision = by_id[query["id"]]
            status = decision.get("decision")
            if status not in DECISIONS:
                raise ValueError(f"invalid review decision for {query['id']}: {status}")
            target_ids = decision.get("reviewer_expected_requirement_ids")
            if not isinstance(target_ids, list) or any(not isinstance(item, str) for item in target_ids):
                raise ValueError(f"reviewed targets must be a string array: {query['id']}")
            if len(target_ids) != len(set(target_ids)) or not set(target_ids) <= valid_ids:
                raise ValueError(f"duplicate or invalid reviewed target: {query['id']}")
            note = str(decision.get("note", "")).strip()
            if status in {"REVISED", "AMBIGUOUS", "EXCLUDE"} and not note:
                raise ValueError(f"review note required for {query['id']}")
            review_rows.append({
                "case_id": query["id"],
                "proposed_requirement_ids": query["expected_requirement_ids"],
                "reviewer_expected_requirement_ids": target_ids,
                "decision": status,
                "note": note,
            })
            if status in {"CONFIRMED", "REVISED"}:
                output_queries.append({
                    "id": query["id"],
                    "message": query["message"],
                    "expected_requirement_ids": target_ids,
                    "categories": query["categories"],
                    "provenance": query["provenance"],
                    "review_status": status,
                })
        projects.append({
            "id": project["id"],
            "size": project["size"],
            "requirements": project["requirements"],
            "queries": output_queries,
        })

    counts = Counter(row["decision"] for row in review_rows)
    dataset = {
        "name": "drift-retrieval-independent-evaluation",
        "version": "1.0.0",
        "role": "PROTECTED_INDEPENDENT_EVALUATION",
        "provenance": ["MODEL_GENERATED", "SYNTHETIC", "INDEPENDENT_HUMAN_LABELED"],
        "threshold": draft["threshold"],
        "max_selected": draft["max_selected"],
        "projects": projects,
    }
    trail = {
        "schema_version": 1,
        "reviewer": reviewer,
        "reviewed_at": reviewed_at,
        "decision_counts": dict(sorted(counts.items())),
        "included_query_count": sum(len(project["queries"]) for project in projects),
        "cases": review_rows,
        "warning": "The tool validates the review record structure but cannot verify reviewer independence or original adapter-training overlap.",
    }
    return dataset, trail


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", required=True, type=Path)
    parser.add_argument("--review", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--trail", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists() or args.trail.exists():
        raise SystemExit("freeze target already exists; use a new version instead of overwriting")
    draft_raw, review_raw = args.draft.read_bytes(), args.review.read_bytes()
    dataset, trail = freeze(json.loads(draft_raw), json.loads(review_raw))
    trail["draft_sha256"] = digest(draft_raw)
    trail["review_sha256"] = digest(review_raw)
    dataset_raw = (json.dumps(dataset, indent=2, ensure_ascii=False) + "\n").encode()
    trail["dataset_sha256"] = digest(dataset_raw)
    trail_raw = (json.dumps(trail, indent=2, ensure_ascii=False) + "\n").encode()
    with args.output.open("xb") as output_file:
        output_file.write(dataset_raw)
    with args.trail.open("xb") as trail_file:
        trail_file.write(trail_raw)
    print(json.dumps({"dataset_sha256": trail["dataset_sha256"], "included_query_count": trail["included_query_count"]}))


if __name__ == "__main__":
    main()
