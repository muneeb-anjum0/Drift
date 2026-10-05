#!/usr/bin/env python3
"""Cross-check Muneeb's three review artifacts and transcribe without changing decisions."""

import argparse
import csv
import hashlib
import json
import os
import re
from collections import Counter
from datetime import date
from pathlib import Path

from phase3i5_freeze import DECISIONS, LABELS, validate_draft


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DRAFT = ROOT / "evaluation/phase_iii_i_5/candidate_draft_v1.json"
DEFAULT_OUT = ROOT / "evaluation/phase_iii_i_5/human_review"
EXPECTED = Counter({"CONFIRMED": 214, "REVISED": 1, "AMBIGUOUS": 1, "EXCLUDE": 0})
REVIEW_LINE = re.compile(r"^([sp]\d{2}-\d{2}): (CONFIRMED|REVISED|AMBIGUOUS|EXCLUDE)(?: -> ([A-Z]+))?$")


def sha(path):
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def read_text_decisions(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    if "ALL 216 DECISIONS" not in lines:
        raise ValueError("TXT review has no complete-decision section")
    start = lines.index("ALL 216 DECISIONS") + 1
    parsed = {}
    for line in lines[start:]:
        if not line.strip():
            continue
        match = REVIEW_LINE.fullmatch(line)
        if not match:
            raise ValueError(f"unparsed TXT decision: {line[:80]}")
        case_id, decision, label = match.groups()
        if case_id in parsed:
            raise ValueError(f"duplicate TXT case ID: {case_id}")
        parsed[case_id] = (decision, label.lower() if label else None)
    return parsed, lines


def validate_sources(draft_path, json_path, csv_path, txt_path):
    draft = validate_draft(draft_path)
    cases = {case["id"]: case for case in draft["cases"]}
    raw = json.loads(json_path.read_text(encoding="utf-8"))
    if raw.get("reviewer") != "Muneeb" or raw.get("role") != "PHASE_III_I_5_CRITICAL_SEMANTIC_AUDIT_V3":
        raise ValueError("unexpected reviewer or review artifact role")
    date.fromisoformat(raw["review_date"])
    if "self-attested" not in raw.get("review_provenance", "").lower():
        raise ValueError("self-attested provenance not stated")
    if raw.get("author_exposure_assessment") != "ACCEPTABLE_WITH_LIMITATION":
        raise ValueError("author-exposure assessment is missing or not accepted")
    if not raw.get("author_exposure_reason", "").strip():
        raise ValueError("author-exposure reason missing")
    decisions = raw.get("decisions")
    if not isinstance(decisions, list) or len(decisions) != len(cases):
        raise ValueError("JSON review does not cover every candidate")
    by_id = {}
    for record in decisions:
        case_id = record.get("case_id")
        if case_id not in cases or case_id in by_id:
            raise ValueError(f"unknown/duplicate JSON case ID: {case_id}")
        decision = record.get("decision")
        label = record.get("reviewed_label")
        reason = record.get("reason", "")
        if decision not in DECISIONS or not isinstance(reason, str):
            raise ValueError(f"{case_id}: invalid decision/reason")
        if decision == "CONFIRMED" and label != cases[case_id]["proposed_label"]:
            raise ValueError(f"{case_id}: confirmed label differs from proposal")
        if decision == "REVISED" and (label not in LABELS or label == cases[case_id]["proposed_label"]):
            raise ValueError(f"{case_id}: invalid revised label")
        if decision in {"AMBIGUOUS", "EXCLUDE"} and label is not None:
            raise ValueError(f"{case_id}: unscored review has a label")
        if decision != "CONFIRMED" and not reason.strip():
            raise ValueError(f"{case_id}: non-confirmation needs a reason")
        by_id[case_id] = record
    counts = Counter(record["decision"] for record in decisions)
    if counts != EXPECTED or dict(counts) != {key: value for key, value in raw.get("summary", {}).items() if value}:
        raise ValueError(f"review counts differ: {counts}")
    if by_id["s03-02"].get("reviewed_label") != "unchanged" or by_id["s03-02"]["decision"] != "REVISED":
        raise ValueError("s03-02 revision differs")
    if by_id["s09-03"]["decision"] != "AMBIGUOUS":
        raise ValueError("s09-03 ambiguity differs")
    with csv_path.open(newline="", encoding="utf-8-sig") as source:
        csv_rows = list(csv.DictReader(source))
    if len(csv_rows) != len(cases):
        raise ValueError("CSV cardinality differs")
    csv_map = {}
    for row in csv_rows:
        case_id = row.get("case_id")
        if case_id not in cases or case_id in csv_map:
            raise ValueError(f"unknown/duplicate CSV case ID: {case_id}")
        case = cases[case_id]
        record = by_id[case_id]
        expected_label = record.get("reviewed_label") or ""
        for key, expected in (
            ("proposed_label", case["proposed_label"]),
            ("baseline", case["baseline_requirement"]),
            ("message", case["message"]),
            ("decision", record["decision"]),
            ("reviewed_label", expected_label),
            ("reason", record.get("reason", "")),
        ):
            if row.get(key) != expected:
                raise ValueError(f"{case_id}: CSV {key} differs from candidate/JSON")
        csv_map[case_id] = row
    txt_map, txt_lines = read_text_decisions(txt_path)
    if set(txt_map) != set(cases):
        raise ValueError("TXT IDs do not match candidate")
    for case_id, record in by_id.items():
        if txt_map[case_id] != (record["decision"], record.get("reviewed_label")):
            raise ValueError(f"{case_id}: TXT decision differs from JSON")
    if f"Reviewer: {raw['reviewer']}" not in txt_lines or f"Date: {raw['review_date']}" not in txt_lines:
        raise ValueError("TXT reviewer/date differs")
    if "Author exposure: ACCEPTABLE_WITH_LIMITATION" not in txt_lines:
        raise ValueError("TXT author-exposure assessment differs")
    for case_id in ("s03-02", "s09-03"):
        if by_id[case_id]["reason"] not in txt_path.read_text(encoding="utf-8"):
            raise ValueError(f"{case_id}: TXT reason differs")
    normalized = {
        "role": "PHASE_III_I_5_SELF_ATTESTED_HUMAN_REVIEW_TRANSCRIPTION",
        "source_artifact_sha256": {"json": sha(json_path), "csv": sha(csv_path), "txt": sha(txt_path)},
        "draft_sha256": sha(draft_path),
        "reviewer": raw["reviewer"],
        "review_date": raw["review_date"],
        "review_provenance": raw["review_provenance"],
        "author_exposure_assessment": raw["author_exposure_assessment"],
        "author_exposure_reason": raw["author_exposure_reason"],
        "decisions": [
            {"case_id": case["id"], "decision": by_id[case["id"]]["decision"],
             "reviewed_label": by_id[case["id"]].get("reviewed_label"),
             "review_note": by_id[case["id"]].get("reason", "")}
            for case in draft["cases"]
        ],
    }
    return normalized, counts


def exclusive_write(path, body):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(body)
        target.flush()
        os.fsync(target.fileno())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, default=DEFAULT_DRAFT)
    parser.add_argument("--json", type=Path, required=True)
    parser.add_argument("--csv", type=Path, required=True)
    parser.add_argument("--txt", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    normalized, counts = validate_sources(args.draft, args.json, args.csv, args.txt)
    print(json.dumps({"valid": True, "counts": dict(counts), "candidate_sha256": normalized["draft_sha256"],
                      "source_sha256": normalized["source_artifact_sha256"]}, indent=2))
    if args.check_only:
        return
    if args.out_dir.exists():
        raise FileExistsError("review evidence directory already exists")
    args.out_dir.mkdir(parents=True)
    for name, path in (("source.json", args.json), ("source.csv", args.csv), ("source.txt", args.txt)):
        exclusive_write(args.out_dir / name, path.read_bytes())
    exclusive_write(args.out_dir / "normalized_review_v1.json",
                    (json.dumps(normalized, indent=2, ensure_ascii=False) + "\n").encode())


if __name__ == "__main__":
    main()
