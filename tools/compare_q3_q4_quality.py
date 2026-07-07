#!/usr/bin/env python3
"""Capture and compare Q3_K_M vs Q4_K_M DriftLedger quality runs."""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "reports" / "model_comparison"
CAPTURE_DIR = REPORT_DIR / "captures"
PASSWORD = "TestPass123!"

COMMON_REQUIREMENTS = [
    ("Patient email login", "The system shall allow patients to log in using their registered email and password."),
    ("Appointment booking", "The system shall allow patients to book appointments with doctors from available clinic slots."),
    ("Prescription PDF download", "The system shall allow patients to download prescriptions as PDF files after doctor approval."),
    ("Invoice card payment", "The system shall allow patients to pay invoices using a card payment method."),
    ("Invoice status view", "The system shall allow patients to view invoice and payment status."),
    ("Appointment notifications", "The system shall notify patients about appointment bookings, changes, and cancellations."),
]

CASES: list[dict[str, Any]] = [
    {
        "id": "no_drift_prescription_pdf",
        "name": "No drift: same prescription PDF",
        "requirements": [("Prescription PDF download", "The system shall allow patients to download prescriptions as PDF files after doctor approval.")],
        "message": "Can patients also download the same prescription PDF from the visit history page?",
        "expected": {"labels": ["unchanged"], "max_score": 10, "max_changes": 0},
    },
    {
        "id": "sms_otp",
        "name": "SMS OTP",
        "requirements": [("Patient email login", "The system shall allow patients to log in using their registered email and password.")],
        "message": "Also allow patients to reset their password through SMS OTP.",
        "expected": {"labels": ["added"], "title_contains": ["sms", "password"]},
    },
    {
        "id": "family_portal",
        "name": "Family portal",
        "requirements": COMMON_REQUIREMENTS,
        "message": "Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.",
        "expected": {
            "labels": ["added"],
            "title_contains": ["family", "portal"],
            "forbidden_title_contains": ["card payment"],
            "forbidden_labels": ["removed"],
        },
    },
    {
        "id": "cancellation_window",
        "name": "Cancellation window",
        "requirements": [("Appointment cancellation", "The system shall allow patients to cancel appointments at least 24 hours before the scheduled time.")],
        "message": "Allow patients to cancel appointments up to 2 hours before the scheduled time instead of 24 hours.",
        "expected": {"labels": ["modified"], "title_contains": ["cancellation", "window"]},
    },
    {
        "id": "cancellation_contradiction",
        "name": "Cancellation contradiction",
        "requirements": [("Appointment cancellation", "The system shall allow patients to cancel appointments at least 24 hours before the scheduled time.")],
        "message": "Patients should be able to cancel appointments anytime, even after the scheduled appointment time.",
        "expected": {"labels": ["contradiction"], "max_score": 89},
    },
    {
        "id": "vague_dashboard",
        "name": "Vague dashboard",
        "requirements": [("Patient email login", "The system shall allow patients to log in using their registered email and password.")],
        "message": "Make the patient dashboard smarter and easier to use.",
        "expected": {"labels": ["ambiguous"], "max_score": 40, "max_hours": 6},
    },
    {
        "id": "clinic_analytics",
        "name": "Interactive clinic analytics",
        "requirements": [("Clinic CSV export", "The system shall allow admins to export clinic appointment and billing reports as CSV files.")],
        "message": "Instead of CSV exports, create interactive clinic analytics dashboards with charts, filters, doctor-wise summaries, and downloadable snapshots.",
        "expected": {
            "labels": ["modified"],
            "title_contains": ["csv", "clinic", "analytics"],
            "min_score": 45,
            "summary_not_contains": ["academic", "report card"],
        },
    },
    {
        "id": "remove_card_payment",
        "name": "Remove card payment",
        "requirements": [("Invoice card payment", "The system shall allow patients to pay invoices using a card payment method.")],
        "message": "Remove card payment from the first release. Patients will only be able to view invoices for now.",
        "expected": {"labels": ["removed"], "title_contains": ["card", "payment"]},
    },
]


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


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


