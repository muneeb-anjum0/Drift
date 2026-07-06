#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request


def request(url: str, payload: dict[str, str] | None = None) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test the local DriftLedger inference service.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    status, body = request(f"{base_url}/health")
    print(f"GET /health -> {status}")
    print(body)
    if status != 200:
        raise SystemExit(1)

    payload = {
        "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
        "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?",
    }
    status, body = request(f"{base_url}/predict-drift", payload)
    print(f"POST /predict-drift -> {status}")
    print(body)
    if status != 200:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
