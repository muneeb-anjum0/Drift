#!/usr/bin/env python3
"""Validate independent review and freeze Phase III-E labels without retrieval."""

import argparse
import collections
import hashlib
import json
from datetime import date
from pathlib import Path


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()


def freeze(draft_raw, review_raw):
    draft, review = json.loads(draft_raw), json.loads(review_raw)
    if draft.get("role") != "REVIEW_DRAFT_NOT_FINAL_TEST":
        raise ValueError("draft role is invalid")
    if review.get("draft_sha256") != sha(draft_raw):
        raise ValueError("review is for different draft bytes")
    reviewer = review.get("reviewer")
    if not isinstance(reviewer, str) or not reviewer.strip() or reviewer.lower() in {"codex", "assistant", "unknown", "independent-reviewer-id"}:
        raise ValueError("named independent reviewer is required")
    try:
        date.fromisoformat(review["review_date"])
    except (KeyError, ValueError, TypeError) as exc:
        raise ValueError("review_date must be an ISO calendar date") from exc
    proposals = {q["id"]: (p, q) for p in draft["projects"] for q in p["queries"]}
    if len(proposals) != sum(len(p["queries"]) for p in draft["projects"]):
        raise ValueError("draft contains duplicate case IDs")
    decisions = review.get("decisions")
    if not isinstance(decisions, list) or len(decisions) != len(proposals):
        raise ValueError("one review decision per draft case is required")
    if len({item.get("case_id") for item in decisions}) != len(decisions):
        raise ValueError("duplicate review case IDs")
    by_id = {item["case_id"]: item for item in decisions}
    if set(by_id) != set(proposals):
        raise ValueError("review case IDs do not equal draft case IDs")
    trail_rows = []
    projects = []
    for project in draft["projects"]:
        valid = {r["id"] for r in project["requirements"]}
        output_queries = []
        for query in project["queries"]:
            item = by_id[query["id"]]
            status = item.get("status")
            if status not in {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"}:
                raise ValueError(f"invalid review status: {query['id']}")
            targets = item.get("reviewed_requirement_ids")
            if not isinstance(targets, list) or any(not isinstance(rid, str) for rid in targets):
                raise ValueError(f"reviewed targets must be strings: {query['id']}")
            if len(targets) != len(set(targets)) or not set(targets) <= valid:
                raise ValueError(f"invalid or duplicate target ID: {query['id']}")
            proposed = query["expected_requirement_ids"]
            if status == "CONFIRMED" and targets != proposed:
                raise ValueError(f"CONFIRMED changed proposed IDs: {query['id']}")
            if status == "REVISED" and targets == proposed:
                raise ValueError(f"REVISED did not change IDs: {query['id']}")
            note = item.get("note", "")
            if not isinstance(note, str) or (status != "CONFIRMED" and not note.strip()):
                raise ValueError(f"review note required for {query['id']}")
            trail_rows.append({"case_id": query["id"], "proposed_requirement_ids": proposed,
                               "reviewed_requirement_ids": targets, "status": status, "note": note})
            if status in {"CONFIRMED", "REVISED"}:
                output_queries.append({"id": query["id"], "message": query["message"],
                                       "expected_requirement_ids": targets,
                                       "proposed_requirement_ids": proposed,
                                       "categories": query["categories"], "provenance": query["provenance"],
                                       "review_status": status})
        projects.append({"id": project["id"], "size": project["size"],
                         "requirements": project["requirements"], "queries": output_queries})
    counts = collections.Counter(row["status"] for row in trail_rows)
    if counts["AMBIGUOUS"]:
        raise ValueError("ambiguous cases must be resolved or excluded before freeze")
    dataset = {"name": "drift-phase-iii-e-independent-retrieval", "version": "1.0.0",
               "role": "PROTECTED_INDEPENDENT_EVALUATION", "provenance": ["MODEL_GENERATED", "SYNTHETIC", "INDEPENDENT_REVIEWED"],
               "r6_development_freeze_commit": draft["r6_development_freeze_commit"],
               "projects": projects}
    dataset_raw = encode(dataset)
    trail = {"reviewer": reviewer, "review_date": review["review_date"],
             "draft_sha256": sha(draft_raw), "review_sha256": sha(review_raw),
             "dataset_sha256": sha(dataset_raw), "decision_counts": dict(sorted(counts.items())),
             "included_query_count": sum(len(p["queries"]) for p in projects),
             "cases": trail_rows,
             "warning": "Structure is validated; reviewer independence and adapter-training overlap cannot be machine-proven."}
    return dataset_raw, encode(trail)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--review", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--trail", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.trail.exists():
        raise SystemExit("freeze targets already exist; use a new version")
    dataset_raw, trail_raw = freeze(args.draft.read_bytes(), args.review.read_bytes())
    with args.output.open("xb") as file:
        file.write(dataset_raw)
    with args.trail.open("xb") as file:
        file.write(trail_raw)
    print(json.dumps({"dataset_sha256": sha(dataset_raw), "trail_sha256": sha(trail_raw)}))


if __name__ == "__main__":
    main()
