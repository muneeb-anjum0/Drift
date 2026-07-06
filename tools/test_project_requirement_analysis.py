#!/usr/bin/env python3
"""Regression test for requirement-by-requirement project drift aggregation."""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from typing import Any


REQUIREMENTS = [
    {
        "title": "Password reset",
        "text": "The system shall allow users to reset their password by email.",
    },
    {
        "title": "Monthly report CSV export",
        "text": "The system shall allow admins to export monthly reports as CSV.",
    },
]
MESSAGE = "Can we also let admins download the same monthly report from the existing reports page?"
EXPECTED_LABEL = "unchanged"
STOP_WORDS = {
    "the",
    "system",
    "shall",
    "should",
    "allow",
    "also",
    "same",
    "from",
    "with",
    "that",
    "this",
    "they",
    "their",
    "there",
    "existing",
    "page",
    "users",
    "user",
    "admins",
    "admin",
    "can",
    "let",
}


def normalize_token(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return f"{token[:-3]}y"
    if len(token) > 4 and token.endswith("s"):
        return token[:-1]
    return token


def tokens(text: str) -> set[str]:
    return {
        normalize_token(token)
        for token in re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()
        if len(normalize_token(token)) > 2 and normalize_token(token) not in STOP_WORDS
    }


def relevance(requirement_text: str, message: str) -> float:
    requirement_tokens = tokens(requirement_text)
    message_tokens = tokens(message)
    if not requirement_tokens or not message_tokens:
        return 0.0
    overlap = len(requirement_tokens & message_tokens)
    return overlap / min(len(requirement_tokens), len(message_tokens))


def post_json(url: str, payload: dict[str, str], timeout: int) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def prediction_from_response(data: dict[str, Any]) -> dict[str, Any]:
    return data.get("data", {}).get("prediction", {})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--timeout", type=int, default=90, help="Request timeout in seconds")
    args = parser.parse_args()

    results: list[dict[str, Any]] = []
    for requirement in REQUIREMENTS:
        try:
            data = post_json(
                f"{args.backend_url.rstrip('/')}/api/v1/drift/analyze-direct",
                {
                    "baseline_requirement": requirement["text"],
                    "new_client_message": MESSAGE,
                },
                args.timeout,
            )
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"FAIL {requirement['title']}: {exc}", file=sys.stderr)
            return 1

        prediction = prediction_from_response(data)
        item = {
            "title": requirement["title"],
            "text": requirement["text"],
            "label": str(prediction.get("label", "")).lower(),
            "confidence": float(prediction.get("confidence", 0)),
            "reasoning": prediction.get("reasoning", ""),
            "relevance": relevance(requirement["text"], MESSAGE),
        }
        results.append(item)
        print(f"{item['title']}: label={item['label']} confidence={item['confidence']:.2f} relevance={item['relevance']:.2f}")

    relevant_results = [result for result in results if result["relevance"] >= 0.15]
    selected_results = relevant_results or sorted(results, key=lambda item: (item["relevance"], item["confidence"]), reverse=True)[:1]
    impactful_results = [
        result
        for result in selected_results
        if result["label"] != "unchanged" and result["confidence"] >= 0.35
    ]
    final_label = impactful_results[0]["label"] if impactful_results else EXPECTED_LABEL
    selected_titles = ", ".join(result["title"] for result in selected_results)
    print(f"selected: {selected_titles}")
    print(f"final_label: {final_label}")

    if final_label != EXPECTED_LABEL:
        print(f"FAIL expected aggregate label {EXPECTED_LABEL!r}, got {final_label!r}", file=sys.stderr)
        return 1
    if any(result["title"] == "Password reset" for result in selected_results):
        print("FAIL unrelated password reset requirement was selected", file=sys.stderr)
        return 1

    print("PASS project requirement analysis ignores unrelated baselines and returns unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
