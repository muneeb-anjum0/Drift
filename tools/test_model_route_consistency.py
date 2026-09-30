#!/usr/bin/env python3
"""Verify the Drift UI model routes agree on the monthly-report regression case."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


BASELINE = "The system shall allow admins to export monthly reports as CSV."
MESSAGE = "Can we also let admins download the same monthly report from the existing reports page?"
EXPECTED_LABEL = "unchanged"


def post_json(url: str, payload: dict[str, str], timeout: int, headers: dict[str, str]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", **headers},
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
    parser.add_argument("--token", default=os.getenv("DRIFT_AUTH_TOKEN", ""), help="Backend bearer token")
    parser.add_argument(
        "--inference-api-key",
        default=os.getenv("DRIFT_INFERENCE_API_KEY", ""),
        help="Internal inference API key",
    )
    args = parser.parse_args()
    if not args.token or not args.inference_api_key:
        parser.error("--token/DRIFT_AUTH_TOKEN and --inference-api-key/DRIFT_INFERENCE_API_KEY are required")

    payload = {
        "baseline_requirement": BASELINE,
        "new_client_message": MESSAGE,
    }
    targets = {
        "inference": (
            f"{args.inference_url.rstrip('/')}/predict-drift",
            {"X-Drift-Inference-Key": args.inference_api_key},
        ),
        "backend_compat": (
            f"{args.backend_url.rstrip('/')}/api/drift/analyze",
            {"Authorization": f"Bearer {args.token}"},
        ),
        "frontend_direct": (
            f"{args.backend_url.rstrip('/')}/api/v1/drift/analyze-direct",
            {"Authorization": f"Bearer {args.token}"},
        ),
    }

    labels: dict[str, str] = {}
    for name, (url, headers) in targets.items():
        try:
            data = post_json(url, payload, args.timeout, headers)
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
