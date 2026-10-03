"""Audit proposed Phase III-D retrieval cases before any R0/R5 prediction.

This tool intentionally emits IDs and similarity scores, never protected case text.
It does not claim independence from the missing original LoRA training corpus.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCES = (
    ("retrieval_dev_v1", "evaluation/datasets/retrieval_dev_v1.json"),
    ("retrieval_dev_v2", "evaluation/datasets/retrieval_dev_v2.json"),
    ("retrieval_final_closed", "evaluation/heldout/retrieval_final_v1.json"),
    ("raw_dev", "evaluation/datasets/drift_raw_dev_v1.json"),
    ("raw_final_closed", "evaluation/heldout/drift_raw_final_v1.json"),
    ("retrieval_oracle_dev", "evaluation/datasets/retrieval_oracle_dev_v1.json"),
)


def normalize(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.lower()))


def token_jaccard(left: str, right: str) -> float:
    a, b = set(left.split()), set(right.split())
    return len(a & b) / len(a | b) if a or b else 1.0


def source_texts(data: dict) -> list[str]:
    if "projects" in data:
        return [query["message"] for project in data["projects"] for query in project["queries"]]
    return [case["client_message"] for case in data.get("cases", [])]


def source_requirements(data: dict) -> list[str]:
    if "projects" in data:
        return [
            requirement.get("title", "") + " " + requirement.get("description", "")
            for project in data["projects"]
            for requirement in project["requirements"]
        ]
    return [case["baseline_requirement"] for case in data.get("cases", [])]


def similarity_rows(items: list[tuple[str, str]], known: list[tuple[str, str]]) -> list[dict]:
    rows = []
    for case_id, text in items:
        nearest_source, nearest_sequence, nearest_jaccard = "", 0.0, 0.0
        exact_sources: list[str] = []
        for source, comparison in known:
            if text == comparison:
                exact_sources.append(source)
            sequence = SequenceMatcher(None, text, comparison).ratio()
            jaccard = token_jaccard(text, comparison)
            if max(sequence, jaccard) > max(nearest_sequence, nearest_jaccard):
                nearest_source, nearest_sequence, nearest_jaccard = source, sequence, jaccard
        if exact_sources:
            status = "CONTAMINATED"
        elif nearest_sequence >= 0.82 or nearest_jaccard >= 0.80:
            status = "POSSIBLE_OVERLAP"
        else:
            status = "CLEAN_EXACT_AND_NEAR_HEURISTIC"
        rows.append({
            "case_id": case_id,
            "status": status,
            "exact_sources": sorted(set(exact_sources)),
            "nearest_source": nearest_source,
            "nearest_sequence_similarity": round(nearest_sequence, 4),
            "nearest_token_jaccard": round(nearest_jaccard, 4),
        })
    return rows


def audit(draft: dict) -> dict:
    known: list[tuple[str, str]] = []
    known_requirements: list[tuple[str, str]] = []
    source_hashes: dict[str, str] = {}
    for name, relative in SOURCES:
        raw = (ROOT / relative).read_bytes()
        source_hashes[name] = hashlib.sha256(raw).hexdigest()
        data = json.loads(raw)
        known.extend((name, normalize(text)) for text in source_texts(data))
        known_requirements.extend((name, normalize(text)) for text in source_requirements(data))

    historical_paths = (
        ROOT / "server-go/internal/modules/evaluation/evaluation_benchmark.go",
        ROOT / "tools/verification/evaluate_q4_quality.py",
    )
    historical_exact_count = 0
    historical_normalized = [normalize(path.read_text()) for path in historical_paths]

    queries = [(query["id"], query) for project in draft["projects"] for query in project["queries"]]
    requirement_ids = {
        project["id"]: {requirement["id"] for requirement in project["requirements"]}
        for project in draft["projects"]
    }
    invalid_targets = [
        query["id"]
        for project in draft["projects"]
        for query in project["queries"]
        if not set(query["expected_requirement_ids"]) <= requirement_ids[project["id"]]
    ]
    normalized = [(case_id, normalize(query["message"])) for case_id, query in queries]
    repeated = sorted(item for item, count in Counter(text for _, text in normalized).items() if count > 1)
    rows = similarity_rows(normalized, known)
    for row, (_, text) in zip(rows, normalized):
        if any(text in source for source in historical_normalized):
            row["status"] = "CONTAMINATED"
            row["exact_sources"].append("historical_source")
            historical_exact_count += 1
    draft_requirements = [
        (requirement["id"], normalize(requirement.get("title", "") + " " + requirement.get("description", "")))
        for project in draft["projects"]
        for requirement in project["requirements"]
    ]
    requirement_rows = similarity_rows(draft_requirements, known_requirements)
    counts = Counter(row["status"] for row in rows)
    requirement_counts = Counter(row["status"] for row in requirement_rows)
    return {
        "schema_version": 1,
        "method": "normalized exact message match; SequenceMatcher >=0.82; token Jaccard >=0.80",
        "source_hashes": source_hashes,
        "case_count": len(rows),
        "counts": dict(sorted(counts.items())),
        "requirement_counts": dict(sorted(requirement_counts.items())),
        "historical_source_exact_message_count": historical_exact_count,
        "invalid_target_case_ids": invalid_targets,
        "within_draft_duplicate_message_count": len(repeated),
        "cases": rows,
        "requirements": requirement_rows,
        "limitations": [
            "Original LoRA training data is missing; training overlap is unknown.",
            "Similarity heuristics cannot establish semantic independence or detect every template reuse.",
            "Historical Go and full-system source files were checked for normalized exact message substrings; near semantic overlap still needs human review.",
            "A human reviewer must decide questionable target labels without seeing retrieval predictions.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    result = audit(json.loads(raw))
    result["draft_sha256"] = hashlib.sha256(raw).hexdigest()
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps({key: result[key] for key in ("case_count", "counts", "invalid_target_case_ids", "within_draft_duplicate_message_count")}))


if __name__ == "__main__":
    main()
