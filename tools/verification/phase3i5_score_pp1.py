#!/usr/bin/env python3
"""Score frozen Go PP1 replay as an ablation, separate from raw P1."""

import argparse
import json
from collections import Counter
from pathlib import Path

from phase3h_contracts import LABELS
from phase3i5_run_oracle import CORPUS
from phase3i5_score_raw import load_rows, primary_metrics, save_new
from phase3i_run_oracle import sha256


def analyze(raw_rows, replay):
    if replay.get("role") != "PHASE_III_I_5_FROZEN_GO_PP1_REPLAY":
        raise ValueError("unexpected PP1 replay role")
    by_id = {row["case_id"]: row for row in raw_rows}
    items = replay.get("rows", [])
    if len(items) != len(raw_rows) or len({item["case_id"] for item in items}) != len(items):
        raise ValueError("PP1 replay count or IDs invalid")
    pp1_rows = []
    effects = Counter()
    changed = []
    for item in items:
        case_id = item["case_id"]
        if case_id not in by_id:
            raise ValueError(f"unknown PP1 case: {case_id}")
        raw = by_id[case_id]
        if item["truth"] != (raw["truth"] or "") or item["raw_label"] != (raw["predicted"] or ""):
            raise ValueError(f"PP1 truth/raw mismatch: {case_id}")
        pp1 = item["pp1_label"] or None
        if pp1 not in (None, *LABELS):
            raise ValueError(f"invalid PP1 label: {case_id}")
        effect = "UNSCORED"
        if raw["primary_scored"]:
            fixed = raw["predicted"] != raw["truth"] and pp1 == raw["truth"]
            worsened = raw["predicted"] == raw["truth"] and pp1 != raw["truth"]
            effect = "FIXED" if fixed else "WORSENED" if worsened else "NEUTRAL"
            effects[effect] += 1
        if item["effect"] != effect or item["changed"] != (raw["predicted"] != pp1):
            raise ValueError(f"PP1 effect mismatch: {case_id}")
        if item["changed"]:
            changed.append(case_id)
        pp1_rows.append({**raw, "predicted": pp1})
    if ({key: effects[key] for key in ("FIXED", "WORSENED", "NEUTRAL")} != replay["effect_counts"]
            or len(changed) != replay["changed_labels"] or replay["scored_rows"] != 215):
        raise ValueError("PP1 summary mismatch")
    corpus_sha = sha256(CORPUS)
    return {"role": "PHASE_III_I_5_RAW_VS_FROZEN_GO_PP1", "dataset_sha256": corpus_sha,
            "primary_result": "RAW", "raw": primary_metrics(raw_rows, corpus_sha),
            "raw_plus_pp1": primary_metrics(pp1_rows, corpus_sha),
            "effect_counts": {key: effects[key] for key in ("FIXED", "WORSENED", "NEUTRAL")},
            "changed_label_case_ids": changed}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-results", type=Path, required=True)
    parser.add_argument("--pp1-replay", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    _, rows = load_rows(args.raw_results)
    result = analyze(rows, json.loads(args.pp1_replay.read_text()))
    save_new(args.output, result)
    print(json.dumps({"effects": result["effect_counts"],
                      "raw_correct": result["raw"]["correct_cases"],
                      "pp1_correct": result["raw_plus_pp1"]["correct_cases"]}))


if __name__ == "__main__":
    main()
