#!/usr/bin/env python3
"""Measure repeated raw inference stability on representative development cases."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import evaluate_raw_model as raw_eval


DEFAULT_CASES = [
    "add_health_01",
    "add_security_01",
    "rem_logistics_01",
    "con_inventory_01",
    "amb_saas_01",
    "same_gov_01",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("evaluation/datasets/drift_raw_dev_v1.json"))
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--output", type=Path, default=Path("evaluation/reports/stability_dev_v1.json"))
    parser.add_argument("--timeout", type=float, default=180)
    args = parser.parse_args()
    if args.repeats < 2:
        parser.error("--repeats must be at least 2")

    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    by_id = {item["id"]: item for item in dataset["cases"]}
    cases = [by_id[case_id] for case_id in DEFAULT_CASES]
    health = raw_eval.request_json("GET", args.llama_url.rstrip("/") + "/health", timeout=5)
    if str(health.get("status", "")).lower() not in {"ok", "ready"}:
        raise RuntimeError(f"llama.cpp is not ready: {health}")

    results: list[dict[str, Any]] = []
    for case in cases:
        attempts = []
        for repeat in range(1, args.repeats + 1):
            started = time.perf_counter()
            response = raw_eval.request_json(
                "POST",
                args.llama_url.rstrip("/") + "/completion",
                {
                    "prompt": raw_eval.prompt_for(case),
                    "n_predict": 120,
                    "temperature": 0,
                    "top_p": 1,
                    "stop": ["<|im_end|>", "<|im_start|>"],
                },
                args.timeout,
            )
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            raw = str(response.get("content") or response.get("response") or response.get("text") or "")
            parsed, raw_json_valid, parse_error = raw_eval.normalize_prediction(raw)
            attempts.append({
                "repeat": repeat,
                "label": parsed["label"] if parsed else None,
                "confidence": parsed["confidence"] if parsed else None,
                "raw_output_sha256": hashlib.sha256(raw.encode()).hexdigest(),
                "raw_json_valid": raw_json_valid,
                "parse_error": parse_error,
                "latency_ms": latency_ms,
            })
            print(
                f"{case['id']} repeat {repeat}/{args.repeats}: "
                f"label={attempts[-1]['label']} latency={latency_ms / 1000:.1f}s",
                flush=True,
            )
        labels = {attempt["label"] for attempt in attempts}
        hashes = {attempt["raw_output_sha256"] for attempt in attempts}
        confidences = [attempt["confidence"] for attempt in attempts if attempt["confidence"] is not None]
        results.append({
            "case_id": case["id"],
            "expected_label": case["expected_label"],
            "attempts": attempts,
            "label_stable": len(labels) == 1,
            "raw_output_exact_match": len(hashes) == 1,
            "confidence_range": [min(confidences), max(confidences)] if confidences else None,
        })

    all_attempts = [attempt for result in results for attempt in result["attempts"]]
    report = {
        "schema_version": 1,
        "evaluation_id": "raw-stability-dev-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artifact_sha256": raw_eval.ARTIFACT_SHA256,
        "dataset": {
            "name": dataset["name"],
            "version": dataset["version"],
            "sha256": raw_eval.sha256_file(args.dataset),
        },
        "configuration": {"temperature":0,"top_p":1,"n_predict":120,"repeats":args.repeats,"case_count":len(cases)},
        "metrics": {
            "attempt_count": len(all_attempts),
            "label_stable_cases": sum(item["label_stable"] for item in results),
            "exact_output_stable_cases": sum(item["raw_output_exact_match"] for item in results),
            "parse_successes": sum(attempt["parse_error"] is None for attempt in all_attempts),
            "mean_latency_ms": sum(attempt["latency_ms"] for attempt in all_attempts) / len(all_attempts),
        },
        "results": results,
        "limitations": [
            "Six representative cases and three repeats each are sufficient to detect obvious instability, not rare nondeterminism.",
            "llama.cpp was already warm; load-time variation is not included.",
        ],
    }
    raw_eval.atomic_write(args.output, report)
    print(f"Wrote {args.output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
