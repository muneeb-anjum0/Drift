"""Validate a new human-reviewed label-only CSV without reading old research data."""

import argparse
import csv
from collections import Counter
from pathlib import Path

LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
FIELDS = (
    "id", "family_id", "domain", "baseline_requirement", "new_client_message",
    "reviewed_label", "reviewer_id", "review_notes",
)


def validate(path: Path, require_review: bool) -> tuple[int, Counter[str]]:
    errors: list[str] = []
    counts: Counter[str] = Counter()
    ids: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        if tuple(reader.fieldnames or ()) != FIELDS:
            raise ValueError(f"Expected columns, in order: {', '.join(FIELDS)}")
        for line, row in enumerate(reader, start=2):
            case_id = row["id"].strip()
            pair = (row["baseline_requirement"].strip().casefold(), row["new_client_message"].strip().casefold())
            if not case_id or case_id in ids:
                errors.append(f"line {line}: missing or duplicate id")
            ids.add(case_id)
            if not row["family_id"].strip() or not row["domain"].strip() or not all(pair):
                errors.append(f"line {line}: missing family, domain, or task text")
            if pair in pairs:
                errors.append(f"line {line}: duplicate requirement/message pair")
            pairs.add(pair)
            label = row["reviewed_label"].strip().lower()
            reviewer = row["reviewer_id"].strip()
            if label:
                if label not in LABELS:
                    errors.append(f"line {line}: invalid reviewed label")
                else:
                    counts[label] += 1
                if not reviewer or reviewer.casefold() in {"codex", "ai", "assistant"}:
                    errors.append(f"line {line}: independent human reviewer_id required")
            elif require_review:
                errors.append(f"line {line}: case has no reviewed label")
            if reviewer and not label:
                errors.append(f"line {line}: reviewer_id without a reviewed label")
    if not ids:
        errors.append("no cases")
    if errors:
        raise ValueError("\n".join(errors))
    return len(ids), counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("--require-review", action="store_true")
    args = parser.parse_args()
    total, counts = validate(args.csv_file, args.require_review)
    print(f"VALID: {total} unique cases; reviewed class counts: {dict(sorted(counts.items()))}")


if __name__ == "__main__":
    main()
