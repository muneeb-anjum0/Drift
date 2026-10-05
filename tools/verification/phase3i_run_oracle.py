#!/usr/bin/env python3
"""Sequential, resumable, CPU-only Phase III-I oracle singleton recorder."""

import argparse
import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from phase3h_contracts import ROOT, p1_prompt, validate_raw

SERVER = "http://127.0.0.1:8080"
DATASET = ROOT / "evaluation/phase_iii_i/decision_reviewed_v1.json"
REVIEW = ROOT / "evaluation/phase_iii_i/human_review_self_attested_v1.json"
MODEL = ROOT / "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
P1 = ROOT / "evaluation/prompts/P1.json"
PP1 = ROOT / "server-go/internal/modules/drift/drift_postprocess.go"
SHA = {
    "dataset": "d0fae87de5a9413e3ffd61104e3ca4478c742399f9d49fb36be12231478a12b5",
    "review": "5f757fe76797530aadd2237c50a4a98cc0c67840d1d43e8c9a27d7e587612f90",
    "model": "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9",
    "p1": "902ac43037c998afc4b6550995036bbc720bcae5dbbafc4504b2b9898abed339",
    "pp1": "0c8bf5cf8fad54d2f9285a4392c2a4fa96d3fc758d3331a0fb0020c834b643e7",
}
REQUEST = {
    "temperature": 0, "top_p": 1, "n_predict": 120,
    "stop": ["<|im_end|>", "<|im_start|>"],
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def memory_kib():
    readings = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith(("MemAvailable:", "SwapFree:")):
            name, amount, *_ = line.split()
            readings[name.removesuffix(":")] = int(amount)
    if "MemAvailable" not in readings or "SwapFree" not in readings:
        raise RuntimeError("host memory telemetry unavailable")
    return readings


def request(path, payload=None, timeout=180):
    body = json.dumps(payload).encode() if payload is not None else None
    req = Request(SERVER + path, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=timeout) as response:
        return json.load(response)


def docker_identity():
    raw = subprocess.check_output(
        ["docker", "inspect", "drift-llama", "--format",
         "{{json .Config.Cmd}}|{{json .HostConfig.DeviceRequests}}|{{.Config.Image}}"],
        text=True, timeout=10,
    ).strip()
    command_text, device_text, image = raw.split("|", 2)
    command = json.loads(command_text)
    devices = json.loads(device_text)
    expected = ["--ctx-size", "768", "--n-gpu-layers", "0", "--device", "none",
                "--threads", "6", "--parallel", "1"]
    if any(command[index:index + 2] != expected[offset:offset + 2]
           for offset, index in ((0, command.index("--ctx-size")),
                                 (2, command.index("--n-gpu-layers")),
                                 (4, command.index("--device")),
                                 (6, command.index("--threads")),
                                 (8, command.index("--parallel")))):
        raise RuntimeError("CPU-only pinned llama command changed")
    if devices not in (None, []):
        raise RuntimeError("GPU device request present")
    if image != "ghcr.io/ggml-org/llama.cpp:server-b11151":
        raise RuntimeError("llama image changed")
    return {"command": command, "device_requests": devices, "image": image}


def preflight():
    actual = {name: sha256(path) for name, path in
              (("dataset", DATASET), ("review", REVIEW), ("model", MODEL), ("p1", P1), ("pp1", PP1))}
    if actual != SHA:
        raise RuntimeError(f"frozen hash mismatch: {actual}")
    subprocess.run(["git", "cat-file", "-e", "HEAD:evaluation/phase_iii_i/decision_reviewed_v1.json"],
                   cwd=ROOT, check=True, capture_output=True)
    props = request("/props", timeout=10)
    if (props.get("total_slots") != 1 or
            props.get("default_generation_settings", {}).get("n_ctx") != 768 or
            "b11151" not in props.get("build_info", "")):
        raise RuntimeError("runtime slot/context/build changed")
    docker = docker_identity()
    if memory_kib()["MemAvailable"] < 4 * 1024 * 1024:
        raise RuntimeError("less than 4 GiB host RAM available")
    return {"hashes": actual, "runtime": {
        "build_info": props.get("build_info"), "model_ftype": props.get("model_ftype"),
        "n_ctx": 768, "total_slots": 1, **docker,
    }, "request_settings": REQUEST}


def case_path(out_dir, case_id):
    if not re.fullmatch(r"[a-z0-9-]+", case_id):
        raise ValueError("unsafe case ID")
    return out_dir / f"{case_id}.json"


def save_new(path, row):
    body = (json.dumps(row, indent=2, ensure_ascii=False) + "\n").encode()
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(descriptor, "wb") as target:
        target.write(body)
        target.flush()
        os.fsync(target.fileno())


def run(out_dir, max_cases):
    checks = preflight()
    cases = json.loads(DATASET.read_text())["cases"]
    if len(cases) != 90 or len({case["id"] for case in cases}) != 90:
        raise RuntimeError("frozen corpus cardinality changed")
    if out_dir.exists() and not out_dir.is_dir():
        raise RuntimeError("output target is not a directory")
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = out_dir / "manifest.json"
    if manifest.exists():
        if json.loads(manifest.read_text()) != checks:
            raise RuntimeError("resume manifest does not match frozen environment")
    else:
        save_new(manifest, checks)
    processed = 0
    for case in cases:
        path = case_path(out_dir, case["id"])
        if path.exists():
            existing = json.loads(path.read_text())
            if (existing.get("case_id") != case["id"] or
                    existing.get("dataset_sha256") != SHA["dataset"]):
                raise RuntimeError(f"resume record mismatch: {path}")
            if existing.get("runtime_error"):
                raise RuntimeError(f"previous runtime error needs audit: {path}")
            continue
        if max_cases is not None and processed >= max_cases:
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
            "case_id": case["id"], "dataset_sha256": SHA["dataset"],
            "baseline_requirement": case["baseline_requirement"], "message": case["message"],
            "reviewed_ground_truth": case["review"]["reviewed_label"],
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
        print(f"{case['id']}: {row['validation']['primary']} "
              f"label={row['raw_predicted_class']} seconds={row['latency_seconds']}", flush=True)
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
