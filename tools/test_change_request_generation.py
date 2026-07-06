#!/usr/bin/env python3
"""End-to-end regression checks for grouped drift change request generation."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any


REQUIREMENTS = [
    ("Student email login", "The system shall allow students to log in using their registered email and password."),
    ("Course enrollment", "The system shall allow students to enroll in available courses before the enrollment deadline."),
    ("Attendance view", "The system shall allow students to view their attendance percentage for each enrolled course."),
    ("Assignment submission", "The system shall allow students to upload assignment files before the due date."),
    ("Grade viewing", "The system shall allow students to view published grades for completed assessments."),
    ("Semester fee payment", "The system shall allow students to pay semester fees using a card payment method."),
    ("Academic report PDF download", "The system shall allow students to download academic reports as PDF files."),
    ("Admin course management", "The system shall allow admins to create, update, and archive courses."),
    ("Student notifications", "The system shall notify students about enrollment deadlines, assignment deadlines, and published grades."),
    ("Admin report CSV export", "The system shall allow admins to export student performance reports as CSV files."),
]

CASES = [
    {
        "name": "parent portal",
        "message": "Add parent accounts so parents can log in and view attendance, grades, fee status, and notifications for their children.",
        "title_terms": ["parent"],
        "label": "added",
        "max_changes": 1,
        "impact_not": "low",
        "min_hours": 12,
        "requires_change_request": True,
    },
    {
        "name": "SMS OTP",
        "message": "Also allow students to reset their password through SMS OTP.",
        "title_terms": ["sms", "password"],
        "label": "added",
        "max_changes": 1,
        "requires_change_request": True,
    },
    {
        "name": "same report page",
        "message": "Can students also download the same academic report from the reports page instead of only from the dashboard?",
        "max_score": 20,
        "max_changes": 1,
        "requires_change_request": False,
    },
    {
        "name": "interactive reports",
        "message": "Instead of PDF academic reports, generate interactive web-based report cards with charts, filters, and downloadable summaries.",
        "title_terms": ["interactive", "report"],
        "label": "modified",
        "max_changes": 1,
        "impact_not": "low",
        "min_hours": 12,
        "requires_change_request": True,
    },
    {
        "name": "card payment",
        "message": "Remove card payment from the first release. Students will only view fee status for now.",
        "title_terms": ["card", "payment"],
        "label": "removed",
        "max_changes": 1,
        "min_score": 40,
        "max_score": 70,
        "requires_change_request": True,
    },
]


def request_json(method: str, url: str, payload: dict[str, Any] | None = None, token: str | None = None, timeout: int = 120) -> dict[str, Any]:
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
        raise RuntimeError("Backend is not reachable. Start with docker compose up --build -d") from exc


def data_at(response: dict[str, Any], key: str) -> Any:
    if not response.get("success", False):
        raise RuntimeError(f"API returned failure: {response}")
    return response.get("data", {}).get(key)


def setup_project(base_url: str, timeout: int) -> tuple[str, str, str]:
    stamp = int(time.time())
    token = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/auth/register",
            {"name": "Change Request Regression", "email": f"change-regression-{stamp}@example.test", "password": "TestPass123!"},
            timeout=timeout,
        ),
        "token",
    )
    workspace = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/workspaces",
            {"name": f"Change Regression Workspace {stamp}", "description": "Change request regression tests"},
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
                "name": "EduTrack Student Portal",
                "clientName": "BrightPath Academy",
                "description": "Student portal regression project",
                "status": "active",
                "priority": "medium",
                "originalScope": "EduTrack student portal baseline",
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
            {"projectId": project["_id"], "label": "EduTrack baseline"},
            token=token,
            timeout=timeout,
        ),
        "version",
    )
    return token, project["_id"], version["_id"]


def analyze_save_generate(base_url: str, token: str, project_id: str, version_id: str, message: str, timeout: int) -> tuple[dict[str, Any], dict[str, Any] | None]:
    analysis = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/drift/analyze",
            {"projectId": project_id, "baselineVersionId": version_id, "inputType": "client_message", "inputText": message},
            token=token,
            timeout=timeout,
        ),
        "analysis",
    )
    saved = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/drift/save",
            {
                "projectId": project_id,
                "baselineVersionId": version_id,
                "inputText": analysis["inputText"],
                "inputType": analysis["inputType"],
                "detectedChanges": analysis["detectedChanges"],
                "requirementResults": analysis.get("requirementResults", []),
                "driftScore": analysis["driftScore"],
                "riskLevel": analysis["riskLevel"],
                "summary": analysis["summary"],
                "addedCount": analysis["addedCount"],
                "modifiedCount": analysis["modifiedCount"],
                "removedCount": analysis["removedCount"],
                "ambiguousCount": analysis["ambiguousCount"],
                "contradictionCount": analysis["contradictionCount"],
                "estimatedExtraHours": analysis["estimatedExtraHours"],
                "analysisEngine": analysis["analysisEngine"],
                "ollamaUsed": analysis["ollamaUsed"],
                "ollamaModel": analysis.get("ollamaModel"),
                "status": "saved",
            },
            token=token,
            timeout=timeout,
        ),
        "analysis",
    )
    if not saved.get("detectedChanges"):
        return saved, None
    draft = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/change-requests/generate",
            {"driftAnalysisId": saved["_id"]},
            token=token,
            timeout=timeout,
        ),
        "changeRequest",
    )
    return saved, draft


def assert_case(case: dict[str, Any], analysis: dict[str, Any], draft: dict[str, Any] | None) -> None:
    changes = analysis.get("detectedChanges", [])
    if len(changes) > case.get("max_changes", 99):
        raise AssertionError(f"{case['name']}: expected grouped changes, got {len(changes)} {changes}")
    if "min_score" in case and analysis["driftScore"] < case["min_score"]:
        raise AssertionError(f"{case['name']}: score too low {analysis['driftScore']}")
    if "max_score" in case and analysis["driftScore"] > case["max_score"]:
        raise AssertionError(f"{case['name']}: score too high {analysis['driftScore']}")
    if case.get("requires_change_request") is False:
        if draft and analysis["driftScore"] > 20:
            raise AssertionError(f"{case['name']}: generated major change request for low/no drift")
        print(f"PASS {case['name']} unchanged/low")
        return
    if not draft:
        raise AssertionError(f"{case['name']}: expected change request draft")
    requested = draft.get("changesRequested", [])
    if len(requested) > case.get("max_changes", 99):
        raise AssertionError(f"{case['name']}: duplicate request items {requested}")
    first = requested[0]
    title_text = (draft.get("title", "") + " " + first.get("title", "")).lower()
    for term in case.get("title_terms", []):
        if term.lower() not in title_text:
            raise AssertionError(f"{case['name']}: missing title term {term!r} in {title_text!r}")
    if case.get("label") and first.get("changeType") != case["label"]:
        raise AssertionError(f"{case['name']}: expected label {case['label']}, got {first.get('changeType')}")
    if case.get("impact_not") and first.get("impact") == case["impact_not"]:
        raise AssertionError(f"{case['name']}: impact should not be {case['impact_not']}")
    if case.get("min_hours") and analysis.get("estimatedExtraHours", 0) < case["min_hours"]:
        raise AssertionError(f"{case['name']}: hours too low {analysis.get('estimatedExtraHours')}")
    summary = draft.get("summary", "")
    sentences = [item.strip().lower() for item in summary.replace("!", ".").replace("?", ".").split(".") if item.strip()]
    if len(sentences) != len(set(sentences)):
        raise AssertionError(f"{case['name']}: duplicate summary sentence {summary!r}")
    if case["name"] == "parent portal" and len(first.get("affectedModules", [])) < 4:
        raise AssertionError(f"{case['name']}: expected multi-module affectedModules, got {first}")
    print(f"PASS {case['name']} grouped")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--timeout", type=int, default=180, help="Request timeout in seconds")
    args = parser.parse_args()
    base_url = args.backend_url.rstrip("/")
    try:
        request_json("GET", f"{base_url}/health", timeout=args.timeout)
        token, project_id, version_id = setup_project(base_url, args.timeout)
        for case in CASES:
            analysis, draft = analyze_save_generate(base_url, token, project_id, version_id, case["message"], args.timeout)
            assert_case(case, analysis, draft)
    except Exception as exc:
        print(f"FAIL change request generation: {exc}", file=sys.stderr)
        return 1
    print("PASS change request generation regressions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
