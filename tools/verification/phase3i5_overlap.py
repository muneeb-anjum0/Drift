#!/usr/bin/env python3
"""Pre-inference overlap screen; never emit closed historical case content."""

import argparse
import hashlib
import json
import os
import re
from collections import defaultdict
from pathlib import Path

from phase3i_audit_archive import norm, tokens
from phase3i_decision_overlap import audit as archive_audit


ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "archive/drift-dataset-kaggle-v5-cumulative"
HISTORICAL_RAW = ROOT / "evaluation/heldout/drift_raw_final_v1.json"
HISTORICAL_RETRIEVAL = (
    ROOT / "evaluation/phase_iii_d/retrieval_independent_v1.json",
    ROOT / "evaluation/phase_iii_e/retrieval_independent_v1.json",
)
HISTORICAL_DECISION = ROOT / "evaluation/phase_iii_i/decision_reviewed_v1.json"


def key(baseline, message):
    return norm(baseline), norm(message)


def template(value):
    return re.sub(r"\b\d+(?:\.\d+)?\b", "#", norm(value))


def closed_pairs():
    raw = json.loads(HISTORICAL_RAW.read_text())
    yield "phase_iii_b_raw_final", {
        key(case["baseline_requirement"], case["client_message"]) for case in raw["cases"]
    }
    for path in HISTORICAL_RETRIEVAL:
        corpus = json.loads(path.read_text())
        yield path.parent.name, {
            key(requirement["description"], query["message"])
            for project in corpus["projects"]
            for requirement in project["requirements"]
            for query in project["queries"]
        }
    decision = json.loads(HISTORICAL_DECISION.read_text())
    yield "phase_iii_i", {
        key(case["baseline_requirement"], case["message"]) for case in decision["cases"]
    }


def audit(draft_path):
    cases = json.loads(draft_path.read_text(encoding="utf-8"))["cases"]
    by_pair = defaultdict(list)
    by_template = defaultdict(list)
    by_baseline = defaultdict(list)
    for case in cases:
        baseline, message = key(case["baseline_requirement"], case["message"])
        by_pair[(baseline, message)].append(case["id"])
        by_template[(template(baseline), template(message))].append(case["id"])
        by_baseline[baseline].append((case["id"], tokens(message), case["semantic_family"]))
    internal_near = []
    for entries in by_baseline.values():
        for index, (first_id, first_tokens, first_family) in enumerate(entries):
            for second_id, second_tokens, second_family in entries[index + 1:]:
                if first_family == second_family:
                    continue  # controlled transformations are grouped, not contamination
                union = len(first_tokens | second_tokens)
                if union and len(first_tokens & second_tokens) / union >= 0.85:
                    internal_near.append([first_id, second_id])
    proposed = {case["id"]: key(case["baseline_requirement"], case["message"]) for case in cases}
    closed = {}
    for name, pairs in closed_pairs():
        exact = [case_id for case_id, item in proposed.items() if item in pairs]
        historical_baselines = defaultdict(list)
        for baseline, message in pairs:
            historical_baselines[baseline].append(tokens(message))
        near = []
        for case_id, (baseline, message) in proposed.items():
            words = tokens(message)
            if any((len(words | other) and len(words & other) / len(words | other) >= 0.85)
                   for other in historical_baselines.get(baseline, [])):
                near.append(case_id)
        closed[name] = {"historical_pairs": len(pairs), "exact_normalized_pair_candidate_ids": exact,
                        "same_baseline_message_jaccard_ge_0_85_candidate_ids": near}
    return {
        "role": "PHASE_III_I_5_PRE_INFERENCE_CONTAMINATION_SCREEN",
        "draft_path": str(draft_path.relative_to(ROOT)),
        "draft_sha256": hashlib.sha256(draft_path.read_bytes()).hexdigest(),
        "candidate_cases": len(cases),
        "internal_exact_duplicate_pairs": [ids for ids in by_pair.values() if len(ids) > 1],
        "internal_numeric_mask_pair_templates": [ids for ids in by_template.values() if len(ids) > 1],
        "cross_family_same_baseline_near_pairs": internal_near,
        "closed_final_aggregate_only": closed,
        "archive": archive_audit(draft_path, ARCHIVE),
        "limitations": ["No historical case content emitted", "Exact/lexical overlap cannot exclude paraphrase contamination",
                        "Archive-to-adapter byte identity unproven", "Within-family similarity is intentional and grouped"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.draft.resolve())
    body = (json.dumps(result, indent=2, sort_keys=True) + "\n").encode()
    fd = os.open(args.out, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(body)
    print(json.dumps({
        "candidate_cases": result["candidate_cases"],
        "internal_exact_duplicate_groups": len(result["internal_exact_duplicate_pairs"]),
        "internal_numeric_mask_template_groups": len(result["internal_numeric_mask_pair_templates"]),
        "cross_family_near_pairs": len(result["cross_family_same_baseline_near_pairs"]),
        "closed_exact_overlap": {name: len(item["exact_normalized_pair_candidate_ids"])
                                 for name, item in result["closed_final_aggregate_only"].items()},
    }, indent=2))


if __name__ == "__main__":
    main()
