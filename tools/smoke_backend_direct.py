#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import urllib.request


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test the backend direct drift model route.")
    parser.add_argument("--base-url", default="http://localhost:5000/api/v1")
    parser.add_argument("--token", default=os.getenv("DRIFT_AUTH_TOKEN", ""))
    args = parser.parse_args()
    if not args.token:
        parser.error("--token or DRIFT_AUTH_TOKEN is required")

    payload = {
        "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
        "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?",
    }
    req = urllib.request.Request(
        f"{args.base_url.rstrip('/')}/drift/analyze-direct",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {args.token}")
    with urllib.request.urlopen(req, timeout=90) as response:
        print(response.status)
        print(response.read().decode("utf-8"))


if __name__ == "__main__":
    main()
