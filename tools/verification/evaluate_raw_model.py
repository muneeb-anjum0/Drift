#!/usr/bin/env python3
"""Evaluate the raw llama.cpp classifier sequentially with resumable checkpoints."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
import statistics
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


LABELS = ["added", "modified", "removed", "contradiction", "ambiguous", "unchanged"]
SYSTEM_PROMPT = (
    "You are DriftLedger, a requirement drift analysis model. Compare the baseline "
    "requirement with the new client message. Classify the new message as exactly "
    "one of: added, modified, removed, contradiction, ambiguous, unchanged. Return "
    "only valid JSON with fields: label, confidence, reasoning, changed_elements."
)
ARTIFACT_SHA256 = "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9"
BASELINE_COMMIT = "5421d1f383796b1ec0e271586711e637a9ed0347"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prompt_for(case: dict[str, Any]) -> str:
    return (
        "<|im_start|>system\n"
        f"{SYSTEM_PROMPT}\n"
        "<|im_end|>\n"
        "<|im_start|>user\n"
        "Baseline requirement:\n"
        f"{case['baseline_requirement']}\n\n"
        "New client message:\n"
        f"{case['client_message']}\n\n"
        'Return JSON like {"label":"unchanged","confidence":0.95,"reasoning":"...","changed_elements":[]}.\n'
        "<|im_end|>\n"
        "<|im_start|>assistant\n"
    )


def request_json(method: str, url: str, payload: dict[str, Any] | None = None, timeout: float = 180) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"{method} {url} -> {exc.code}: {detail}") from exc


def normalize_prediction(raw: str) -> tuple[dict[str, Any] | None, bool, str | None]:
    raw_json_valid = False
    candidates = [raw]
    try:
        raw_value = json.loads(raw)
        raw_json_valid = isinstance(raw_value, dict)
    except (json.JSONDecodeError, TypeError):
        pass
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match and match.group(0) != raw:
        candidates.append(match.group(0))
    for candidate in candidates:
        try:
            value = json.loads(candidate)
            if isinstance(value, dict) and isinstance(value.get("data"), dict):
                value = value["data"]
            if isinstance(value, dict) and isinstance(value.get("prediction"), dict):
                value = value["prediction"]
            if not isinstance(value, dict):
                continue
            missing = {"label", "confidence", "reasoning", "changed_elements"}.difference(value)
            if missing:
                continue
            label = str(value["label"]).strip().lower()
            confidence = value["confidence"]
            reasoning = value["reasoning"]
            changed = value["changed_elements"]
            if label not in LABELS or isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
                continue
            if confidence > 1:
                confidence /= 100
            if not 0 <= confidence <= 1 or not isinstance(reasoning, str):
                continue
            if isinstance(changed, str):
                changed = [changed]
            if not isinstance(changed, list) or any(not isinstance(item, str) for item in changed):
                continue
            return {
                "label": label,
                "confidence": float(confidence),
                "reasoning": reasoning,
                "changed_elements": [item for item in changed if item.strip()],
            }, raw_json_valid, None
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    return None, raw_json_valid, "Model output did not satisfy the normalized prediction contract."


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(fraction * len(ordered)) - 1))
    return ordered[index]


def classification_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    usable = [item for item in results if item.get("parsed_prediction")]
    confusion = {expected: {actual: 0 for actual in LABELS} for expected in LABELS}
    for item in usable:
        confusion[item["expected_label"]][item["parsed_prediction"]["label"]] += 1
    per_class: dict[str, Any] = {}
    for label in LABELS:
        tp = confusion[label][label]
        fp = sum(confusion[other][label] for other in LABELS if other != label)
        fn = sum(confusion[label][other] for other in LABELS if other != label)
        support = sum(confusion[label].values())
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"precision": precision, "recall": recall, "f1": f1, "support": support}
    correct = sum(item["expected_label"] == item["parsed_prediction"]["label"] for item in usable)
    total = len(results)
    macro_precision = statistics.mean(item["precision"] for item in per_class.values())
    macro_recall = statistics.mean(item["recall"] for item in per_class.values())
    macro_f1 = statistics.mean(item["f1"] for item in per_class.values())
    weighted_f1 = sum(item["f1"] * item["support"] for item in per_class.values()) / max(len(usable), 1)
    return {
        "case_count": total,
        "parsed_count": len(usable),
        "correct_count": correct,
        "accuracy": correct / total if total else 0.0,
        "semantic_accuracy_among_parsed": correct / len(usable) if usable else 0.0,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "per_class": per_class,
        "confusion_matrix": confusion,
    }


def calibration_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    usable = [item for item in results if item.get("parsed_prediction")]
    bins: list[dict[str, Any]] = []
    ece = 0.0
    brier_terms: list[float] = []
    for lower_index in range(10):
        lower = lower_index / 10
        upper = (lower_index + 1) / 10
        members = [
            item for item in usable
            if lower <= item["parsed_prediction"]["confidence"] <= upper
            and (lower_index == 9 or item["parsed_prediction"]["confidence"] < upper)
        ]
        if not members:
            continue
        average_confidence = statistics.mean(item["parsed_prediction"]["confidence"] for item in members)
        accuracy = statistics.mean(
            item["parsed_prediction"]["label"] == item["expected_label"] for item in members
        )
        ece += len(members) / max(len(usable), 1) * abs(accuracy - average_confidence)
        bins.append({
            "lower": lower,
            "upper": upper,
            "count": len(members),
            "average_confidence": average_confidence,
            "accuracy": accuracy,
        })
    for item in usable:
        correct = float(item["parsed_prediction"]["label"] == item["expected_label"])
        brier_terms.append((item["parsed_prediction"]["confidence"] - correct) ** 2)
    return {
        "ece_10_bin": ece,
        "correctness_brier": statistics.mean(brier_terms) if brier_terms else None,
        "bins": bins,
        "warning": "Model confidence is self-reported and is not a calibrated class probability.",
    }


def bootstrap_interval(results: list[dict[str, Any]], iterations: int = 2000) -> dict[str, list[float] | None]:
    if not results:
        return {"accuracy_95_percentile_interval": None, "macro_f1_95_percentile_interval": None}
    generator = random.Random(20260930)
    accuracies: list[float] = []
    macro_f1s: list[float] = []
    for _ in range(iterations):
        sample = [results[generator.randrange(len(results))] for _ in results]
        metrics = classification_metrics(sample)
        accuracies.append(metrics["accuracy"])
        macro_f1s.append(metrics["macro_f1"])
    return {
        "method": "deterministic nonparametric bootstrap percentile interval",
        "iterations": iterations,
        "accuracy_95_percentile_interval": [percentile(accuracies, 0.025), percentile(accuracies, 0.975)],
        "macro_f1_95_percentile_interval": [percentile(macro_f1s, 0.025), percentile(macro_f1s, 0.975)],
    }


def aggregate(report: dict[str, Any]) -> None:
    results = report["results"]
    latencies = [item["latency_ms"] for item in results if item.get("latency_ms") is not None]
    predicted_rates = [item["runtime_metrics"].get("predicted_per_second") for item in results]
    predicted_rates = [float(value) for value in predicted_rates if isinstance(value, (int, float))]
    report["metrics"] = classification_metrics(results)
    report["format_metrics"] = {
        "raw_json_valid_rate": sum(item["raw_json_valid"] for item in results) / max(len(results), 1),
        "contract_parse_rate": sum(item["parse_success"] for item in results) / max(len(results), 1),
        "runtime_error_count": sum(bool(item.get("runtime_error")) for item in results),
    }
    report["calibration"] = calibration_metrics(results)
    report["latency"] = {
        "count": len(latencies),
        "mean_ms": statistics.mean(latencies) if latencies else None,
        "p50_ms": percentile(latencies, 0.50),
        "p90_ms": percentile(latencies, 0.90),
        "p95_ms": percentile(latencies, 0.95),
        "max_ms": max(latencies) if latencies else None,
        "mean_predicted_tokens_per_second": statistics.mean(predicted_rates) if predicted_rates else None,
    }
    if len(results) == report["dataset"]["case_count"]:
        report["uncertainty"] = bootstrap_interval(results)


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def summary_report(report: dict[str, Any], full_report_path: Path) -> dict[str, Any]:
    """Return a reviewable report without duplicating verbose raw reasoning text."""
    keep = {
        key: report[key]
        for key in [
            "schema_version", "evaluation_id", "status", "started_at", "finished_at",
            "evidence_status", "warnings", "baseline_commit", "artifact_sha256", "dataset",
            "runtime", "metrics", "format_metrics", "calibration", "latency", "uncertainty",
        ]
        if key in report
    }
    keep["full_report"] = {
        "path_at_evaluation": str(full_report_path),
        "sha256": sha256_file(full_report_path),
        "retention": "Local evidence artifact; contains every prompt, raw output, normalized prediction, and timing.",
    }
    keep["case_results"] = [
        {
            "case_id": item["case_id"],
            "domain": item["domain"],
            "difficulty": item["difficulty"],
            "tags": item["tags"],
            "expected_label": item["expected_label"],
            "actual_label": item["parsed_prediction"]["label"] if item["parsed_prediction"] else None,
            "confidence": item["parsed_prediction"]["confidence"] if item["parsed_prediction"] else None,
            "correct": item["correct"],
            "raw_json_valid": item["raw_json_valid"],
            "parse_success": item["parse_success"],
            "latency_ms": item["latency_ms"],
            "raw_output_sha256": hashlib.sha256(item["raw_model_output"].encode()).hexdigest(),
            "runtime_error": item["runtime_error"],
        }
        for item in report["results"]
    ]
    return keep


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("evaluation/datasets/drift_raw_dev_v1.json"))
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    parser.add_argument("--output", type=Path, default=Path("/tmp/drift-phase3-reports/raw_model_dev_v1.json"))
    parser.add_argument("--summary-output", type=Path)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--timeout", type=float, default=180)
    args = parser.parse_args()

    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    cases = dataset["cases"]
    ids = [item["id"] for item in cases]
    if len(ids) != len(set(ids)) or any(item["expected_label"] not in LABELS for item in cases):
        raise RuntimeError("Dataset has duplicate IDs or an unknown label.")
    dataset_sha256 = sha256_file(args.dataset)
    distribution = Counter(item["expected_label"] for item in cases)
    health = request_json("GET", args.llama_url.rstrip("/") + "/health", timeout=5)
    if str(health.get("status", "")).lower() not in {"ok", "ready"}:
        raise RuntimeError(f"llama.cpp is not ready: {health}")

    if args.resume and args.output.exists():
        report = json.loads(args.output.read_text(encoding="utf-8"))
        if report["dataset"]["sha256"] != dataset_sha256:
            raise RuntimeError("Cannot resume: dataset hash differs from checkpoint.")
    else:
        report = {
            "schema_version": 1,
            "evaluation_id": "raw-model-dev-v1",
            "status": "running",
            "started_at": utc_now(),
            "finished_at": None,
            "evidence_status": "DEVELOPMENT_NOT_PROVEN_HELD_OUT",
            "warnings": [
                "Recovered training data is unknown, so independence from adapter training cannot be proven.",
                "This evaluates raw model output and contract normalization, not retrieval or final Drift behavior.",
            ],
            "baseline_commit": BASELINE_COMMIT,
            "artifact_sha256": ARTIFACT_SHA256,
            "dataset": {
                "name": dataset["name"],
                "version": dataset["version"],
                "sha256": dataset_sha256,
                "case_count": len(cases),
                "class_distribution": dict(sorted(distribution.items())),
            },
            "runtime": {
                "engine": "llama.cpp",
                "url": args.llama_url,
                "cpu_only": True,
                "parallel_slots": 1,
                "temperature": 0,
                "top_p": 1,
                "n_predict": 120,
                "context_size": 768,
                "prompt_sha256": hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest(),
            },
            "results": [],
        }
    completed = {item["case_id"] for item in report["results"]}
    started = time.monotonic()
    processed = 0
    for index, case in enumerate(cases, start=1):
        if case["id"] in completed:
            continue
        request_payload = {
            "prompt": prompt_for(case),
            "n_predict": 120,
            "temperature": 0,
            "top_p": 1,
            "stop": ["<|im_end|>", "<|im_start|>"],
        }
        raw = ""
        llama_data: dict[str, Any] = {}
        runtime_error: str | None = None
        start = time.perf_counter()
        try:
            llama_data = request_json("POST", args.llama_url.rstrip("/") + "/completion", request_payload, args.timeout)
            raw = str(llama_data.get("content") or llama_data.get("response") or llama_data.get("text") or "")
        except Exception as exc:  # preserve a per-case runtime failure and continue
            runtime_error = str(exc)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        parsed, raw_json_valid, parse_error = normalize_prediction(raw)
        result = {
            "case_id": case["id"],
            "domain": case["domain"],
            "difficulty": case["difficulty"],
            "tags": case["tags"],
            "baseline_requirement": case["baseline_requirement"],
            "client_message": case["client_message"],
            "expected_label": case["expected_label"],
            "raw_model_output": raw,
            "raw_json_valid": raw_json_valid,
            "parse_success": parsed is not None,
            "parse_error": parse_error,
            "parsed_prediction": parsed,
            "normalized_prediction": parsed,
            "postprocessed_prediction": None,
            "final_prediction": None,
            "correct": bool(parsed and parsed["label"] == case["expected_label"]),
            "latency_ms": latency_ms,
            "runtime_error": runtime_error,
            "runtime_metrics": {
                key: llama_data.get("timings", {}).get(key)
                for key in ["predicted_n", "predicted_ms", "predicted_per_second", "prompt_n", "prompt_ms"]
            },
            "artifact_sha256": ARTIFACT_SHA256,
            "model_version": "DriftLedger-Qwen2.5-7B-Q4_K_M-baseline-v0",
            "dataset_version": dataset["version"],
        }
        report["results"].append(result)
        processed += 1
        aggregate(report)
        atomic_write(args.output, report)
        print(
            f"[{index:02d}/{len(cases)}] {case['id']}: expected={case['expected_label']} "
            f"actual={parsed['label'] if parsed else 'PARSE_ERROR'} latency={latency_ms / 1000:.1f}s",
            flush=True,
        )
    if processed or report.get("status") != "complete":
        report["status"] = "complete"
        report["finished_at"] = utc_now()
        report["run_wall_time_ms"] = round((time.monotonic() - started) * 1000, 2)
    aggregate(report)
    atomic_write(args.output, report)
    if args.summary_output:
        atomic_write(args.summary_output, summary_report(report, args.output))
        print(f"Wrote {args.summary_output}", flush=True)
    print(f"Wrote {args.output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
