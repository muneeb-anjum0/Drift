#!/usr/bin/env python3
"""Verify the Drift UI model routes agree on the monthly-report regression case."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any


BASELINE = "The system shall allow admins to export monthly reports as CSV."
MESSAGE = "Can we also let admins download the same monthly report from the existing reports page?"
EXPECTED_LABEL = "unchanged"


def post_json(url: str, payload: dict[str, str], timeout: int) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def label_from_response(name: str, data: dict[str, Any]) -> str:
    if name == "inference":
        return str(data.get("label", "")).lower()

    wrapped = data.get("data", {})
    if "prediction" in wrapped:
        return str(wrapped.get("prediction", {}).get("label", "")).lower()
    return str(wrapped.get("label", "")).lower()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--inference-url", default="http://localhost:8000", help="Inference base URL")
    parser.add_argument("--timeout", type=int, default=90, help="Request timeout in seconds")
    args = parser.parse_args()

    payload = {
        "baseline_requirement": BASELINE,
        "new_client_message": MESSAGE,
    }
    targets = {
        "inference": f"{args.inference_url.rstrip('/')}/predict-drift",
        "backend_compat": f"{args.backend_url.rstrip('/')}/api/drift/analyze",
        "frontend_direct": f"{args.backend_url.rstrip('/')}/api/v1/drift/analyze-direct",
    }

    labels: dict[str, str] = {}
    for name, url in targets.items():
        try:
            data = post_json(url, payload, args.timeout)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"FAIL {name}: {exc}", file=sys.stderr)
            return 1
        labels[name] = label_from_response(name, data)
        print(f"{name}: {labels[name]}")

    bad = {name: label for name, label in labels.items() if label != EXPECTED_LABEL}
    if bad:
        print(f"FAIL expected every route to return {EXPECTED_LABEL!r}, got {bad}", file=sys.stderr)
        return 1

    print("PASS model routes agree on the monthly-report unchanged case")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
