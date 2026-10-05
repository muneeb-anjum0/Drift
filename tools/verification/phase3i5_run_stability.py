#!/usr/bin/env python3
"""One preselected repeat per Phase III-I.5 stability case, after raw scoring."""

import argparse
import hashlib
import json
import time
from pathlib import Path

from phase3h_contracts import p1_prompt, validate_raw
from phase3i_run_oracle import REQUEST, case_path, memory_kib, request, save_new, sha256
from phase3i5_run_oracle import CORPUS, SELECTION, preflight


METRICS = CORPUS.parent / "raw_metrics_v1.json"


def run(primary_dir, output_dir):
    checks = preflight()
    if not METRICS.exists():
        raise RuntimeError("raw primary score must exist before stability repeats")
    corpus = json.loads(CORPUS.read_text())
    by_id = {case["id"]: case for case in corpus["cases"]}
    if {path.stem for path in primary_dir.glob("*.json") if path.name != "manifest.json"} != set(by_id):
        raise RuntimeError("primary call set incomplete")
    selection = json.loads(SELECTION.read_text())
    case_ids = selection["case_ids"]
    if selection["corpus_sha256"] != checks["corpus_sha256"] or len(case_ids) != 24:
        raise RuntimeError("stability subset changed")
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_manifest = {"preflight": checks, "selection_sha256": sha256(SELECTION),
                         "primary_metrics_sha256": sha256(METRICS)}
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists():
        if json.loads(manifest_path.read_text()) != expected_manifest:
            raise RuntimeError("stability resume manifest differs")
    else:
        save_new(manifest_path, expected_manifest)
    for case_id in case_ids:
        case = by_id[case_id]
        path = case_path(output_dir, case_id)
        if path.exists():
            row = json.loads(path.read_text())
            if row.get("case_id") != case_id or row.get("dataset_sha256") != checks["corpus_sha256"]:
                raise RuntimeError(f"stability resume record differs: {case_id}")
            continue
        before = memory_kib()
        if before["MemAvailable"] < 4 * 1024 * 1024:
            raise RuntimeError(f"resource guard stopped before {case_id}")
        prompt = p1_prompt(case["baseline_requirement"], case["message"])
        tokenized = request("/tokenize", {"content": prompt, "add_special": False}, timeout=30)
        if len(tokenized["tokens"]) > 568:
            raise RuntimeError(f"prompt over budget: {case_id}")
        started = time.monotonic()
        response = request("/completion", {"prompt": prompt, **REQUEST})
        validation = validate_raw(
            response.get("content", ""), "p1_single_v1",
            stopped_limit=response.get("stop_type") == "limit" or response.get("stopped_limit", False),
            generated_tokens=response.get("tokens_predicted"), output_budget=120,
        )
        primary = json.loads(case_path(primary_dir, case_id).read_text())
        if primary.get("dataset_sha256") != checks["corpus_sha256"]:
            raise RuntimeError(f"primary result provenance changed: {case_id}")
        row = {"case_id": case_id, "dataset_sha256": checks["corpus_sha256"],
               "reviewed_ground_truth": case["review"]["reviewed_label"],
               "primary_label": primary["raw_predicted_class"],
               "repeat_label": validation["parsed"]["label"] if validation["valid"] else None,
               "validation": validation, "raw_text": response.get("content", ""),
               "raw_response": response, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
               "latency_seconds": round(time.monotonic() - started, 3),
               "memory_kib_before": before, "memory_kib_after": memory_kib()}
        save_new(path, row)
        print(f"{case_id}: primary={row['primary_label']} repeat={row['repeat_label']}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--execute-inference", action="store_true", required=True)
    args = parser.parse_args()
    run(args.primary_dir, args.output_dir)


if __name__ == "__main__":
    main()
