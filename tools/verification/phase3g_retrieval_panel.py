#!/usr/bin/env python3
"""Adapt frozen Phase III-G development cases for unchanged Go retrieval evaluator."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    raw = (ROOT / "evaluation/phase_iii_g/batch_dev_v1.json").read_bytes()
    frozen = json.loads((ROOT / "evaluation/phase_iii_g/batch_dev_freeze_v1.json").read_bytes())
    if hashlib.sha256(raw).hexdigest() != frozen["dataset_sha256"]:
        raise SystemExit("Frozen development panel mismatch")
    panel = json.loads(raw)
    projects = []
    for case in panel["cases"]:
        projects.append({
            "id": case["id"], "size": "small",
            "requirements": [{"id": item["id"], "title": "", "description": item["text"]}
                             for item in case["requirements"]],
            "queries": [{"id": case["id"], "message": case["message"],
                         "expected_requirement_ids": case["expected_affected_ids"]}],
        })
    adapted = {"name": "phase-iii-g-frozen-development-adapter", "version": "1.0.0",
               "threshold": 0.25, "max_selected": 3, "projects": projects}
    args.output.write_text(json.dumps(adapted, indent=2) + "\n")


if __name__ == "__main__":
    main()
