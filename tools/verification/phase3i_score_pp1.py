#!/usr/bin/env python3
"""Score the frozen Go PP1 replay separately from Phase III-I raw P1."""

import argparse
import json
from collections import Counter
from pathlib import Path

from phase3h_contracts import LABELS
from phase3i_run_oracle import SHA
from phase3i_score_raw import load_rows, metrics, save_new


def analyze(raw_rows, replay):
    if replay.get("role") != "PHASE_III_I_FROZEN_GO_PP1_REPLAY":
        raise ValueError("unexpected PP1 replay role")
    raw_by_id = {row["case_id"]: row for row in raw_rows}
    replay_rows = replay.get("rows", [])
    if len(replay_rows) != len(raw_rows) or len({row["case_id"] for row in replay_rows}) != len(raw_rows):
        raise ValueError("PP1 replay case count or IDs invalid")
    pp1_rows = []
    effects = Counter()
    changes = []
    for item in replay_rows:
        case_id = item["case_id"]
        if case_id not in raw_by_id:
            raise ValueError(f"unknown PP1 case: {case_id}")
        raw = raw_by_id[case_id]
        if item["truth"] != raw["truth"] or item["raw_label"] != (raw["predicted"] or ""):
            raise ValueError(f"PP1 replay truth/raw mismatch: {case_id}")
        pp1 = item["pp1_label"] or None
        if pp1 not in (None, *LABELS):
            raise ValueError(f"invalid PP1 label: {case_id}")
        fixed = raw["predicted"] != raw["truth"] and pp1 == raw["truth"]
        worsened = raw["predicted"] == raw["truth"] and pp1 != raw["truth"]
        expected_effect = "FIXED" if fixed else "WORSENED" if worsened else "NEUTRAL"
        if item["effect"] != expected_effect or item["changed"] != (raw["predicted"] != pp1):
            raise ValueError(f"PP1 effect mismatch: {case_id}")
        effects[expected_effect] += 1
        if item["changed"]:
            changes.append(case_id)
        pp1_rows.append({**raw, "predicted": pp1})
    if dict(effects) != {key: value for key, value in replay["effect_counts"].items() if value}:
        raise ValueError("PP1 effect count mismatch")
    if len(changes) != replay["changed_labels"]:
        raise ValueError("PP1 changed-label count mismatch")
    return {
        "role": "PHASE_III_I_RAW_VS_FROZEN_GO_PP1",
        "dataset_sha256": SHA["dataset"],
        "raw": metrics(raw_rows),
        "raw_plus_pp1": metrics(pp1_rows),
        "effect_counts": {key: effects[key] for key in ("FIXED", "WORSENED", "NEUTRAL")},
        "changed_label_case_ids": changes,
        "primary_result": "RAW",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-results", type=Path, required=True)
    parser.add_argument("--pp1-replay", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = analyze(load_rows(args.raw_results), json.loads(args.pp1_replay.read_text()))
    save_new(args.output, report)
    print(json.dumps({"effect_counts": report["effect_counts"],
                      "raw_accuracy": report["raw"]["accuracy"],
                      "pp1_accuracy": report["raw_plus_pp1"]["accuracy"]}, sort_keys=True))


if __name__ == "__main__":
    main()
