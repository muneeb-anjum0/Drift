#!/usr/bin/env python3
"""Read-only aggregate audit of the user-supplied V5 archive; emit no raw cases."""

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
SPLITS = ("train", "validation", "test")


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def norm(value):
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").lower()))


def tokens(value):
    return set(norm(value).split())


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        yield from csv.DictReader(source)


def sft_counts(path):
    counts = Counter()
    bad = 0
    pairs = set()
    baselines = defaultdict(list)
    pair_duplicate_excess = 0
    user_parse_failures = 0
    with path.open(encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            row = json.loads(line)
            messages = row.get("messages", [])
            try:
                answer = json.loads(messages[-1]["content"])
                label = answer["label"]
                if label not in LABELS:
                    bad += 1
                else:
                    counts[label] += 1
            except (IndexError, KeyError, TypeError, ValueError):
                bad += 1
            try:
                user = next(message["content"] for message in messages if message["role"] == "user")
                baseline, message = user.split("\nNew client message: ", 1)
                if not baseline.startswith("Baseline requirement: "):
                    raise ValueError("unknown SFT user format")
                key = (norm(baseline.removeprefix("Baseline requirement: ")), norm(message))
                if key in pairs:
                    pair_duplicate_excess += 1
                pairs.add(key)
                baselines[key[0]].append((key[1], tokens(key[1])))
            except (IndexError, KeyError, TypeError, ValueError, StopIteration):
                user_parse_failures += 1
    summary = {"rows": sum(counts.values()) + bad, "labels": dict(sorted(counts.items())),
               "invalid_assistant_label_or_json": bad, "unparsed_user_pairs": user_parse_failures,
               "normalized_pair_duplicate_excess": pair_duplicate_excess}
    return summary, pairs, baselines


def audit(root):
    paths = {name: root / "data" / name / f"driftledger_{'val' if name == 'validation' else name}.csv"
             for name in SPLITS}
    paths["full"] = root / "data/full/driftledger_full.csv"
    by_split = {}
    pair_sets = {}
    id_sets = {}
    train_by_baseline = defaultdict(list)
    template_by_split = {}
    rows_by_split = {}
    for split, path in paths.items():
        label_counts = Counter()
        sources = Counter()
        scenarios = Counter()
        pair_counts = Counter()
        baseline_counts = Counter()
        message_counts = Counter()
        template_counts = Counter()
        ids = set()
        duplicate_ids = 0
        rows = []
        first_two = defaultdict(Counter)
        for row in read_csv(path):
            label = row.get("label", "")
            label_counts[label] += 1
            sources[row.get("source_dataset", "") or "UNKNOWN"] += 1
            scenarios[row.get("scenario_mode", "") or "UNKNOWN"] += 1
            baseline = norm(row.get("baseline_requirement", ""))
            message = norm(row.get("new_client_message", ""))
            pair_counts[(baseline, message)] += 1
            baseline_counts[baseline] += 1
            message_counts[message] += 1
            template = re.sub(r"\b\d+(?:\.\d+)?\b", "#", message)
            template_counts[template] += 1
            prefix = " ".join(message.split()[:2])
            first_two[prefix][label] += 1
            rid = row.get("id", "")
            if rid in ids:
                duplicate_ids += 1
            ids.add(rid)
            if split == "train":
                train_by_baseline[baseline].append((message, tokens(message)))
            elif split != "full":
                rows.append((baseline, message, tokens(message), template))
        rows_by_split[split] = rows
        pair_sets[split] = set(pair_counts)
        id_sets[split] = ids
        template_by_split[split] = set(template_counts)
        shortcuts = sorted(
            ({"prefix": prefix, "rows": sum(class_counts.values()),
              "dominant_label": class_counts.most_common(1)[0][0],
              "purity": round(class_counts.most_common(1)[0][1] / sum(class_counts.values()), 3)}
             for prefix, class_counts in first_two.items() if sum(class_counts.values()) >= 20),
            key=lambda item: (-item["rows"], item["prefix"]))[:15]
        by_split[split] = {
            "rows": sum(label_counts.values()), "labels": dict(sorted(label_counts.items())),
            "invalid_class_rows": sum(n for label, n in label_counts.items() if label not in LABELS),
            "source_dataset": dict(sorted(sources.items())),
            "scenario_mode": dict(sorted(scenarios.items())),
            "duplicate_ids": duplicate_ids,
            "exact_duplicate_pair_excess": sum(count - 1 for count in pair_counts.values() if count > 1),
            "normalized_unique_baselines": len(baseline_counts),
            "normalized_unique_messages": len(message_counts),
            "reused_baseline_rows": sum(count - 1 for count in baseline_counts.values() if count > 1),
            "reused_message_rows": sum(count - 1 for count in message_counts.values() if count > 1),
            "numeric_mask_template_duplicate_excess": sum(count - 1 for count in template_counts.values()
                                                           if count > 1),
            "frequent_first_two_token_prefixes": shortcuts,
            "sha256": sha(path),
        }
    overlap = {}
    for target in ("validation", "test"):
        near_rows = 0
        candidate_comparisons = 0
        for baseline, message, words, _ in rows_by_split[target]:
            if (baseline, message) in pair_sets["train"]:
                continue
            for train_message, train_words in train_by_baseline.get(baseline, []):
                candidate_comparisons += 1
                if candidate_comparisons > 2_000_000:
                    raise RuntimeError("near-duplicate audit comparison guard exceeded")
                union = len(words | train_words)
                if union and len(words & train_words) / union >= 0.8:
                    near_rows += 1
                    break
        overlap[target] = {
            "exact_normalized_pair_keys_shared_with_train": len(pair_sets[target] & pair_sets["train"]),
            "id_keys_shared_with_train": len(id_sets[target] & id_sets["train"]),
            "numeric_mask_template_keys_shared_with_train": len(template_by_split[target] & template_by_split["train"]),
            "same_baseline_near_message_rows_jaccard_ge_0_8_excluding_exact": near_rows,
            "near_candidate_comparisons": candidate_comparisons,
        }
    sft = {}
    sft_pairs = {}
    sft_by_baseline = {}
    for split in (*SPLITS, "full"):
        path = root / "data" / split / f"qwen_sft_{'val' if split == 'validation' else split}.jsonl"
        summary, sft_pairs[split], sft_by_baseline[split] = sft_counts(path)
        sft[split] = {**summary, "sha256": sha(path),
                      "pair_keys_not_in_corresponding_csv": len(sft_pairs[split] - pair_sets[split])}
    sft_overlap = {}
    for target in ("validation", "test"):
        near_rows = 0
        comparisons = 0
        for baseline, message in sft_pairs[target] - sft_pairs["train"]:
            words = tokens(message)
            for train_message, train_words in sft_by_baseline["train"].get(baseline, []):
                comparisons += 1
                if comparisons > 2_000_000:
                    raise RuntimeError("SFT near-duplicate audit comparison guard exceeded")
                union = len(words | train_words)
                if union and len(words & train_words) / union >= 0.8:
                    near_rows += 1
                    break
        sft_overlap[target] = {
            "exact_normalized_pair_keys_shared_with_train": len(sft_pairs[target] & sft_pairs["train"]),
            "same_baseline_near_message_pair_keys_jaccard_ge_0_8_excluding_exact": near_rows,
            "near_candidate_comparisons": comparisons,
        }
    return {"archive_role": "USER_SUPPLIED_UNTRACKED_READ_ONLY", "archive_root": str(root),
            "csv": by_split, "sft": sft, "cross_split_overlap": overlap,
            "sft_cross_split_overlap": sft_overlap,
            "caveats": ["No raw text emitted", "Numeric-mask templates are only one leakage proxy",
                        "Same-baseline near audit does not cover paraphrased baselines",
                        "Archive-to-adapter byte identity is not proven by checkpoint metadata"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("refusing to overwrite audit report")
    result = audit(args.archive.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"csv_rows": {name: item["rows"] for name, item in result["csv"].items()},
                      "sft_rows": {name: item["rows"] for name, item in result["sft"].items()},
                      "cross_split_overlap": result["cross_split_overlap"],
                      "sft_cross_split_overlap": result["sft_cross_split_overlap"]}, indent=2))


if __name__ == "__main__":
    main()
