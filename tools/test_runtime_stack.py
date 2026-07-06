#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


PAYLOAD = {
    "baseline_requirement": "The system shall allow admins to export monthly reports as CSV.",
    "new_client_message": "Can we also let admins download the same monthly report from the existing reports page?",
}


def request(method: str, url: str, payload: dict[str, str] | None = None, timeout: int = 120) -> tuple[int, str]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        return 0, str(exc)


def check(name: str, method: str, url: str, expected_status: int = 200, payload: dict[str, str] | None = None) -> bool:
    status, body = request(method, url, payload)
    ok = status == expected_status
    print(f"{'PASS' if ok else 'FAIL'} {name}: {method} {url} -> {status}")
    if not ok:
        print(body[:1000])
    return ok


def check_prediction(name: str, url: str, wrapped: bool) -> bool:
    status, body = request("POST", url, PAYLOAD, timeout=180)
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
    checks = [
        check("llama health", "GET", "http://localhost:8080/health"),
        check("inference health", "GET", "http://localhost:8000/health"),
        check_prediction("inference predict", "http://localhost:8000/predict-drift", wrapped=False),
        check("backend health", "GET", "http://localhost:5000/health"),
        check_prediction("backend model analyze", "http://localhost:5000/api/drift/analyze", wrapped=True),
        check("frontend root", "GET", "http://localhost:5173"),
    ]
    if not all(checks):
        sys.exit(1)
    print("\nRuntime stack checks passed.")


if __name__ == "__main__":
    main()
