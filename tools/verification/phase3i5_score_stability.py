#!/usr/bin/env python3
"""Summarize the preselected Phase III-I.5 one-repeat stability run."""

import argparse
import json
import statistics
from collections import Counter
from pathlib import Path

from phase3h_contracts import validate_raw
from phase3i_run_oracle import case_path, sha256
from phase3i5_run_oracle import CORPUS, SELECTION
from phase3i5_score_raw import save_new


def analyze(primary_dir, repeat_dir):
    corpus_sha = sha256(CORPUS)
    selection = json.loads(SELECTION.read_text())
    if selection.get("corpus_sha256") != corpus_sha or selection.get("selection_count") != 24:
        raise ValueError("stability selection/corpus mismatch")
    case_ids = selection["case_ids"]
    expected = set(case_ids)
    files = {path.stem for path in repeat_dir.glob("*.json") if path.name != "manifest.json"}
    if files != expected:
        raise ValueError(f"stability files incomplete/unexpected: {sorted(expected-files)}, {sorted(files-expected)}")
    manifest = json.loads((repeat_dir / "manifest.json").read_text())
    if manifest["preflight"]["corpus_sha256"] != corpus_sha or manifest["selection_sha256"] != sha256(SELECTION):
        raise ValueError("repeat manifest mismatch")
    rows = []
    for case_id in case_ids:
        primary = json.loads(case_path(primary_dir, case_id).read_text())
        repeat = json.loads(case_path(repeat_dir, case_id).read_text())
        if (repeat.get("case_id") != case_id or repeat.get("dataset_sha256") != corpus_sha
                or repeat.get("primary_label") != primary.get("raw_predicted_class")
                or repeat.get("reviewed_ground_truth") != primary.get("reviewed_ground_truth")
                or repeat.get("prompt_sha256") != primary.get("prompt_sha256")):
            raise ValueError(f"repeat provenance mismatch: {case_id}")
        response = repeat["raw_response"]
        validation = validate_raw(
            repeat["raw_text"], "p1_single_v1",
            stopped_limit=response.get("stop_type") == "limit" or response.get("stopped_limit", False),
            generated_tokens=response.get("tokens_predicted"), output_budget=120,
        )
        if validation != repeat["validation"]:
            raise ValueError(f"repeat structural replay mismatch: {case_id}")
        label = validation["parsed"]["label"] if validation["valid"] else None
        if repeat["repeat_label"] != label:
            raise ValueError(f"repeat label/parser mismatch: {case_id}")
        truth = repeat["reviewed_ground_truth"]
        rows.append({"case_id": case_id, "truth": truth,
                     "primary_label": repeat["primary_label"], "repeat_label": label,
                     "labels_agree": label == repeat["primary_label"],
                     "primary_correct": repeat["primary_label"] == truth,
                     "repeat_correct": label == truth,
                     "repeat_structurally_valid": validation["valid"],
                     "latency_seconds": repeat["latency_seconds"]})
    agreements = sum(row["labels_agree"] for row in rows)
    patterns = Counter((row["primary_correct"], row["repeat_correct"]) for row in rows)
    return {"role": "PHASE_III_I_5_PRESELECTED_STABILITY", "dataset_sha256": corpus_sha,
            "selection_sha256": sha256(SELECTION), "selected_count": len(rows),
            "exact_label_agreement": agreements, "exact_label_agreement_rate": agreements / len(rows),
            "repeat_structurally_valid": sum(row["repeat_structurally_valid"] for row in rows),
            "correctness_patterns": {"correct_both": patterns[(True, True)],
                                     "primary_only": patterns[(True, False)],
                                     "repeat_only": patterns[(False, True)],
                                     "wrong_both": patterns[(False, False)]},
            "latency_seconds_total": sum(row["latency_seconds"] for row in rows),
            "latency_seconds_median": statistics.median(row["latency_seconds"] for row in rows),
            "rows": rows, "primary_score_unchanged": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary-dir", type=Path, required=True)
    parser.add_argument("--repeat-dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    summary = analyze(args.primary_dir, args.repeat_dir)
    save_new(args.out, summary)
    print(json.dumps({key: summary[key] for key in
                      ("selected_count", "exact_label_agreement", "correctness_patterns")}, indent=2))


if __name__ == "__main__":
    main()