def current_model(inference_url: str) -> dict[str, Any]:
    return request_json("GET", f"{inference_url.rstrip('/')}/health", timeout=30)


def setup_project(base_url: str, requirements: list[tuple[str, str]], run_id: str, case_id: str, timeout: int) -> tuple[str, str, str]:
    token = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/auth/register",
            {"name": "Model Comparison", "email": f"model-compare-{run_id}-{case_id}@example.test", "password": PASSWORD},
            timeout=timeout,
        ),
        "token",
    )
    workspace = data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/workspaces",
            {"name": f"Model Comparison {run_id}", "description": "Q3/Q4 quality comparison"},
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
                "name": f"MediCare Comparison {case_id}",
                "clientName": "MediCare Clinic",
                "description": "Model quality comparison project",
                "status": "active",
                "priority": "medium",
                "originalScope": "Benchmark baseline",
            },
            token=token,
            timeout=timeout,
        ),
        "project",
    )
    for title, description in requirements:
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
            {"projectId": project["_id"], "label": f"Baseline {case_id}"},
            token=token,
            timeout=timeout,
        ),
        "version",
    )
    return token, project["_id"], version["_id"]


def analyze_case(base_url: str, case: dict[str, Any], run_id: str, timeout: int) -> dict[str, Any]:
    token, project_id, version_id = setup_project(base_url, case["requirements"], run_id, case["id"], timeout)
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
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    changes = analysis.get("detectedChanges", [])
    first = changes[0] if changes else {}
    observed = {
        "case_id": case["id"],
        "case_name": case["name"],
        "expected": case["expected"],
        "predicted_label": first.get("changeType") or ("unchanged" if analysis.get("driftScore", 0) <= 10 and not changes else "none"),
        "score": analysis.get("driftScore", 0),
        "impact": first.get("impact", "none"),
        "estimated_hours": analysis.get("estimatedExtraHours", 0),
        "grouped_change_title": first.get("title", ""),
        "summary": analysis.get("summary", ""),
        "reasoning": first.get("description", analysis.get("summary", "")),
        "latency_ms": latency_ms,
        "detected_changes": changes,
    }
    passed, notes = evaluate(observed)
    observed["passed"] = passed
    observed["notes"] = notes
    return observed


def evaluate(result: dict[str, Any]) -> tuple[bool, list[str]]:
    expected = result["expected"]
    notes: list[str] = []
    label = str(result.get("predicted_label", "")).lower()
    title = str(result.get("grouped_change_title", "")).lower()
    summary = (str(result.get("summary", "")) + " " + str(result.get("reasoning", ""))).lower()
    labels = [item.lower() for item in expected.get("labels", [])]
    if labels and label not in labels:
        notes.append(f"label {label!r} not in expected {labels}")
    if "min_score" in expected and result["score"] < expected["min_score"]:
        notes.append(f"score {result['score']} below {expected['min_score']}")
    if "max_score" in expected and result["score"] > expected["max_score"]:
        notes.append(f"score {result['score']} above {expected['max_score']}")
    if "max_hours" in expected and result["estimated_hours"] > expected["max_hours"]:
        notes.append(f"hours {result['estimated_hours']} above {expected['max_hours']}")
    if "max_changes" in expected and len(result.get("detected_changes", [])) > expected["max_changes"]:
        notes.append(f"detected changes {len(result.get('detected_changes', []))} above {expected['max_changes']}")
    for term in expected.get("title_contains", []):
        if term.lower() not in title:
            notes.append(f"title missing {term!r}")
    for term in expected.get("forbidden_title_contains", []):
        if term.lower() in title:
            notes.append(f"title contains forbidden {term!r}")
    forbidden_labels = {item.lower() for item in expected.get("forbidden_labels", [])}
    for change in result.get("detected_changes", []):
        if str(change.get("changeType", "")).lower() in forbidden_labels:
            notes.append(f"forbidden label {change.get('changeType')!r} appeared")
    for term in expected.get("summary_not_contains", []):
        if term.lower() in summary:
            notes.append(f"summary contains forbidden {term!r}")
    return not notes, notes


