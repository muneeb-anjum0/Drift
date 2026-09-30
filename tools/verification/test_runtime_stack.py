#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


PAYLOAD = {
    "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
    "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?",
}


def request(
    method: str,
    url: str,
    payload: dict[str, str] | None = None,
    timeout: int = 120,
    headers: dict[str, str] | None = None,
) -> tuple[int, str]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        return 0, str(exc)


def check(
    name: str,
    method: str,
    url: str,
    expected_status: int = 200,
    payload: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
) -> bool:
    status, body = request(method, url, payload, headers=headers)
    ok = status == expected_status
    print(f"{'PASS' if ok else 'FAIL'} {name}: {method} {url} -> {status}")
    if not ok:
        print(body[:1000])
    return ok


def check_prediction(name: str, url: str, wrapped: bool, headers: dict[str, str]) -> bool:
    status, body = request("POST", url, PAYLOAD, timeout=180, headers=headers)
    ok = status == 200
    label = ""
    if ok:
        try:
            data = json.loads(body)
            prediction = data.get("data", data) if wrapped else data
            label = str(prediction.get("label", "")).lower()
            ok = label in {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
        except (json.JSONDecodeError, AttributeError):
            ok = False
    print(f"{'PASS' if ok else 'FAIL'} {name}: POST {url} -> {status}, label={label or '<none>'}")
    if not ok:
        print(body[:1000])
    return ok


def main() -> None:
    inference_api_key = os.getenv("DRIFT_INFERENCE_API_KEY", "")
    auth_token = os.getenv("DRIFT_AUTH_TOKEN", "")
    if not inference_api_key or not auth_token:
        print("DRIFT_INFERENCE_API_KEY and DRIFT_AUTH_TOKEN are required", file=sys.stderr)
        sys.exit(2)
    inference_headers = {"X-Drift-Inference-Key": inference_api_key}
    auth_headers = {"Authorization": f"Bearer {auth_token}"}
    checks = [
        check("llama health", "GET", "http://localhost:8080/health"),
        check("inference health", "GET", "http://localhost:8000/health", headers=inference_headers),
        check_prediction("inference predict", "http://localhost:8000/predict-drift", wrapped=False, headers=inference_headers),
        check("backend health", "GET", "http://localhost:5000/health"),
        check_prediction("backend model analyze", "http://localhost:5000/api/drift/analyze", wrapped=True, headers=auth_headers),
        check("frontend root", "GET", "http://localhost:5173"),
    ]
    if not all(checks):
        sys.exit(1)
    print("\nRuntime stack checks passed.")


if __name__ == "__main__":
    main()
