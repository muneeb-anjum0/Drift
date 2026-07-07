#!/usr/bin/env python3
"""End-to-end regression checks for grouped clinic change request generation."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any


REQUIREMENTS = [
    ("Patient email login", "The system shall allow patients to log in using their registered email and password."),
    ("Appointment booking", "The system shall allow patients to book appointments with doctors from available clinic slots."),
    ("Appointment cancellation", "The system shall allow patients to cancel appointments up to 24 hours before the scheduled time."),
    ("Prescription PDF download", "The system shall allow patients to download prescription PDFs from their visit history."),
    ("Invoice card payment", "The system shall allow patients to pay invoices using a card payment method."),
    ("Invoice status view", "The system shall allow patients to view invoice and payment status."),
    ("Appointment notifications", "The system shall notify patients about appointment bookings, changes, and cancellations."),
    ("Clinic CSV export", "The system shall allow admins to export clinic reports as CSV files."),
    ("Patient dashboard", "The system shall allow patients to view a dashboard with appointments, prescriptions, invoices, and notifications."),
]

CASES = [
    {
        "name": "Existing prescription PDF moved to visit history",
        "message": "Can patients also download the same prescription PDF from their visit history page?",
        "max_score": 20,
        "max_changes": 1,
        "requires_change_request": False,
    },
    {
        "name": "Add SMS OTP as a password reset option",
        "message": "Also allow patients to reset their password through SMS OTP.",
        "title_terms": ["sms", "password"],
        "label": "added",
        "max_changes": 1,
        "min_score": 30,
        "max_score": 40,
        "requires_change_request": True,
    },
    {
        "name": "Remove card payments from the first release",
        "message": "Remove card payment from the first release. Patients will only view invoice and payment status for now.",
        "title_terms": ["card", "payment"],
        "label": "removed",
        "max_changes": 1,
        "min_score": 40,
        "max_score": 70,
        "min_hours": 2,
        "max_hours": 8,
        "requires_change_request": True,
    },
    {
        "name": "Add family access to patient records",
        "message": "Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.",
        "title_terms": ["family", "portal"],
        "label": "added",
        "max_changes": 1,
        "min_score": 50,
        "max_score": 75,
        "min_hours": 12,
        "max_hours": 24,
        "required_modules": ["Payment Status", "Notifications"],
        "forbidden_titles": ["Remove Card Payment From First Release"],
        "no_removed": True,
        "requires_change_request": True,
    },
    {
        "name": "Shorten the appointment cancellation window",
        "message": "Allow patients to cancel appointments up to 2 hours before the scheduled time instead of 24 hours.",
        "title_terms": ["cancellation", "window"],
        "label": "modified",
        "max_changes": 1,
        "min_score": 30,
        "max_score": 55,
        "min_hours": 6,
        "max_hours": 12,
        "requires_change_request": True,
    },
    {
        "name": "Allow cancellations after scheduled time",
        "message": "Patients should be able to cancel appointments anytime, even after the scheduled appointment time.",
        "title_terms": ["cancellation", "policy"],
        "label": "contradiction",
        "max_changes": 1,
        "min_score": 65,
        "max_score": 85,
        "min_hours": 8,
        "max_hours": 18,
        "requires_change_request": True,
    },
    {
        "name": "Clarify an undefined dashboard improvement",
        "message": "Make the patient dashboard smarter and easier to use.",
        "title_terms": ["clarify", "dashboard"],
        "label": "ambiguous",
        "max_changes": 1,
        "min_score": 20,
        "max_score": 40,
        "max_hours": 6,
        "summary_not_contains": ["implementation-ready", "charts", "filters"],
        "requires_change_request": True,
    },
    {
        "name": "Replace CSV exports with clinic analytics dashboards",
        "message": "Instead of CSV exports, create interactive clinic analytics dashboards with charts, filters, doctor-wise summaries, and downloadable snapshots.",
        "title_terms": ["csv", "clinic", "analytics"],
        "label": "modified",
        "max_changes": 1,
        "min_score": 45,
        "max_score": 70,
        "min_hours": 12,
        "max_hours": 24,
        "summary_contains": ["csv", "clinic analytics"],
        "summary_not_contains": ["academic", "report card"],
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
            {"name": "Clinic Change Regression", "email": f"clinic-change-regression-{stamp}@example.test", "password": "TestPass123!"},
            timeout=timeout,
        ),
        "token",
    )
    workspace = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/workspaces",
            {"name": f"Clinic Regression Workspace {stamp}", "description": "Change request regression tests"},
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
                "name": "MediCare Clinic Portal",
                "clientName": "MediCare Clinic",
                "description": "Clinic portal regression project",
                "status": "active",
                "priority": "medium",
                "originalScope": "MediCare clinic portal baseline",
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
            {"projectId": project["_id"], "label": "MediCare baseline"},
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
    if not saved.get("detectedChanges") or saved.get("driftScore", 0) <= 20:
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
    if "max_hours" in case and analysis.get("estimatedExtraHours", 0) > case["max_hours"]:
        raise AssertionError(f"{case['name']}: hours too high {analysis.get('estimatedExtraHours')}")
    if case.get("no_removed") and analysis.get("removedCount", 0) != 0:
        raise AssertionError(f"{case['name']}: should not include removed/card-payment drift {analysis}")
    if case.get("requires_change_request") is False:
        if draft:
            raise AssertionError(f"{case['name']}: generated change request for low/no drift")
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
    for forbidden in case.get("forbidden_titles", []):
        if forbidden.lower() in title_text:
            raise AssertionError(f"{case['name']}: forbidden title appeared in {title_text!r}")
    if case.get("label") and first.get("changeType") != case["label"]:
        raise AssertionError(f"{case['name']}: expected label {case['label']}, got {first.get('changeType')}")
    if case.get("min_hours") and analysis.get("estimatedExtraHours", 0) < case["min_hours"]:
        raise AssertionError(f"{case['name']}: hours too low {analysis.get('estimatedExtraHours')}")
    for module in case.get("required_modules", []):
        if module not in first.get("affectedModules", []):
            raise AssertionError(f"{case['name']}: missing module {module!r} in {first.get('affectedModules')}")
    combined_summary = " ".join([draft.get("summary", ""), first.get("description", ""), draft.get("businessReason", "")]).lower()
    for term in case.get("summary_contains", []):
        if term.lower() not in combined_summary:
            raise AssertionError(f"{case['name']}: missing summary term {term!r} in {combined_summary!r}")
    for term in case.get("summary_not_contains", []):
        if term.lower() in combined_summary:
            raise AssertionError(f"{case['name']}: forbidden summary term {term!r} in {combined_summary!r}")
    sentences = [item.strip().lower() for item in draft.get("summary", "").replace("!", ".").replace("?", ".").split(".") if item.strip()]
    if len(sentences) != len(set(sentences)):
        raise AssertionError(f"{case['name']}: duplicate summary sentence {draft.get('summary')!r}")
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