def capture(args: argparse.Namespace) -> int:
    base_url = args.backend_url.rstrip("/")
    inference_url = args.inference_url.rstrip("/")
    request_json("GET", f"{base_url}/health", timeout=30)
    health = current_model(inference_url)
    quant = str(health.get("quantization_label", "")).lower()
    expected_quant = "q3_k_m" if args.capture == "q3" else "q4_k_m"
    if quant != expected_quant:
        raise RuntimeError(
            f"Requested --capture {args.capture}, but inference health reports {health.get('quantization_label')!r}. "
            "Switch DRIFT_GGUF_MODEL_PATH in .env and restart Docker manually before capturing."
        )

    run_id = timestamp()
    results = []
    for case in CASES:
        result = analyze_case(base_url, case, run_id, args.timeout)
        results.append(result)
        print_case_row(args.capture.upper(), result)

    report = {
        "mode": args.capture,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "backend_url": base_url,
        "inference_url": inference_url,
        "model_health": health,
        "pass_count": sum(1 for item in results if item["passed"]),
        "case_count": len(results),
        "average_latency_ms": round(statistics.mean(item["latency_ms"] for item in results), 1),
        "cases": results,
    }
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    out = CAPTURE_DIR / f"{args.capture}_{run_id}.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nSaved {args.capture.upper()} capture: {out}")
    return 0


def print_case_row(mode: str, result: dict[str, Any]) -> None:
    status = "PASS" if result["passed"] else "FAIL"
    print(
        f"{mode:>3} | {status:<4} | {result['case_name']:<38} | "
        f"{result['predicted_label']:<13} | score {result['score']:>3} | "
        f"{result['latency_ms']:>8.1f} ms | {result['grouped_change_title'][:46]}"
    )
    if result["notes"]:
        print("    " + "; ".join(result["notes"]))


def load_latest(mode: str) -> dict[str, Any]:
    matches = sorted(CAPTURE_DIR.glob(f"{mode}_*.json"))
    if not matches:
        raise RuntimeError(f"No {mode.upper()} capture found in {CAPTURE_DIR}. Run `python tools\\compare_q3_q4_quality.py --capture {mode}` first.")
    return json.loads(matches[-1].read_text(encoding="utf-8"))


def load_report(path_or_latest: str, mode: str) -> dict[str, Any]:
    if path_or_latest == "latest":
        return load_latest(mode)
    path = Path(path_or_latest)
    if not path.is_absolute():
        path = ROOT / path
    return json.loads(path.read_text(encoding="utf-8"))


