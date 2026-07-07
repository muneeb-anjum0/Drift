#!/usr/bin/env python3
"""Smoke test the change request approval lifecycle through the backend API."""

from __future__ import annotations

import argparse
import sys
from typing import Any

from test_change_request_generation import analyze_save_generate, data_at, request_json, setup_project


APPROVAL_MESSAGE = "Also allow patients to reset their password through SMS OTP."


def save_change_request(base_url: str, token: str, draft: dict[str, Any], title_suffix: str, timeout: int) -> dict[str, Any]:
    payload = dict(draft)
    payload["title"] = f"{payload.get('title', 'Change request')} {title_suffix}".strip()
    return data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/change-requests",
            payload,
            token=token,
            timeout=timeout,
        ),
        "changeRequest",
    )


def decide(base_url: str, token: str, change_request_id: str, action: str, note: str, timeout: int) -> dict[str, Any]:
    return data_at(
        request_json(
            "POST",
            f"{base_url}/api/v1/change-requests/{change_request_id}/{action}",
            {"note": note},
            token=token,
            timeout=timeout,
        ),
        "changeRequest",
    )


def assert_status(change_request: dict[str, Any], expected: str) -> None:
    actual = change_request.get("approvalStatus")
    if actual != expected:
        raise AssertionError(f"expected approvalStatus={expected}, got {actual}: {change_request}")
    history = change_request.get("approvalHistory") or []
    if not history:
        raise AssertionError(f"expected approval history for {change_request.get('_id')}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--timeout", type=int, default=180, help="Request timeout in seconds")
    args = parser.parse_args()
    base_url = args.backend_url.rstrip("/")

    try:
        request_json("GET", f"{base_url}/health", timeout=args.timeout)
        token, project_id, version_id = setup_project(base_url, args.timeout, email_prefix="approval-workflow")
        _analysis, draft = analyze_save_generate(base_url, token, project_id, version_id, APPROVAL_MESSAGE, args.timeout)
        if not draft:
            raise AssertionError("expected approval test to generate a change request draft")

        approval_request = save_change_request(base_url, token, draft, "approval path", args.timeout)
        rejection_request = save_change_request(base_url, token, draft, "rejection path", args.timeout)

        submitted = decide(base_url, token, approval_request["_id"], "submit", "Ready for client approval.", args.timeout)
        assert_status(submitted, "pending_approval")
        approved = decide(base_url, token, approval_request["_id"], "approve", "Approved by project owner.", args.timeout)
        assert_status(approved, "approved")

        submitted_for_rejection = decide(base_url, token, rejection_request["_id"], "submit", "Needs owner decision.", args.timeout)
        assert_status(submitted_for_rejection, "pending_approval")
        rejected = decide(base_url, token, rejection_request["_id"], "reject", "Client rejected this scope change.", args.timeout)
        assert_status(rejected, "rejected")

        approvals = data_at(
            request_json("GET", f"{base_url}/api/v1/change-requests/approvals", token=token, timeout=args.timeout),
            "changeRequests",
        )
        statuses = {item["_id"]: item.get("approvalStatus") for item in approvals}
        if statuses.get(approval_request["_id"]) != "approved" or statuses.get(rejection_request["_id"]) != "rejected":
            raise AssertionError(f"approval list did not include both decided requests: {statuses}")
    except Exception as exc:
        print(f"FAIL approval workflow: {exc}", file=sys.stderr)
        return 1

    print("PASS approval workflow submit/approve/reject/list")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
