#!/usr/bin/env python3
"""Fail-closed review/split freeze for newly authored Phase III-J cases."""

import argparse
import csv
import hashlib
import json
import os
import re
from collections import Counter
from datetime import date
from pathlib import Path

from phase3j_audit_training import ARCHIVE, ROOT, csv_rows, message, normalize, pair, sft_rows, sha256


LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
PARTITIONS = {"train", "development", "final"}
DECISIONS = {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"}
CASE_COLUMNS = {"id", "partition", "family_id", "domain", "baseline_requirement", "message",
                "proposed_label", "author", "authored_date", "source_license",
                "privacy_classification", "kaggle_upload_approved"}
REVIEW_COLUMNS = {"case_id", "decision", "reviewed_label", "reason", "reviewer",
                  "review_date", "review_provenance"}
LEGACY_CASE_ID = re.compile(r"[a-z0-9][a-z0-9_-]{2,63}")
PARTITION_ID_PREFIX = {"train": "TR", "development": "DV", "final": "FH"}
NUMBERED_CASE_ID = re.compile(r"(TR|DV|FH)[0-9]{4,}")


def valid_case_id(case_id, partition):
    """Accept original template IDs and the supplied partition-numbered IDs."""
    if not isinstance(case_id, str) or not case_id:
        return False
    if LEGACY_CASE_ID.fullmatch(case_id):
        return True
    numbered = NUMBERED_CASE_ID.fullmatch(case_id)
    return bool(numbered and numbered.group(1) == PARTITION_ID_PREFIX.get(partition))


def read_csv(path, required):
    with path.open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError(f"required CSV columns missing: {path}")
        rows = list(reader)
    if not rows:
        raise ValueError(f"empty input: {path}")
    return rows


def date_value(value, field):
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"invalid {field}; expected YYYY-MM-DD") from error


def closed_keys():
    pairs = set()
    messages = set()
    for relative in ("evaluation/phase_iii_i/decision_reviewed_v1.json",
                     "evaluation/phase_iii_i_5/reviewed_frozen_v1.json"):
        for row in json.loads((ROOT / relative).read_text())["cases"]:
            pairs.add(pair(row))
            messages.add(message(row))
    for relative in ("evaluation/phase_iii_d/retrieval_independent_v1.json",
                     "evaluation/phase_iii_e/retrieval_independent_v1.json"):
        for project in json.loads((ROOT / relative).read_text())["projects"]:
            for query in project["queries"]:
                messages.add(normalize(query["message"]))
    return pairs, messages


def closed_classifier_rows():
    rows = []
    for relative in ("evaluation/phase_iii_i/decision_reviewed_v1.json",
                     "evaluation/phase_iii_i_5/reviewed_frozen_v1.json"):
        rows.extend(json.loads((ROOT / relative).read_text())["cases"])
    return rows


def historical_train_pairs(archive=ARCHIVE):
    csv_train = csv_rows(archive / "data/train/driftledger_train.csv")
    sft_train = sft_rows(archive / "data/train/qwen_sft_train.jsonl")
    return {pair(row) for row in csv_train + sft_train}


def pair_near(left, right):
    left_baseline = set(normalize(left["baseline_requirement"]).split())
    right_baseline = set(normalize(right["baseline_requirement"]).split())
    left_message = set(message(left).split())
    right_message = set(message(right).split())

    def jac(one, two):
        return len(one & two) / len(one | two) if one | two else 0.0

    return jac(left_baseline, right_baseline) >= 0.8 and jac(left_message, right_message) >= 0.8