def compare(args: argparse.Namespace) -> int:
    q3 = load_report(args.q3_file or args.compare, "q3")
    q4 = load_report(args.q4_file or args.compare, "q4")
    by_q3 = {item["case_id"]: item for item in q3["cases"]}
    by_q4 = {item["case_id"]: item for item in q4["cases"]}
    rows = []
    improved = []
    regressed = []
    for case in CASES:
        left = by_q3[case["id"]]
        right = by_q4[case["id"]]
        if right["passed"] and not left["passed"]:
            improved.append(case["name"])
        if left["passed"] and not right["passed"]:
            regressed.append(case["name"])
        rows.append(
            {
                "case_id": case["id"],
                "case_name": case["name"],
                "q3": summarize_result(left),
                "q4": summarize_result(right),
                "delta_latency_ms": round(right["latency_ms"] - left["latency_ms"], 1),
            }
        )

    summary = {
        "compared_at": datetime.now(timezone.utc).isoformat(),
        "q3_capture": q3.get("captured_at"),
        "q4_capture": q4.get("captured_at"),
        "q3_model": q3.get("model_health", {}).get("model_label"),
        "q4_model": q4.get("model_health", {}).get("model_label"),
        "q3_pass_count": q3["pass_count"],
        "q4_pass_count": q4["pass_count"],
        "case_count": len(CASES),
        "q3_average_latency_ms": q3["average_latency_ms"],
        "q4_average_latency_ms": q4["average_latency_ms"],
        "improved_cases": improved,
        "regressed_cases": regressed,
        "recommendation": recommendation(q3, q4, regressed),
        "cases": rows,
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timestamp()
    json_path = REPORT_DIR / f"q3_vs_q4_{stamp}.json"
    md_path = REPORT_DIR / f"q3_vs_q4_{stamp}.md"
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    md_path.write_text(markdown_report(summary), encoding="utf-8")
    print(markdown_table(summary))
    print(f"\nSaved JSON report: {json_path}")
    print(f"Saved Markdown report: {md_path}")
    return 0


def summarize_result(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "passed": result["passed"],
        "label": result["predicted_label"],
        "score": result["score"],
        "impact": result["impact"],
        "hours": result["estimated_hours"],
        "title": result["grouped_change_title"],
        "latency_ms": result["latency_ms"],
        "notes": result["notes"],
    }


def recommendation(q3: dict[str, Any], q4: dict[str, Any], regressed: list[str]) -> str:
    if q4["pass_count"] > q3["pass_count"]:
        return "Keep Q4_K_M as the default; it passed more benchmark cases."
    if q4["pass_count"] == q3["pass_count"] and q4["average_latency_ms"] <= q3["average_latency_ms"] * 1.35 and not regressed:
        return "Keep Q4_K_M as the default; quality is at least tied and latency is acceptable."
    if regressed:
        return "Review regressions before keeping Q4_K_M as default; switch to Q3_K_M only if the regressions matter more than Q4 quality gains."
    return "Q4_K_M is slower without a pass-count gain; keep it only if manual review shows better reasoning quality."


def markdown_table(summary: dict[str, Any]) -> str:
    lines = [
        "| Case | Q3 | Q4 | Delta latency |",
        "| --- | --- | --- | ---: |",
    ]
    for row in summary["cases"]:
        q3 = row["q3"]
        q4 = row["q4"]
        lines.append(
            f"| {row['case_name']} | {status(q3)} {q3['label']} / {q3['score']} | "
            f"{status(q4)} {q4['label']} / {q4['score']} | {row['delta_latency_ms']} ms |"
        )
    return "\n".join(lines)


def markdown_report(summary: dict[str, Any]) -> str:
    improved = ", ".join(summary["improved_cases"]) or "None"
    regressed = ", ".join(summary["regressed_cases"]) or "None"
    return "\n".join(
        [
            "# Q3 vs Q4 Model Comparison",
            "",
            f"- Q3 pass count: {summary['q3_pass_count']}/{summary['case_count']}",
            f"- Q4 pass count: {summary['q4_pass_count']}/{summary['case_count']}",
            f"- Q3 average latency: {summary['q3_average_latency_ms']} ms",
            f"- Q4 average latency: {summary['q4_average_latency_ms']} ms",
            f"- Q4 improved: {improved}",
            f"- Q4 regressed: {regressed}",
            f"- Recommendation: {summary['recommendation']}",
            "",
            markdown_table(summary),
            "",
        ]
    )


def status(result: dict[str, Any]) -> str:
    return "PASS" if result["passed"] else "FAIL"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--capture", choices=["q3", "q4"], help="Capture results from the currently running configured model.")
    action.add_argument("--compare", default=None, help="Compare capture files. Use `latest` for latest q3/q4 captures.")
    parser.add_argument("--q3-file", help="Specific Q3 capture JSON for --compare.")
    parser.add_argument("--q4-file", help="Specific Q4 capture JSON for --compare.")
    parser.add_argument("--backend-url", default="http://localhost:5000")
    parser.add_argument("--inference-url", default="http://localhost:8000")
    parser.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()
    try:
        if args.capture:
            return capture(args)
        return compare(args)
    except Exception as exc:
        print(f"FAIL model comparison: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
