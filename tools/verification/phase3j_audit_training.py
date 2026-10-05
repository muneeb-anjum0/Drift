#!/usr/bin/env python3
"""Aggregate-only V5 forensics for Phase III-J; emit no source or closed-case text."""

import argparse
import csv
import hashlib
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "archive/drift-dataset-kaggle-v5-cumulative"
LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
SPLITS = ("train", "validation", "test")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize(value):
    return " ".join(re.findall(r"[a-z0-9]+", value.lower()))


def numeric_mask(value):
    return normalize(re.sub(r"\b\d+(?:[.,]\d+)*\b", " NUMBER ", value))


def csv_rows(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.DictReader(source))
    required = {"baseline_requirement", "new_client_message", "label", "id"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"CSV columns missing: {path}")
    return rows


def sft_rows(path):
    rows = []
    with path.open(encoding="utf-8") as source:
        for number, line in enumerate(source, 1):
            if not line.strip():
                continue
            item = json.loads(line)
            messages = item["messages"]
            user = next(value["content"] for value in messages if value["role"] == "user")
            baseline, message = user.split("\nNew client message: ", 1)
            if not baseline.startswith("Baseline requirement: "):
                raise ValueError(f"unknown SFT user format: {path}:{number}")
            answer = json.loads(messages[-1]["content"])
            rows.append({"baseline_requirement": baseline.removeprefix("Baseline requirement: "),
                         "new_client_message": message, "label": answer["label"]})
    return rows


def pair(row):
    return (normalize(row["baseline_requirement"]), message(row))


def message(row):
    value = row["new_client_message"] if "new_client_message" in row else row["message"]
    return normalize(value)


def skeleton(row):
    value = row["new_client_message"] if "new_client_message" in row else row["message"]
    return (numeric_mask(row["baseline_requirement"]), numeric_mask(value))


def metadata_family(row):
    return tuple(row.get(field, "") for field in
                 ("source_dataset", "scenario_mode", "project", "component", "baseline_type"))


def summary(rows, path):
    raw = Counter((row["baseline_requirement"], row["new_client_message"]) for row in rows)
    pairs = Counter(pair(row) for row in rows)
    skeletons = Counter(skeleton(row) for row in rows)
    labels_by_pair = defaultdict(set)
    for row in rows:
        labels_by_pair[pair(row)].add(row["label"])
    result = {
        "sha256": sha256(path), "rows": len(rows),
        "labels": dict(sorted(Counter(row["label"] for row in rows).items())),
        "invalid_labels": sum(row["label"] not in LABELS for row in rows),
        "exact_raw_pair_duplicate_excess": sum(count - 1 for count in raw.values()),
        "normalized_pair_duplicate_excess": sum(count - 1 for count in pairs.values()),
        "numeric_masked_pair_skeleton_duplicate_excess": sum(count - 1 for count in skeletons.values()),
        "normalized_pairs_with_conflicting_labels": sum(len(values) > 1 for values in labels_by_pair.values()),
        "normalized_unique_baselines": len({pair(row)[0] for row in rows}),
        "normalized_unique_messages": len({message(row) for row in rows}),
    }
    if "source_dataset" in rows[0]:
        for field in ("source_dataset", "source_license", "annotation_status", "pairing_method"):
            result[field] = dict(sorted(Counter(row.get(field, "") or "UNSPECIFIED" for row in rows).items()))
        result["metadata_family_proxy_count"] = len({metadata_family(row) for row in rows})
    return result


def jaccard(left, right):
    union = left | right
    return len(left & right) / len(union) if union else 0.0


def lexical_near_rows(train, target, threshold=0.8):
    """Bounded rare-token candidate screen, not a semantic-paraphrase certificate."""
    train_tokens = [(set(normalize(row["baseline_requirement"]).split()),
                     set(message(row).split())) for row in train]
    train_pairs = [pair(row) for row in train]
    frequencies = Counter(token for baseline, note in train_tokens for token in baseline | note)
    index = defaultdict(set)
    for number, (baseline, note) in enumerate(train_tokens):
        for token in baseline | note:
            if frequencies[token] <= 1500:
                index[token].add(number)
    matches = 0
    candidates_examined = 0
    for row in target:
        baseline = set(normalize(row["baseline_requirement"]).split())
        note = set(message(row).split())
        rare = sorted((token for token in baseline | note if token in index),
                      key=lambda token: (frequencies[token], token))[:6]
        candidates = set().union(*(index[token] for token in rare)) if rare else set()
        target_pair = pair(row)
        found = False
        for number in candidates:
            candidates_examined += 1
            if candidates_examined > 3_000_000:
                raise RuntimeError("lexical near-screen comparison guard exceeded")
            old_baseline, old_note = train_tokens[number]
            if target_pair == train_pairs[number]:
                continue
            if (jaccard(baseline, old_baseline) >= threshold and
                    jaccard(note, old_note) >= threshold):
                found = True
                break
        matches += found
    return {"target_rows_with_same_baseline_and_message_token_jaccard_ge_0_8": matches,
            "candidate_comparisons": candidates_examined,
            "limitation": "Rare-token candidate screen; misses possible, not semantic paraphrase proof."}


