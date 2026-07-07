#!/usr/bin/env python3
"""Smoke test the demo billing summary endpoint."""

from __future__ import annotations

import argparse
import sys

from test_change_request_generation import data_at, request_json, setup_project


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--timeout", type=int, default=60, help="Request timeout in seconds")
    args = parser.parse_args()
    base_url = args.backend_url.rstrip("/")

    try:
        request_json("GET", f"{base_url}/health", timeout=args.timeout)
        token, _project_id, _version_id = setup_project(base_url, args.timeout, email_prefix="billing-summary")
        summary = data_at(
            request_json("GET", f"{base_url}/api/v1/billing/summary", token=token, timeout=args.timeout),
            "summary",
        )
        if summary.get("planName") != "DriftLedger Local Pro":
            raise AssertionError(f"unexpected plan name: {summary}")
        if summary.get("quantization") != "Q4_K_M" or not summary.get("localInference"):
            raise AssertionError(f"billing summary must describe local Q4 runtime: {summary}")
        if summary.get("projects", 0) < 1:
            raise AssertionError(f"expected at least one project in usage summary: {summary}")
    except Exception as exc:
        print(f"FAIL billing summary: {exc}", file=sys.stderr)
        return 1

    print("PASS billing summary endpoint")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
