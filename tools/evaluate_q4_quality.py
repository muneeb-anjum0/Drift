#!/usr/bin/env python3
"""Run Q4_K_M portfolio-quality checks and write an evaluation report."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BACKEND_URL = "http://localhost:5000"
INFERENCE_URL = "http://localhost:8000"
REPORT_DIR = Path("reports/evaluation")

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
        "id": "same_prescription_pdf",
        "name": "Same prescription PDF access",
        "message": "Can patients also download the same prescription PDF from their visit history page?",
        "expected_label": "modified",
        "max_score": 15,
        "max_hours": 3,
    },
    {
        "id": "sms_otp",
        "name": "SMS OTP password reset",
        "message": "Also allow patients to reset their password through SMS OTP.",
        "expected_label": "added",
        "min_score": 30,
        "max_score": 40,
        "max_hours": 8,
    },
    {
        "id": "card_payment_removal",
        "name": "Card payment removal",
        "message": "Remove card payment from the first release. Patients will only view invoice and payment status for now.",
        "expected_label": "removed",
        "min_score": 40,
        "max_score": 70,
        "max_hours": 8,
    },
    {
        "id": "family_portal",
        "name": "Family member portal",
        "message": "Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.",
        "expected_label": "added",
        "min_score": 50,
        "max_score": 75,
        "min_hours": 12,
        "required_modules": ["Role Management", "Payment Status", "Notifications"],
    },
    {
        "id": "appointment_cancel_window",
        "name": "Appointment cancellation window",
        "message": "Allow patients to cancel appointments up to 2 hours before the scheduled time instead of 24 hours.",
        "expected_label": "modified",
        "min_score": 30,
        "max_score": 55,
        "max_hours": 12,
    },
    {
        "id": "appointment_cancel_contradiction",
        "name": "Appointment cancellation contradiction",
        "message": "Patients should be able to cancel appointments anytime, even after the scheduled appointment time.",
        "expected_label": "contradiction",
        "min_score": 65,
        "max_score": 85,
        "max_hours": 18,
    },
    {
        "id": "vague_dashboard",
        "name": "Vague dashboard request",
        "message": "Make the patient dashboard smarter and easier to use.",
        "expected_label": "ambiguous",
        "min_score": 20,
        "max_score": 40,
        "max_hours": 6,
        "summary_not_contains": ["implementation-ready", "charts", "filters"],
    },
    {
        "id": "clinic_analytics",
        "name": "Clinic analytics redesign",
        "message": "Instead of CSV exports, create interactive clinic analytics dashboards with charts, filters, doctor-wise summaries, and downloadable snapshots.",
        "expected_label": "modified",
        "min_score": 45,
        "max_score": 70,
        "min_hours": 12,
        "summary_contains": ["csv", "clinic analytics"],
        "summary_not_contains": ["academic", "report card"],
    },
]


def request_json(method: str, url: str, payload: dict[str, Any] | None = None, token: str | None = None, timeout: int = 180) -> dict[str, Any]:
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
        raise RuntimeError("Backend is not reachable. Start Docker manually with docker compose up --build.") from exc


def data_at(response: dict[str, Any], key: str) -> Any:
    if not response.get("success", False):
        raise RuntimeError(f"API returned failure: {response}")
    return response.get("data", {}).get(key)


def check_runtime(backend_url: str, inference_url: str, timeout: int, allow_non_q4: bool) -> dict[str, Any]:
    request_json("GET", f"{backend_url}/health", timeout=timeout)
    health = request_json("GET", f"{inference_url}/health", timeout=timeout)
    if not health.get("model_loaded"):
        raise RuntimeError(f"Q4 runtime is not loaded: {health.get('error') or health}")
    quantization = str(health.get("quantization_label", ""))
    if quantization != "Q4_K_M" and not allow_non_q4:
        raise RuntimeError(f"Expected Q4_K_M runtime, got {quantization or 'unknown'}.")
    return health


def setup_project(base_url: str, timeout: int) -> tuple[str, str, str]:
    stamp = int(time.time())
    token = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/auth/register",
            {"name": "Q4 Evaluation", "email": f"q4-eval-{stamp}@example.test", "password": "TestPass123!"},
            timeout=timeout,
        ),
        "token",
    )
    workspace = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/workspaces",
            {"name": f"Q4 Evaluation Workspace {stamp}", "description": "Temporary evaluation workspace"},
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
                "description": "Q4 evaluation project",
                "status": "active",
                "priority": "medium",
                "originalScope": "Clinic portal baseline",
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
            {"projectId": project["_id"], "label": "Q4 evaluation baseline"},
            token=token,
            timeout=timeout,
        ),
        "version",
    )
    return token, project["_id"], version["_id"]


def analyze_case(base_url: str, token: str, project_id: str, version_id: str, case: dict[str, Any], timeout: int) -> dict[str, Any]:
    started = time.perf_counter()
    analysis = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/drift/analyze",
            {"projectId": project_id, "baselineVersionId": version_id, "inputType": "client_message", "inputText": case["message"]},
            token=token,
            timeout=timeout,
        ),
        "analysis",
    )
    latency_ms = int((time.perf_counter() - started) * 1000)
    changes = analysis.get("detectedChanges", [])
    first_change = changes[0] if changes else {}
    actual_label = str(first_change.get("changeType") or ("unchanged" if analysis.get("driftScore", 0) <= 15 else "unknown")).lower()
    notes = validate_case(case, analysis, first_change)
    return {
        "id": case["id"],
        "name": case["name"],
        "expectedLabel": case["expected_label"],
        "actualLabel": actual_label,
        "score": int(analysis.get("driftScore", 0)),
        "impact": str(first_change.get("impact", analysis.get("riskLevel", ""))),
        "estimatedHours": float(analysis.get("estimatedExtraHours", 0)),
        "latencyMs": latency_ms,
        "passed": len(notes) == 0,
        "title": str(first_change.get("title", "")),
        "summary": str(analysis.get("summary", "")),
        "reasoning": str(first_change.get("description", "")),
        "notes": notes,
    }


def validate_case(case: dict[str, Any], analysis: dict[str, Any], first_change: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    score = int(analysis.get("driftScore", 0))
    hours = float(analysis.get("estimatedExtraHours", 0))
    actual = str(first_change.get("changeType") or ("modified" if score > 0 else "unchanged")).lower()
    if actual != case["expected_label"]:
        notes.append(f"expected {case['expected_label']}, got {actual}")
    if score < case.get("min_score", 0):
        notes.append(f"score too low: {score}")
    if "max_score" in case and score > case["max_score"]:
        notes.append(f"score too high: {score}")
    if hours < case.get("min_hours", 0):
        notes.append(f"hours too low: {hours}")
    if "max_hours" in case and hours > case["max_hours"]:
        notes.append(f"hours too high: {hours}")
    modules = first_change.get("affectedModules", [])
    for module in case.get("required_modules", []):
        if module not in modules:
            notes.append(f"missing module {module}")
    summary = " ".join([str(analysis.get("summary", "")), str(first_change.get("description", ""))]).lower()
    for term in case.get("summary_contains", []):
        if term not in summary:
            notes.append(f"missing summary term {term}")
    for term in case.get("summary_not_contains", []):
        if term in summary:
            notes.append(f"forbidden summary term {term}")
    return notes


def write_reports(report: dict[str, Any], output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    json_path = output_dir / f"q4_quality_{stamp}.json"
    md_path = output_dir / f"q4_quality_{stamp}.md"
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    lines = [
        "# Q4 Quality Evaluation",
        "",
        f"- Generated: {report['generatedAt']}",
        f"- Model: {report['model']['label']}",
        f"- Pass rate: {report['passRate']:.1f}%",
        f"- Average latency: {report['averageLatencyMs']:.0f} ms",
        "",
        "| Case | Expected | Actual | Score | Result |",
        "| --- | --- | --- | ---: | --- |",
    ]
    for item in report["cases"]:
        status = "pass" if item["passed"] else "fail"
        lines.append(f"| {item['name']} | {item['expectedLabel']} | {item['actualLabel']} | {item['score']} | {status} |")
    lines.extend(["", f"Recommendation: {report['recommendation']}"])
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return json_path, md_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default=BACKEND_URL)
    parser.add_argument("--inference-url", default=INFERENCE_URL)
    parser.add_argument("--output", default=str(REPORT_DIR), help="Folder for JSON and Markdown reports.")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--allow-non-q4", action="store_true", help="Allow this script to run when health does not report Q4_K_M.")
    args = parser.parse_args()
    try:
        health = check_runtime(args.backend_url.rstrip("/"), args.inference_url.rstrip("/"), args.timeout, args.allow_non_q4)
        token, project_id, version_id = setup_project(args.backend_url.rstrip("/"), args.timeout)
        cases = [analyze_case(args.backend_url.rstrip("/"), token, project_id, version_id, case, args.timeout) for case in CASES]
    except Exception as exc:
        print(f"FAIL Q4 evaluation: {exc}", file=sys.stderr)
        return 1

    pass_count = sum(1 for item in cases if item["passed"])
    average_latency = sum(item["latencyMs"] for item in cases) / max(len(cases), 1)
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": "q4",
        "model": {
            "label": health.get("model_label", "Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)"),
            "quantization": health.get("quantization_label", "Q4_K_M"),
            "runtime": "Local GGUF / llama.cpp",
            "health": health.get("status", "unknown"),
            "modelLoaded": bool(health.get("model_loaded")),
            "ggufModelPath": health.get("gguf_model_path", ""),
        },
        "passCount": pass_count,
        "caseCount": len(cases),
        "passRate": pass_count / max(len(cases), 1) * 100,
        "averageLatencyMs": average_latency,
        "recommendation": "Review failed cases before demoing; otherwise the Q4 portfolio runtime is ready for local DriftLedger demos.",
        "cases": cases,
    }
    json_path, md_path = write_reports(report, Path(args.output))
    for item in cases:
        status = "PASS" if item["passed"] else "FAIL"
        print(f"{status} {item['name']}: expected={item['expectedLabel']} actual={item['actualLabel']} score={item['score']} latency={item['latencyMs']}ms")
        for note in item["notes"]:
            print(f"  - {note}")
    print(f"\nWrote {json_path}")
    print(f"Wrote {md_path}")
    return 0 if pass_count == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
