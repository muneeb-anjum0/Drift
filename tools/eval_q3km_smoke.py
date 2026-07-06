#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request


EXAMPLES = [
    ("The system shall allow admins to export monthly reports as CSV.", "Can admins download the same monthly report from the reports page?", "unchanged"),
    ("The app shall allow users to reset passwords by email.", "Add SMS password reset too.", "added"),
    ("Reports shall export as CSV.", "Can reports export as PDF instead?", "modified"),
    ("Users shall be able to delete archived projects.", "Actually, users should not be able to delete archived projects.", "contradiction"),
    ("The dashboard shall show revenue by month.", "Remove the revenue chart from the dashboard.", "removed"),
    ("The app shall support two-factor authentication.", "Maybe make security more modern and easier somehow.", "ambiguous"),
    ("Admins shall invite team members by email.", "Let admins invite team members using email invites.", "unchanged"),
    ("Invoices shall be payable by credit card.", "Also support bank transfer payments.", "added"),
    ("The system shall store audit logs for 90 days.", "Keep audit logs for one year.", "modified"),
    ("Users shall upload profile pictures.", "No longer allow profile picture uploads.", "removed"),
]


def predict(base_url: str, baseline: str, message: str) -> tuple[int, str]:
    payload = json.dumps({"baseline_requirement": baseline, "new_client_message": message}).encode("utf-8")
    request = urllib.request.Request(
        base_url.rstrip("/") + "/predict-drift",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test DriftLedger Q3_K_M GGUF inference.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    correct = 0
    for index, (baseline, message, expected) in enumerate(EXAMPLES, 1):
        status, body = predict(args.base_url, baseline, message)
        parsed = False
        label = "<error>"
        try:
            payload = json.loads(body)
            label = str(payload.get("label", "")).lower()
            parsed = status == 200 and bool(label)
        except json.JSONDecodeError:
            pass
        is_correct = parsed and label == expected
        correct += int(is_correct)
        print(f"{index:02d}. expected={expected} predicted={label} parsed={parsed} correct={is_correct}")
        if not parsed:
            print(body)
    print(f"\nAccuracy: {correct}/{len(EXAMPLES)}")


if __name__ == "__main__":
    main()
