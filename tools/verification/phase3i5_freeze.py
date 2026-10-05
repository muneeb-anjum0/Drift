#!/usr/bin/env python3
"""Validate and exclusively freeze a reviewed Phase III-I.5 stress corpus.

This deliberately performs no inference. Proposed and reviewed truth coexist.
"""

import argparse
import hashlib
import json
import os
from collections import Counter
from datetime import date
from pathlib import Path


LABELS = {"unchanged", "added", "removed", "modified", "contradiction", "ambiguous"}
DECISIONS = {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"}
TIERS = {"T1", "T2", "T3", "T4"}
STRUCTURES = {
    "atomic", "compound", "conditional", "role", "numeric", "temporal",
    "multi_option", "negative_invariant",
}


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def validate_draft(path):
    draft = json.loads(path.read_text(encoding="utf-8"))
    if draft.get("role") != "PHASE_III_I_5_PROPOSED_NOT_REVIEWED_NOT_SCORED":
        raise ValueError("draft must be explicitly proposed, not reviewed/scored")
    cases = draft.get("cases")
    if not isinstance(cases, list) or not 180 <= len(cases) <= 240:
        raise ValueError("candidate must have 180–240 cases")
    ids = set()
    for index, case in enumerate(cases):
        if not isinstance(case, dict):
            raise ValueError(f"case {index} is not an object")
        case_id = case.get("id")
        if not nonempty(case_id) or case_id in ids:
            raise ValueError(f"missing or duplicate case ID: {case_id}")
        ids.add(case_id)
        for key in ("baseline_requirement", "message", "proposed_rationale", "domain", "semantic_family"):
            if not nonempty(case.get(key)):
                raise ValueError(f"{case_id}: {key} missing")
        if case.get("proposed_label") not in LABELS or case.get("difficulty_tier") not in TIERS:
            raise ValueError(f"{case_id}: invalid label/tier")
        if case.get("requirement_structure") not in STRUCTURES:
            raise ValueError(f"{case_id}: invalid structure")
        tags = case.get("phenomenon_tags")
        if not isinstance(tags, list) or not tags or any(not nonempty(tag) for tag in tags):
            raise ValueError(f"{case_id}: phenomenon tags missing")
        if case.get("author_provenance") != "AI_ASSISTED_SYNTHETIC_PROPOSAL":
            raise ValueError(f"{case_id}: inaccurate author provenance")
    return draft


def validate_review(draft_path, review_path):
    draft = validate_draft(draft_path)
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if review.get("draft_sha256") != digest(draft_path):
        raise ValueError("review draft SHA-256 mismatch")
    if not nonempty(review.get("reviewer")) or not nonempty(review.get("review_provenance")):
        raise ValueError("reviewer identity and provenance required")
    if review["reviewer"].strip().lower() in {"codex", "assistant", "ai", "pending"}:
        raise ValueError("AI or placeholder cannot be represented as human reviewer")
    if review.get("author_exposure_assessment") != "ACCEPTABLE_WITH_LIMITATION":
        raise ValueError("independent reviewer must explicitly accept the disclosed author-exposure limitation before freeze")
    if not nonempty(review.get("author_exposure_reason")):
        raise ValueError("author-exposure assessment requires a reason")
    try:
        date.fromisoformat(review["review_date"])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("ISO review_date required") from error
    decisions = review.get("decisions")
    cases = draft["cases"]
    if not isinstance(decisions, list) or len(decisions) != len(cases):
        raise ValueError("exactly one review decision per case required")
    case_map = {case["id"]: case for case in cases}
    decision_map = {}
    for item in decisions:
        if not isinstance(item, dict) or item.get("case_id") not in case_map:
            raise ValueError("unknown review case")
        case_id = item["case_id"]
        if case_id in decision_map:
            raise ValueError(f"duplicate review: {case_id}")
        decision = item.get("decision")
        label = item.get("reviewed_label")
        note = item.get("review_note")
        if decision not in DECISIONS or not isinstance(note, str):
            raise ValueError(f"{case_id}: invalid review decision/note")
        if decision == "CONFIRMED" and label != case_map[case_id]["proposed_label"]:
            raise ValueError(f"{case_id}: confirmed label differs from proposed")
        if decision == "REVISED" and (label not in LABELS or label == case_map[case_id]["proposed_label"]):
            raise ValueError(f"{case_id}: revised label must be a different canonical label")
        if decision in {"AMBIGUOUS", "EXCLUDE"} and label is not None:
            raise ValueError(f"{case_id}: unscored decision must have null label")
        if decision != "CONFIRMED" and not note.strip():
            raise ValueError(f"{case_id}: non-confirmation requires a reason")
        decision_map[case_id] = item
    reviewed = []
    for case in cases:
        item = decision_map[case["id"]]
        reviewed.append({**case, "review": {
            "decision": item["decision"],
            "reviewed_label": item["reviewed_label"],
            "review_note": item["review_note"].strip(),
        }, "primary_scored": item["decision"] in {"CONFIRMED", "REVISED"}})
    counts = Counter(item["decision"] for item in decisions)
    return {
        "role": "PHASE_III_I_5_REVIEWED_FROZEN_CORPUS",
        "draft_sha256": digest(draft_path),
        "review_record_sha256": digest(review_path),
        "reviewer": review["reviewer"].strip(),
        "review_provenance": review["review_provenance"].strip(),
        "author_exposure_assessment": review["author_exposure_assessment"],
        "author_exposure_reason": review["author_exposure_reason"].strip(),
        "review_date": review["review_date"],
        "review_decision_counts": dict(sorted(counts.items())),
        "cases": reviewed,
    }


def create_exclusive(path, body):
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(descriptor, "wb") as target:
        target.write(body)
        target.flush()
        os.fsync(target.fileno())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--review", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.review is None:
        if args.out is not None:
            parser.error("--out requires --review")
        draft = validate_draft(args.draft)
        print(json.dumps({"draft_valid": True, "cases": len(draft["cases"])}))
        return
    frozen = validate_review(args.draft, args.review)
    print(json.dumps({"review_valid": True, "decisions": frozen["review_decision_counts"],
                      "primary_scored": sum(case["primary_scored"] for case in frozen["cases"])}))
    if args.out is not None:
        if not args.out.parent.is_dir():
            raise ValueError("output directory missing")
        sidecar = args.out.with_suffix(args.out.suffix + ".sha256")
        if args.out.exists() or sidecar.exists():
            raise FileExistsError("frozen corpus or sidecar exists: overwrite forbidden")
        body = (json.dumps(frozen, indent=2, ensure_ascii=False) + "\n").encode()
        create_exclusive(args.out, body)
        create_exclusive(sidecar, f"{hashlib.sha256(body).hexdigest()}  {args.out.name}\n".encode())
        print(json.dumps({"frozen_sha256": hashlib.sha256(body).hexdigest()}))


if __name__ == "__main__":
    main()
