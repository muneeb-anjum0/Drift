#!/usr/bin/env python3
"""One bounded repeat per preregistered Phase III-I stability case."""

import argparse
import hashlib
import json
import time
from pathlib import Path

from phase3h_contracts import p1_prompt, validate_raw
from phase3i_run_oracle import DATASET, REQUEST, ROOT, SHA, case_path, memory_kib, preflight, request, save_new, sha256

SELECTION = ROOT / "evaluation/phase_iii_i/stability_selection_v1.json"
SELECTION_SHA = "b741867a9dfa11f9a048ca9d5915ba32db4d24d020eb661a49ae0c1d09f456c5"


def selected():
    if sha256(SELECTION) != SELECTION_SHA:
        raise RuntimeError("stability selection changed")
    selection = json.loads(SELECTION.read_text())
    if selection.get("dataset_sha256") != SHA["dataset"] or selection.get("repeats_per_case") != 1:
        raise RuntimeError("stability selection contract changed")
    corpus = json.loads(DATASET.read_text())
    cases = {case["id"]: case for case in corpus["cases"]}
    chosen = [case_id for ids in selection["case_ids_by_class"].values() for case_id in ids]
    if len(chosen) != 12 or len(set(chosen)) != 12 or any(case_id not in cases for case_id in chosen):
        raise RuntimeError("stability selection invalid")
    return [cases[case_id] for case_id in chosen]


def run(primary_dir, output_dir):
    checks = preflight()
    cases = selected()
    all_cases = json.loads(DATASET.read_text())["cases"]
    for case in all_cases:
        primary = case_path(primary_dir, case["id"])
        if not primary.exists():
            raise RuntimeError("primary run incomplete; stability must follow scoring")
    if not (ROOT / "evaluation/phase_iii_i/raw_metrics_v1.json").exists():
        raise RuntimeError("primary raw score missing; stability must follow scoring")
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = output_dir / "manifest.json"
    expected = {"checks": checks, "selection_sha256": SELECTION_SHA,
                "primary_metrics_sha256": sha256(ROOT / "evaluation/phase_iii_i/raw_metrics_v1.json")}
    if manifest.exists():
        if json.loads(manifest.read_text()) != expected:
            raise RuntimeError("stability resume manifest mismatch")
    else:
        save_new(manifest, expected)
    for case in cases:
        path = case_path(output_dir, case["id"])
        if path.exists():
            row = json.loads(path.read_text())
            if row.get("case_id") != case["id"] or row.get("dataset_sha256") != SHA["dataset"]:
                raise RuntimeError(f"stability record mismatch: {path}")
            continue
        before = memory_kib()
        if before["MemAvailable"] < 4 * 1024 * 1024:
            raise RuntimeError(f"resource guard stopped before {case['id']}")
        prompt = p1_prompt(case["baseline_requirement"], case["message"])
        tokenized = request("/tokenize", {"content": prompt, "add_special": False}, timeout=30)
        if len(tokenized["tokens"]) > 568:
            raise RuntimeError(f"prompt over budget: {case['id']}")
        started = time.monotonic()
        response = request("/completion", {"prompt": prompt, **REQUEST})
        validation = validate_raw(
            response.get("content", ""), "p1_single_v1",
            stopped_limit=response.get("stop_type") == "limit" or response.get("stopped_limit", False),
            generated_tokens=response.get("tokens_predicted"), output_budget=120,
        )
        row = {
            "case_id": case["id"], "dataset_sha256": SHA["dataset"],
            "reviewed_ground_truth": case["review"]["reviewed_label"],
            "primary_label": json.loads(case_path(primary_dir, case["id"]).read_text())["raw_predicted_class"],
            "repeat_label": validation["parsed"]["label"] if validation["valid"] else None,
            "validation": validation, "raw_text": response.get("content", ""),
            "raw_response": response, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
            "latency_seconds": round(time.monotonic() - started, 3),
            "memory_kib_before": before, "memory_kib_after": memory_kib(),
        }
        save_new(path, row)
        print(f"{case['id']}: primary={row['primary_label']} repeat={row['repeat_label']}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--execute-inference", action="store_true", required=True)
    args = parser.parse_args()
    run(args.primary_dir, args.output_dir)


if __name__ == "__main__":
    main()