def closed_overlap(train, sft_train):
    all_pairs = {pair(row) for row in train} | {pair(row) for row in sft_train}
    all_messages = {message(row) for row in train} | {message(row) for row in sft_train}
    result = {}
    for name, path in {
        "phase_iii_i": ROOT / "evaluation/phase_iii_i/decision_reviewed_v1.json",
        "phase_iii_i_5": ROOT / "evaluation/phase_iii_i_5/reviewed_frozen_v1.json",
    }.items():
        rows = json.loads(path.read_text())["cases"]
        result[name] = {"sha256": sha256(path), "cases": len(rows),
                        "exact_normalized_pair_overlap": sum(pair(row) in all_pairs for row in rows),
                        "exact_normalized_message_overlap": sum(message(row) in all_messages for row in rows)}
    for name, path in {
        "phase_iii_d": ROOT / "evaluation/phase_iii_d/retrieval_independent_v1.json",
        "phase_iii_e": ROOT / "evaluation/phase_iii_e/retrieval_independent_v1.json",
    }.items():
        queries = [query for project in json.loads(path.read_text())["projects"]
                   for query in project["queries"]]
        result[name] = {"sha256": sha256(path), "queries": len(queries),
                        "exact_normalized_query_message_overlap": sum(
                            normalize(query["message"]) in all_messages for query in queries)}
    return result


def audit(archive):
    csv_data = {}
    sft_data = {}
    csv_report = {}
    sft_report = {}
    for split in SPLITS:
        short = "val" if split == "validation" else split
        csv_path = archive / "data" / split / f"driftledger_{short}.csv"
        sft_path = archive / "data" / split / f"qwen_sft_{short}.jsonl"
        csv_data[split] = csv_rows(csv_path)
        sft_data[split] = sft_rows(sft_path)
        csv_report[split] = summary(csv_data[split], csv_path)
        sft_report[split] = summary(sft_data[split], sft_path)
    cross = {}
    for name, data in (("csv", csv_data), ("sft", sft_data)):
        train_pairs = {pair(row) for row in data["train"]}
        train_skeletons = {skeleton(row) for row in data["train"]}
        train_messages = {message(row) for row in data["train"]}
        train_metadata_families = {metadata_family(row) for row in data["train"]}
        cross[name] = {}
        for split in ("validation", "test"):
            target = data[split]
            cross[name][split] = {
                "exact_normalized_pair_overlap": len(train_pairs & {pair(row) for row in target}),
                "numeric_masked_pair_skeleton_overlap": len(train_skeletons & {skeleton(row) for row in target}),
                "exact_normalized_message_overlap": len(train_messages & {message(row) for row in target}),
                "lexical_near_screen": lexical_near_rows(data["train"], target),
            }
            if name == "csv":
                cross[name][split]["metadata_family_proxy_keys_shared_with_train"] = len(
                    train_metadata_families & {metadata_family(row) for row in target})
                cross[name][split]["target_rows_in_shared_metadata_family_proxy"] = sum(
                    metadata_family(row) in train_metadata_families for row in target)
    return {
        "role": "PHASE_III_J_PRETRAINING_AGGREGATE_FORENSICS",
        "archive_role": "USER_SUPPLIED_UNTRACKED_READ_ONLY",
        "csv": csv_report, "sft": sft_report, "cross_split": cross,
        "sft_train_pairs_absent_from_csv_train": len(
            {pair(row) for row in sft_data["train"]} - {pair(row) for row in csv_data["train"]}),
        "closed_eval_overlap_aggregate_only": closed_overlap(csv_data["train"], sft_data["train"]),
        "limitations": [
            "No source or protected case text is emitted.",
            "Exact and lexical screens do not certify semantic independence or recover family IDs.",
            "Numeric-masked skeletons are a template proxy, not a semantic-family definition.",
            "Archive-to-historical-adapter training-byte identity remains unproven.",
            "No historical training row is approved for automatic reuse by this audit.",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, default=ARCHIVE)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.archive.resolve())
    body = (json.dumps(result, indent=2, sort_keys=True) + "\n").encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(args.output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(descriptor, "wb") as output:
        output.write(body)
    print(json.dumps({"csv_train": result["csv"]["train"]["rows"],
                      "sft_train": result["sft"]["train"]["rows"],
                      "cross_split": result["cross_split"]}, indent=2))


if __name__ == "__main__":
    main()
