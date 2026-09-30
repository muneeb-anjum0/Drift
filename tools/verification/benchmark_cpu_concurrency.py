#!/usr/bin/env python3
"""Characterize bounded CPU request concurrency against the one-slot llama runtime."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import evaluate_raw_model as raw_eval


def memory_snapshot() -> dict[str, int | str | None]:
    values: dict[str, int] = {}
    for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
        if ":" not in line:
            continue
        key, raw = line.split(":", 1)
        parts = raw.split()
        if parts and parts[0].isdigit():
            values[key] = int(parts[0]) * 1024
    container_memory: str | None = None
    try:
        container_memory = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", "{{.MemUsage}}", "drift-llama"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return {
        "host_mem_available_bytes": values.get("MemAvailable"),
        "host_swap_used_bytes": values.get("SwapTotal", 0) - values.get("SwapFree", 0),
        "llama_container_memory": container_memory,
    }


def one_request(url: str, case: dict[str, Any], timeout: float, request_id: int) -> dict[str, Any]:
    started = time.perf_counter()
    error: str | None = None
    parsed = None
    try:
        response = raw_eval.request_json(
            "POST",
            url.rstrip("/") + "/completion",
            {
                "prompt": raw_eval.prompt_for(case),
                "n_predict": 120,
                "temperature": 0,
                "top_p": 1,
                "stop": ["<|im_end|>", "<|im_start|>"],
            },
            timeout,
        )
        raw = str(response.get("content") or response.get("response") or response.get("text") or "")
        parsed, _, parse_error = raw_eval.normalize_prediction(raw)
        error = parse_error
    except Exception as exc:
        error = str(exc)
    return {
        "request_id": request_id,
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "label": parsed["label"] if parsed else None,
        "error": error,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("evaluation/datasets/drift_raw_dev_v1.json"))
    parser.add_argument("--case-id", default="add_health_01")
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    parser.add_argument("--levels", type=int, nargs="+", default=[1, 2, 4])
    parser.add_argument("--output", type=Path, default=Path("evaluation/reports/cpu_concurrency_v1.json"))
    parser.add_argument("--timeout", type=float, default=180)
    args = parser.parse_args()
    if args.levels != sorted(set(args.levels)) or args.levels[0] != 1 or max(args.levels) > 4:
        parser.error("levels must be unique ascending values beginning at 1 and not exceeding 4")

    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    case = next(item for item in dataset["cases"] if item["id"] == args.case_id)
    health = raw_eval.request_json("GET", args.llama_url.rstrip("/") + "/health", timeout=5)
    if str(health.get("status", "")).lower() not in {"ok", "ready"}:
        raise RuntimeError(f"llama.cpp is not ready: {health}")

    levels: list[dict[str, Any]] = []
    stop_reason: str | None = None
    initial = memory_snapshot()
    prior_swap = int(initial["host_swap_used_bytes"] or 0)
    for level in args.levels:
        before = memory_snapshot()
        available = int(before["host_mem_available_bytes"] or 0)
        if available < 3 * 1024**3:
            stop_reason = f"Stopped before level {level}: host available memory below 3 GiB."
            break
        wall_start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=level) as executor:
            futures = [executor.submit(one_request, args.llama_url, case, args.timeout, index) for index in range(level)]
            requests = [future.result() for future in futures]
        wall_ms = round((time.perf_counter() - wall_start) * 1000, 2)
        after = memory_snapshot()
        latencies = [item["latency_ms"] for item in requests]
        successes = sum(item["error"] is None for item in requests)
        levels.append({
            "concurrency": level,
            "request_count": level,
            "success_count": successes,
            "failure_count": level - successes,
            "wall_time_ms": wall_ms,
            "throughput_requests_per_second": successes / (wall_ms / 1000),
            "mean_latency_ms": statistics.mean(latencies),
            "max_latency_ms": max(latencies),
            "before": before,
            "after": after,
            "requests": requests,
        })
        print(
            f"concurrency={level} success={successes}/{level} wall={wall_ms / 1000:.1f}s "
            f"mean_latency={statistics.mean(latencies) / 1000:.1f}s",
            flush=True,
        )
        swap_used = int(after["host_swap_used_bytes"] or 0)
        if swap_used - prior_swap > 512 * 1024**2:
            stop_reason = f"Stopped after level {level}: swap use grew by more than 512 MiB."
            break
        if int(after["host_mem_available_bytes"] or 0) < 3 * 1024**3:
            stop_reason = f"Stopped after level {level}: host available memory fell below 3 GiB."
            break
        prior_swap = swap_used

    report = {
        "schema_version": 1,
        "evaluation_id": "cpu-concurrency-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artifact_sha256": raw_eval.ARTIFACT_SHA256,
        "dataset_sha256": raw_eval.sha256_file(args.dataset),
        "case_id": args.case_id,
        "configuration": {
            "cpu_only": True,
            "llama_parallel_slots": 1,
            "temperature": 0,
            "top_p": 1,
            "n_predict": 120,
            "requested_levels": args.levels,
        },
        "initial": initial,
        "levels": levels,
        "stop_reason": stop_reason,
        "interpretation": "With one llama slot, client concurrency measures queueing and bounded throughput rather than parallel generation.",
    }
    raw_eval.atomic_write(args.output, report)
    print(f"Wrote {args.output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
