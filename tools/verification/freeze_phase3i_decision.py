#!/usr/bin/env python3
"""Validate independent Phase III-I labels and freeze without overwriting files."""

import argparse
import hashlib
import json
import os
from datetime import date
from pathlib import Path

LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
DECISIONS = {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate(draft_path, review_path):
    draft = json.loads(draft_path.read_text(encoding="utf-8"))
    review = json.loads(review_path.read_text(encoding="utf-8"))
    cases = draft["cases"]
    if draft.get("role") != "PROPOSED_DECISION_CASES_NOT_REVIEWED_NOT_SCORED":
        raise ValueError("draft role is not a proposed decision corpus")
    if len(cases) != 90 or len({case["id"] for case in cases}) != len(cases):
        raise ValueError("expected 90 uniquely identified draft cases")
    if review.get("draft_sha256") != sha256(draft_path):
        raise ValueError("review record draft SHA does not match the current draft")
    reviewer = review.get("reviewer")
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise ValueError("independent reviewer identity missing")
    if reviewer.strip().lower() in {"ai_assisted", "pending_human", "codex", "assistant"}:
        raise ValueError("independent reviewer identity is not credible")
    try:
        date.fromisoformat(review["review_date"])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("review_date must be an ISO date") from error
    records = review.get("decisions")
    if not isinstance(records, list) or len(records) != len(cases):
        raise ValueError("review must include exactly one decision per case")
    by_id = {case["id"]: case for case in cases}
    seen = set()
    frozen = []
    counts = {decision: 0 for decision in sorted(DECISIONS)}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("review decision is not an object")
        case_id = record.get("case_id")
        if case_id not in by_id or case_id in seen:
            raise ValueError(f"unknown or duplicate case ID: {case_id}")
        seen.add(case_id)
        decision = record.get("decision")
        label = record.get("reviewed_label")
        note = record.get("review_note")
        if decision not in DECISIONS:
            raise ValueError(f"{case_id}: invalid or missing decision")
        if not isinstance(note, str):
            raise ValueError(f"{case_id}: review_note must be text")
        if decision == "CONFIRMED" and label != by_id[case_id]["proposed_label"]:
            raise ValueError(f"{case_id}: confirmed label must match proposal")
        if decision == "REVISED" and label not in LABELS:
            raise ValueError(f"{case_id}: revised label must be canonical")
        if decision in {"AMBIGUOUS", "EXCLUDE"} and label is not None:
            raise ValueError(f"{case_id}: ambiguous/excluded label must be null")
        if decision != "CONFIRMED" and not note.strip():
            raise ValueError(f"{case_id}: non-confirmed decision requires a note")
        counts[decision] += 1
        case = dict(by_id[case_id])
        case["review"] = {
            "decision": decision,
            "reviewed_label": label,
            "review_note": note.strip(),
            "reviewer": reviewer.strip(),
            "review_date": review["review_date"],
        }
        case["primary_scored"] = decision in {"CONFIRMED", "REVISED"}
        frozen.append(case)
    if seen != set(by_id):
        raise ValueError("review omits draft cases")
    frozen.sort(key=lambda case: next(i for i, item in enumerate(cases) if item["id"] == case["id"]))
    output = {
        "role": "INDEPENDENTLY_REVIEWED_DECISION_CORPUS",
        "draft_sha256": sha256(draft_path),
        "review_record_sha256": sha256(review_path),
        "reviewer": reviewer.strip(),
        "review_date": review["review_date"],
        "review_decision_counts": counts,
        "cases": frozen,
    }
    return output


def write_new(path, data):
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    descriptor = os.open(path, flags, 0o644)
    with os.fdopen(descriptor, "wb") as target:
        target.write(data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--review", type=Path, required=True)
    parser.add_argument("--out", type=Path, help="Freeze path; omitted for validation only")
    args = parser.parse_args()
    frozen = validate(args.draft, args.review)
    print(json.dumps({"valid": True, "review_decision_counts": frozen["review_decision_counts"],
                      "primary_scored_cases": sum(case["primary_scored"] for case in frozen["cases"])},
                     sort_keys=True))
    if args.out is not None:
        if not args.out.parent.is_dir():
            raise ValueError("output directory does not exist")
        body = (json.dumps(frozen, indent=2, ensure_ascii=False) + "\n").encode()
        digest = hashlib.sha256(body).hexdigest()
        sidecar = args.out.with_suffix(args.out.suffix + ".sha256")
        if args.out.exists() or sidecar.exists():
            raise FileExistsError("frozen corpus or checksum already exists; overwrite forbidden")
        write_new(args.out, body)
        write_new(sidecar, f"{digest}  {args.out.name}\n".encode())
        print(json.dumps({"frozen_path": str(args.out), "sha256": digest}, sort_keys=True))


if __name__ == "__main__":
    main()
