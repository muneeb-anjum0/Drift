#!/usr/bin/env python3
"""End-to-end regression test for project-level requirement relevance filtering."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any


REQUIREMENTS = [
    ("Email password reset", "The system shall allow users to reset their password by email."),
    ("Monthly report CSV export", "The system shall allow admins to export monthly reports as CSV."),
    ("Invoice PDF export", "The system shall allow users to export invoices as PDF."),
    ("Admin two-factor authentication", "The system shall require two-factor authentication for all admin users."),
    ("Subscription expiry notification", "The system shall notify users when their subscription expires."),
]

REGRESSIONS = [
    {
        "name": "monthly report unchanged",
        "message": "Can we also let admins download the same monthly report from the existing reports page?",
        "selected": "Monthly report CSV export",
        "ignored": "Email password reset",
        "expected_detected": [],
    },
    {
        "name": "SMS OTP added",
        "message": "Also add password reset through SMS OTP.",
        "selected": "Email password reset",
        "ignored": "Monthly report CSV export",
        "expected_detected": ["added"],
    },
    {
        "name": "weekly monthly modified",
        "message": "Make the usage reports monthly instead of weekly.",
        "selected": "Monthly report CSV export",
        "ignored": "Email password reset",
        "expected_detected": ["modified"],
    },
    {
        "name": "invoice PDF removed",
        "message": "Remove the invoice PDF export feature.",
        "selected": "Invoice PDF export",
        "ignored": "Email password reset",
        "expected_detected": ["removed"],
    },
    {
        "name": "2FA contradiction",
        "message": "Admins should be able to log in without two-factor authentication.",
        "selected": "Admin two-factor authentication",
        "ignored": "Monthly report CSV export",
        "expected_detected": ["contradiction"],
    },
]


def request_json(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    timeout: int = 90,
) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc}") from exc


def data_at(response: dict[str, Any], key: str) -> Any:
    if not response.get("success", False):
        raise RuntimeError(f"API returned failure: {response}")
    return response.get("data", {}).get(key)


def setup_project(base_url: str, timeout: int) -> tuple[str, str]:
    stamp = int(time.time())
    email = f"drift-regression-{stamp}@example.test"
    password = "TestPass123!"
    token = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/auth/register",
            {"name": "Drift Regression", "email": email, "password": password},
            timeout=timeout,
        ),
        "token",
    )
    workspace = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/workspaces",
            {"name": f"Regression Workspace {stamp}", "description": "Requirement filtering smoke test"},
            token=token,
            timeout=timeout,
        ),
        "workspace",
    )
    project = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/projects",
            {
                "workspaceId": workspace["_id"],
                "name": f"Regression Project {stamp}",
                "clientName": "Regression Client",
                "description": "Requirement relevance regression",
                "status": "active",
                "priority": "medium",
                "originalScope": "Regression scope",
            },
            token=token,
            timeout=timeout,
        ),
        "project",
    )
    for title, description in REQUIREMENTS:
        request_json(
            "POST",
            f"{base_url}/api/v1/requirements",
            {
                "projectId": project["_id"],
                "workspaceId": workspace["_id"],
                "title": title,
                "description": description,
                "type": "functional",
                "priority": "medium",
                "status": "approved",
                "source": "manual",
                "acceptanceCriteria": [],
                "tags": [],
            },
            token=token,
            timeout=timeout,
        )
    version = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/requirements/baseline",
            {"projectId": project["_id"], "label": "Regression baseline"},
            token=token,
            timeout=timeout,
        ),
        "version",
    )
    return token, project["_id"], version["_id"]


def assert_regression(base_url: str, token: str, project_id: str, version_id: str, case: dict[str, Any], timeout: int) -> None:
    analysis = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/drift/analyze",
            {
                "projectId": project_id,
                "baselineVersionId": version_id,
                "inputType": "client_message",
                "inputText": case["message"],
            },
            token=token,
            timeout=timeout,
        ),
        "analysis",
    )
    requirement_results = analysis.get("requirementResults", [])
    selected = [item for item in requirement_results if item.get("selected")]
    ignored = [item for item in requirement_results if item.get("status") == "ignored"]
    detected_types = [change.get("changeType") for change in analysis.get("detectedChanges", [])]

    selected_titles = {item.get("title") for item in selected}
    ignored_titles = {item.get("title") for item in ignored}
    if case["selected"] not in selected_titles:
        raise AssertionError(f"{case['name']}: expected selected {case['selected']!r}, got {selected_titles}")
    if case["ignored"] not in ignored_titles:
        raise AssertionError(f"{case['name']}: expected ignored {case['ignored']!r}, got {ignored_titles}")
    if detected_types != case["expected_detected"]:
        raise AssertionError(f"{case['name']}: expected detected {case['expected_detected']}, got {detected_types}")
    for item in ignored:
        if item.get("label"):
            raise AssertionError(f"{case['name']}: ignored requirement {item.get('title')} leaked label {item.get('label')}")

    label_text = "unchanged" if not detected_types else detected_types[0]
    print(f"PASS {case['name']} selected requirement = {case['selected']}")
    print(f"PASS {case['ignored']} ignored")
    print(f"PASS final label {label_text}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds")
    args = parser.parse_args()
    base_url = args.backend_url.rstrip("/")

    try:
        request_json("GET", f"{base_url}/health", timeout=args.timeout)
        token, project_id, version_id = setup_project(base_url, args.timeout)
        for case in REGRESSIONS:
            assert_regression(base_url, token, project_id, version_id, case, args.timeout)
    except Exception as exc:
        print(f"FAIL project requirement analysis: {exc}", file=sys.stderr)
        return 1

    print("PASS project requirement analysis filters unrelated requirements end-to-end")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