def validate(cases, decisions, min_final_per_label=20, protected_pairs=None,
             protected_messages=None, old_train_pairs=None, protected_rows=None):
    if len(cases) != len({row["id"] for row in cases}):
        raise ValueError("duplicate case IDs")
    if len(decisions) != len({row["case_id"] for row in decisions}):
        raise ValueError("duplicate review decisions")
    ids = {row["id"] for row in cases}
    if ids != {row["case_id"] for row in decisions}:
        raise ValueError("case/review IDs differ; every case needs exactly one decision")
    by_review = {row["case_id"]: row for row in decisions}
    family_partition = {}
    seen_pairs = {}
    seen_messages = {}
    frozen = []
    counts = Counter()
    review_counts = Counter()
    protected_pairs = protected_pairs if protected_pairs is not None else set()
    protected_messages = protected_messages if protected_messages is not None else set()
    old_train_pairs = old_train_pairs if old_train_pairs is not None else set()
    protected_rows = protected_rows if protected_rows is not None else []
    for row in cases:
        case_id = row["id"]
        if not valid_case_id(case_id, row["partition"]):
            raise ValueError(f"unsafe/invalid case ID: {case_id}")
        if row["partition"] not in PARTITIONS or row["proposed_label"] not in LABELS:
            raise ValueError(f"invalid partition/proposed label: {case_id}")
        if any(not isinstance(row[field], str) or not row[field].strip()
               for field in CASE_COLUMNS - {"kaggle_upload_approved"}):
            raise ValueError(f"missing case field: {case_id}")
        if not normalize(row["baseline_requirement"]) or not message(row):
            raise ValueError(f"case has no normalized semantic text: {case_id}")
        if row["kaggle_upload_approved"] not in {"YES", "NO"}:
            raise ValueError(f"invalid Kaggle upload approval: {case_id}")
        authored = date_value(row["authored_date"], "authored_date")
        family = row["family_id"]
        if family in family_partition and family_partition[family] != row["partition"]:
            raise ValueError(f"semantic family crosses partitions: {family}")
        family_partition[family] = row["partition"]
        key = pair(row)
        if key in seen_pairs:
            raise ValueError(f"normalized duplicate pair: {case_id} and {seen_pairs[key]}")
        seen_pairs[key] = case_id
        text = message(row)
        if text in seen_messages and seen_messages[text][0] != row["partition"]:
            raise ValueError(f"identical message crosses partitions: {case_id}")
        seen_messages[text] = (row["partition"], case_id)
        if key in protected_pairs or text in protected_messages:
            raise ValueError(f"exact protected-evaluation overlap: {case_id}")
        if any(pair_near(row, protected) for protected in protected_rows):
            raise ValueError(f"high lexical similarity to protected evaluation: {case_id}")
        if key in old_train_pairs:
            raise ValueError(f"not freshly authored: exact historical-train pair {case_id}")
        review = by_review[case_id]
        if any(not isinstance(review[field], str) or not review[field].strip() for field in
               ("decision", "reviewer", "review_date", "review_provenance")):
            raise ValueError(f"missing review metadata: {case_id}")
        reviewed_on = date_value(review["review_date"], "review_date")
        if reviewed_on < authored:
            raise ValueError(f"review predates authorship: {case_id}")
        decision = review["decision"]
        label = review["reviewed_label"] or None
        if decision not in DECISIONS:
            raise ValueError(f"invalid review decision: {case_id}")
        if decision == "CONFIRMED" and label != row["proposed_label"]:
            raise ValueError(f"CONFIRMED label differs: {case_id}")
        if decision == "REVISED" and (label not in LABELS or label == row["proposed_label"]):
            raise ValueError(f"REVISED needs a different canonical label: {case_id}")
        if decision in {"AMBIGUOUS", "EXCLUDE"} and label is not None:
            raise ValueError(f"unscored decision has label: {case_id}")
        if decision != "CONFIRMED" and not (review["reason"] or "").strip():
            raise ValueError(f"non-confirmation needs reason: {case_id}")
        if decision in {"CONFIRMED", "REVISED"} and row["partition"] != "final":
            if row["kaggle_upload_approved"] != "YES":
                raise ValueError(f"train/development row not approved for Kaggle upload: {case_id}")
        review_counts[decision] += 1
        if label:
            counts[(row["partition"], label)] += 1
        frozen.append({**row, "review": {**review, "reviewed_label": label},
                       "primary_scored": label is not None})
    for partition in PARTITIONS:
        for label in LABELS:
            minimum = min_final_per_label if partition == "final" else 1
            if counts[(partition, label)] < minimum:
                raise ValueError(f"insufficient {partition}/{label} support: {counts[(partition, label)]} < {minimum}")
    for index, left in enumerate(frozen):
        for right in frozen[index + 1:]:
            if left["partition"] != right["partition"] and pair_near(left, right):
                raise ValueError(f"high lexical overlap across partitions: {left['id']}, {right['id']}")
    return {
        "role": "PHASE_III_J_REVIEWED_PRETRAINING_CORPUS",
        "status": "REVIEWED_NOT_YET_TRAINED_OR_SCORED",
        "cases": frozen,
        "review_decision_counts": dict(sorted(review_counts.items())),
        "reviewed_class_counts_by_partition": {
            partition: {label: counts[(partition, label)] for label in sorted(LABELS)}
            for partition in sorted(PARTITIONS)},
        "family_count": len(family_partition),
        "provenance_limitation": "Author and reviewer identities are recorded from source files; their independence was not independently witnessed. No human review is claimed by this freeze.",
    }


def save_new(path, value):
    body = (json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + "\n").encode()
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(descriptor, "wb") as output:
        output.write(body)
    return hashlib.sha256(body).hexdigest()


