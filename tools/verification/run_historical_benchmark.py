#!/usr/bin/env python3
"""Run the committed Go historical benchmark and persist its API result."""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def request_json(method: str, url: str, payload: dict[str, Any] | None = None, token: str = "") -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> {exc.code}: {detail}") from exc


def api_data(response: dict[str, Any], key: str) -> Any:
    if not response.get("success"):
        raise RuntimeError(f"API failure: {response}")
    return response.get("data", {}).get(key)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://127.0.0.1:5000")
    parser.add_argument("--output-dir", default="/tmp/drift-phase3-reports")
    parser.add_argument("--poll-seconds", type=float, default=3)
    args = parser.parse_args()
    base_url = args.backend_url.rstrip("/")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    registration = request_json(
        "POST",
        f"{base_url}/api/v1/auth/register",
        {
            "name": "Phase III Historical Benchmark",
            "email": f"phase3-historical-{stamp}@example.test",
            "password": "TestPass123!",
        },
    )
    token = str(api_data(registration, "token"))
    started_at = datetime.now(timezone.utc)
    run = api_data(request_json("POST", f"{base_url}/api/v1/evaluation/runs", token=token), "run")
    print(f"Started historical benchmark {run['id']} with {run['totalCases']} committed cases", flush=True)

    while True:
        run = api_data(request_json("GET", f"{base_url}/api/v1/evaluation/runs/current", token=token), "run")
        print(
            f"status={run['status']} progress={run['progress']}/{run['totalCases']} "
            f"passes={run['passCount']} step={run.get('currentStep', '')}",
            flush=True,
        )
        if run["status"] in {"succeeded", "failed"}:
            break
        time.sleep(args.poll_seconds)

    summary = api_data(request_json("GET", f"{base_url}/api/v1/evaluation/summary", token=token), "summary")
    finished_at = datetime.now(timezone.utc)
    report = {
        "schemaVersion": 2,
        "evaluationId": "historical-go-direct-v0",
        "datasetStatus": "CONTAMINATED_REGRESSION_ONLY",
        "warnings": [
            "Historical examples occur in repository source and tests.",
            "This direct benchmark bypasses drift_postprocess.go, but recovered training data is unknown.",
            "Do not present this score as independent held-out model quality.",
        ],
        "startedAt": started_at.isoformat(),
        "finishedAt": finished_at.isoformat(),
        "wallTimeMs": int((finished_at - started_at).total_seconds() * 1000),
        "baselineCommit": "5421d1f383796b1ec0e271586711e637a9ed0347",
        "artifactSha256": "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9",
        "run": run,
        "summary": summary,
    }
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"historical_go_direct_v0_{stamp}.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output}", flush=True)
    return 0 if run["status"] == "succeeded" else 1


if __name__ == "__main__":
    raise SystemExit(main())
