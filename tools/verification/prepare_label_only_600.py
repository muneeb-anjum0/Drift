"""Validate two reviewed 600-case files and freeze private, deterministic partitions.

This script does not establish reviewer independence or label correctness. Those
facts must be recorded as provenance; it only checks the files and split.
"""

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

LABELS = ("added", "ambiguous", "contradiction", "modified", "removed", "unchanged")
FIELDS = (
    "id", "family_id", "domain", "baseline_requirement", "new_client_message",
    "reviewed_label", "reviewer_id", "review_notes",
)
SEED = "drift-label-only-600-v1"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path: Path, expected: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        if tuple(reader.fieldnames or ()) != expected:
            raise ValueError(f"Unexpected columns in {path.name}: {reader.fieldnames}")
        rows = list(reader)
    if len(rows) != 600:
        raise ValueError(f"Expected 600 rows in {path.name}, got {len(rows)}")
    return rows


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("x", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    path.chmod(0o600)


def prepare(review_path: Path, candidate_path: Path, output_dir: Path, reviewer_id: str) -> dict:
    if not reviewer_id.strip() or reviewer_id.casefold() in {"ai", "assistant", "codex"}:
        raise ValueError("A stable human reviewer ID is required")
    review = read_csv(review_path, ("id", "domain", "baseline_requirement", "new_client_message", "final_label"))
    candidates = read_csv(candidate_path, ("id", "family_id", "domain", "baseline_requirement", "new_client_message", "Final_label"))
    ids: set[str] = set()
    families: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    normalized: list[dict[str, str]] = []
    for line, (source, candidate) in enumerate(zip(review, candidates), start=2):
        for field in ("id", "domain", "baseline_requirement", "new_client_message"):
            if not source[field].strip() or source[field] != candidate[field]:
                raise ValueError(f"Line {line}: empty or mismatched {field}")
        case_id = source["id"]
        family = candidate["family_id"].strip()
        label = source["final_label"].strip()
        pair = (source["baseline_requirement"].strip().casefold(), source["new_client_message"].strip().casefold())
        if case_id in ids or not family or family in families or pair in pairs:
            raise ValueError(f"Line {line}: duplicate ID, family, or text pair")
        if label not in LABELS or candidate["Final_label"].strip() != label:
            raise ValueError(f"Line {line}: invalid or mismatched final label")
        ids.add(case_id)
        families.add(family)
        pairs.add(pair)
        normalized.append({
            "id": case_id, "family_id": family, "domain": source["domain"],
            "baseline_requirement": source["baseline_requirement"],
            "new_client_message": source["new_client_message"],
            "reviewed_label": label, "reviewer_id": reviewer_id.strip(), "review_notes": "",
        })
    counts = Counter(row["reviewed_label"] for row in normalized)
    if counts != Counter({label: 100 for label in LABELS}):
        raise ValueError(f"Expected 100 cases per label, got {dict(counts)}")
    if output_dir.exists():
        raise FileExistsError(f"Output already exists; preserve it: {output_dir}")
    output_dir.mkdir(parents=True, mode=0o700)
    output_dir.chmod(0o700)
    partitions: dict[str, list[dict[str, str]]] = {"train": [], "development": [], "locked_test": []}
    for label in LABELS:
        cases = [row for row in normalized if row["reviewed_label"] == label]
        cases.sort(key=lambda row: hashlib.sha256(f"{SEED}:{label}:{row['family_id']}:{row['id']}".encode()).hexdigest())
        partitions["train"].extend(cases[:50])
        partitions["development"].extend(cases[50:75])
        partitions["locked_test"].extend(cases[75:])
    write_csv(output_dir / "reviewed.csv", normalized)
    for name, rows in partitions.items():
        write_csv(output_dir / f"{name}.csv", rows)
    manifest = {
        "status": "local_reviewed_split_not_authorized_for_model_use",
        "seed": SEED,
        "source_sha256": {review_path.name: sha256(review_path), candidate_path.name: sha256(candidate_path)},
        "review_provenance": {
            "reviewer_id": reviewer_id.strip(),
            "independent_review": "reported_by_user_not_verified_by_files",
            "proposed_label_changes": "latest_user_statement_none_earlier_statement_some_original_proposals_unavailable",
            "case_author": "not_recorded",
        },
        "partitions": {
            name: {"rows": len(rows), "class_counts": dict(sorted(Counter(row["reviewed_label"] for row in rows).items())),
                   "sha256": sha256(output_dir / f"{name}.csv")}
            for name, rows in partitions.items()
        },
        "reviewed_sha256": sha256(output_dir / "reviewed.csv"),
        "old_phase_iii_j_final_holdout": "sealed_not_used",
    }
    manifest_path = output_dir / "manifest.json"
    with manifest_path.open("x", encoding="utf-8") as stream:
        json.dump(manifest, stream, indent=2, sort_keys=True)
        stream.write("\n")
    manifest_path.chmod(0o600)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_sheet", type=Path)
    parser.add_argument("labeled_candidates", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--reviewer-id", required=True)
    args = parser.parse_args()
    manifest = prepare(args.review_sheet, args.labeled_candidates, args.output_dir, args.reviewer_id)
    print(json.dumps({"output_dir": str(args.output_dir), "partitions": manifest["partitions"],
                      "status": manifest["status"]}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
