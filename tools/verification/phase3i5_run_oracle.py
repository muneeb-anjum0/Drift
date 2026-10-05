#!/usr/bin/env python3
"""Sequential, resumable CPU-only Phase III-I.5 P1 singleton recorder."""

import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path
from urllib.error import HTTPError, URLError

from phase3h_contracts import ROOT, p1_prompt, validate_raw
from phase3i_run_oracle import (
    REQUEST, case_path, docker_identity, memory_kib, request, save_new, sha256,
)


CORPUS = ROOT / "evaluation/phase_iii_i_5/reviewed_frozen_v1.json"
SELECTION = ROOT / "evaluation/phase_iii_i_5/stability_selection_v1.json"
FREEZE_MANIFEST = ROOT / "evaluation/phase_iii_i_5/pre_inference_manifest_v1.json"


def preflight():
    manifest = json.loads(FREEZE_MANIFEST.read_text())
    if manifest.get("role") != "PHASE_III_I_5_PRE_INFERENCE_FREEZE_MANIFEST":
        raise RuntimeError("freeze manifest role invalid")
    for name, item in manifest["files"].items():
        path = ROOT / item["path"]
        if sha256(path) != item["sha256"]:
            raise RuntimeError(f"frozen hash mismatch: {name}")
    for path in (CORPUS, SELECTION, FREEZE_MANIFEST):
        relative = path.relative_to(ROOT)
        subprocess.run(["git", "cat-file", "-e", f"HEAD:{relative}"], cwd=ROOT,
                       check=True, capture_output=True)
    selection = json.loads(SELECTION.read_text())
    corpus = json.loads(CORPUS.read_text())
    if (selection.get("corpus_sha256") != sha256(CORPUS)
            or selection.get("selection_count") != 24
            or len(selection.get("case_ids", [])) != 24):
        raise RuntimeError("stability selection not frozen for this corpus")
    cases = corpus["cases"]
    if (len(cases) != 216 or len({case["id"] for case in cases}) != 216
            or sum(case["primary_scored"] for case in cases) != 215):
        raise RuntimeError("reviewed corpus cardinality/eligibility changed")
    if not set(selection["case_ids"]).issubset(
            {case["id"] for case in cases if case["primary_scored"]}):
        raise RuntimeError("stability selection includes unscored case")
    props = request("/props", timeout=10)
    if (props.get("total_slots") != 1 or
            props.get("default_generation_settings", {}).get("n_ctx") != 768 or
            "b11151" not in props.get("build_info", "")):
        raise RuntimeError("pinned runtime slot/context/build changed")
    docker = docker_identity()
    limits = json.loads(subprocess.check_output(
        ["docker", "inspect", "drift-llama", "--format",
         "{\"memory\":{{.HostConfig.Memory}},\"memory_swap\":{{.HostConfig.MemorySwap}}}"],
        text=True, timeout=10,
    ))
    expected_runtime = manifest["expected_runtime"]
    if (docker["image"] != expected_runtime["image"] or
            limits["memory"] != expected_runtime["container_memory_bytes"] or
            limits["memory_swap"] != expected_runtime["container_memory_swap_bytes"]):
        raise RuntimeError("pinned CPU container image/memory limits changed")
    if memory_kib()["MemAvailable"] < 4 * 1024 * 1024:
        raise RuntimeError("host available RAM below 4 GiB")
    if manifest.get("request_settings") != REQUEST:
        raise RuntimeError("decoding request settings changed")
    return {"freeze_manifest_sha256": sha256(FREEZE_MANIFEST),
            "corpus_sha256": sha256(CORPUS),
            "runtime": {"build_info": props.get("build_info"),
                        "model_ftype": props.get("model_ftype"),
                        "n_ctx": 768, "total_slots": 1, **docker, **limits},
            "request_settings": REQUEST}


def run(output_dir, max_new_cases):
    checks = preflight()
    cases = json.loads(CORPUS.read_text())["cases"]
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists():
        if json.loads(manifest_path.read_text()) != checks:
            raise RuntimeError("resume manifest differs from frozen environment")
    else:
        save_new(manifest_path, checks)
    processed = 0
    for case in cases:
        path = case_path(output_dir, case["id"])
        if path.exists():
            existing = json.loads(path.read_text())
            if (existing.get("case_id") != case["id"] or
                    existing.get("dataset_sha256") != checks["corpus_sha256"] or
                    existing.get("runtime_error")):
                raise RuntimeError(f"resume record mismatch: {path}")
            continue
        if max_new_cases is not None and processed >= max_new_cases:
            break
        before = memory_kib()
        if before["MemAvailable"] < 4 * 1024 * 1024:
            raise RuntimeError(f"resource guard stopped before {case['id']}")
        prompt = p1_prompt(case["baseline_requirement"], case["message"])
        tokenized = request("/tokenize", {"content": prompt, "add_special": False}, timeout=30)
        prompt_tokens = len(tokenized["tokens"])
        if prompt_tokens > 568:
            raise RuntimeError(f"prompt exceeds 568-token guard: {case['id']}")
        row = {
            "case_id": case["id"], "dataset_sha256": checks["corpus_sha256"],
            "baseline_requirement": case["baseline_requirement"], "message": case["message"],
            "reviewed_ground_truth": case["review"]["reviewed_label"],
            "primary_scored": case["primary_scored"],
            "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
            "prompt_tokens": prompt_tokens, "request_settings": REQUEST,
            "memory_kib_before": before,
        }
        start = time.monotonic()
        try:
            response = request("/completion", {"prompt": prompt, **REQUEST})
            row["latency_seconds"] = round(time.monotonic() - start, 3)
            row["raw_response"] = response
            row["raw_text"] = response.get("content", "")
            validation = validate_raw(
                row["raw_text"], "p1_single_v1",
                stopped_limit=response.get("stop_type") == "limit" or response.get("stopped_limit", False),
                generated_tokens=response.get("tokens_predicted"), output_budget=120,
            )
            row["validation"] = validation
            row["raw_predicted_class"] = validation["parsed"]["label"] if validation["valid"] else None
        except (HTTPError, URLError, TimeoutError) as error:
            row["latency_seconds"] = round(time.monotonic() - start, 3)
            row["runtime_error"] = str(error)[:500]
            row["validation"] = {"valid": False, "primary": "RUNTIME_ERROR"}
            row["raw_predicted_class"] = None
        row["memory_kib_after"] = memory_kib()
        save_new(path, row)
        processed += 1
        print(f"{case['id']}: {row['validation']['primary']} label={row['raw_predicted_class']} "
              f"seconds={row['latency_seconds']}", flush=True)
        if row.get("runtime_error"):
            raise RuntimeError(f"transport failure recorded at {path}; stopping without retry")
    print(f"newly recorded cases: {processed}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--max-new-cases", type=int)
    parser.add_argument("--execute-inference", action="store_true", required=True)
    args = parser.parse_args()
    if args.max_new_cases is not None and args.max_new_cases < 1:
        parser.error("--max-new-cases must be positive")
    run(args.output_dir, args.max_new_cases)


if __name__ == "__main__":
    main()
