#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.request


def request(method: str, url: str, payload: dict | None = None) -> tuple[int, str]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.status, response.read().decode("utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test the DriftLedger inference service.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()

    status, body = request("GET", f"{args.base_url.rstrip('/')}/health")
    print(f"GET /health -> {status}")
    print(body)

    status, body = request(
        "POST",
        f"{args.base_url.rstrip('/')}/predict-drift",
        {
            "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
            "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?",
        },
    )
    print(f"POST /predict-drift -> {status}")
    print(body)


if __name__ == "__main__":
    main()