def partition_for_freeze(frozen):
    train_dev = [case for case in frozen["cases"] if case["partition"] != "final"]
    final = [case for case in frozen["cases"] if case["partition"] == "final"]
    final_bytes = (json.dumps(final, indent=2, ensure_ascii=False, sort_keys=True) + "\n").encode()
    return {
        "role": "PHASE_III_J_REVIEWED_TRAIN_DEVELOPMENT_ONLY",
        "status": "REVIEWED_NOT_YET_TRAINED",
        "cases": train_dev,
        "review_decision_counts_all_partitions": frozen["review_decision_counts"],
        "reviewed_class_counts_by_partition": {key: value for key, value in
                                               frozen["reviewed_class_counts_by_partition"].items()
                                               if key != "final"},
        "provenance_limitation": frozen["provenance_limitation"],
    }, hashlib.sha256(final_bytes).hexdigest(), len(final)


def canonical_json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + "\n").encode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", required=True, type=Path, nargs="+")
    parser.add_argument("--review", required=True, type=Path, nargs="+")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--sealed-final-path", required=True, type=Path,
                        help="Local final payload path outside the Git repository")
    parser.add_argument("--min-final-per-label", type=int, default=20)
    args = parser.parse_args()
    if args.min_final_per_label < 1:
        raise ValueError("minimum final support must be positive")
    cases = [row for path in args.cases for row in read_csv(path, CASE_COLUMNS)]
    decisions = [row for path in args.review for row in read_csv(path, REVIEW_COLUMNS)]
    protected_pairs, protected_messages = closed_keys()
    frozen = validate(cases, decisions, args.min_final_per_label, protected_pairs,
                      protected_messages, historical_train_pairs(), closed_classifier_rows())
    if args.sealed_final_path.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("sealed final payload must stay outside the Git repository")
    if not args.sealed_final_path.parent.is_dir():
        raise ValueError("sealed final parent directory must exist")
    corpus_path = args.output_dir / "reviewed_train_dev_v1.json"
    train_path = args.output_dir / "reviewed_train_v1.json"
    development_path = args.output_dir / "reviewed_development_v1.json"
    manifest_path = args.output_dir / "pretraining_manifest_v1.json"
    destinations = (corpus_path, train_path, development_path, manifest_path,
                    args.sealed_final_path)
    if any(path.exists() for path in destinations):
        raise FileExistsError("freeze destination exists; refusing overwrite")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    train_dev, final_sha, final_count = partition_for_freeze(frozen)
    final_cases = [case for case in frozen["cases"] if case["partition"] == "final"]
    if hashlib.sha256(canonical_json_bytes(final_cases)).hexdigest() != final_sha:
        raise AssertionError("final seal mismatch")
    final_written_sha = save_new(args.sealed_final_path, final_cases)
    if final_written_sha != final_sha:
        raise AssertionError("written final seal mismatch")
    corpus_sha = save_new(corpus_path, train_dev)
    train_sha = save_new(train_path, [case for case in train_dev["cases"]
                                      if case["partition"] == "train"])
    development_sha = save_new(development_path, [case for case in train_dev["cases"]
                                            if case["partition"] == "development"])
    manifest = {
        "role": "PHASE_III_J_PRETRAINING_FREEZE_MANIFEST",
        "status": "NO_PHASE_III_J_TRAINING_OR_FINAL_INFERENCE_AT_FREEZE",
        "source_case_sha256": [{"file": path.name, "sha256": sha256(path)}
                               for path in args.cases],
        "source_review_sha256": [{"file": path.name, "sha256": sha256(path)}
                                 for path in args.review],
        "reviewed_corpus_sha256": hashlib.sha256(canonical_json_bytes(frozen)).hexdigest(),
        "reviewed_train_sha256": train_sha,
        "reviewed_development_sha256": development_sha,
        "reviewed_train_dev_sha256": corpus_sha,
        "sealed_final_case_count": final_count, "sealed_final_payload_sha256": final_sha,
        "review_decision_counts": frozen["review_decision_counts"],
        "reviewed_class_counts_by_partition": frozen["reviewed_class_counts_by_partition"],
        "family_count": frozen["family_count"],
        "min_final_per_label": args.min_final_per_label,
        "closed_overlap_policy": "Exact normalized pair/message and high lexical classifier-pair similarity rejected; semantic near-overlap still requires separate assessment.",
        "training_zip_policy": "Only reviewed_train_dev_v1.json may enter the training ZIP; final case text stays outside Git and the training ZIP until the candidate and gate are frozen.",
    }
    save_new(manifest_path, manifest)
    print(json.dumps({"cases": len(frozen["cases"]), "sha256": corpus_sha,
                      "counts": frozen["reviewed_class_counts_by_partition"]}, indent=2))


if __name__ == "__main__":
    main()
