#!/usr/bin/env python3
"""Aggregate exact-pair screen against closed historical finals; emit no cases."""

import json
from pathlib import Path

from phase3i_audit_archive import norm

ROOT = Path(__file__).resolve().parents[2]
DECISION = ROOT / "evaluation/phase_iii_i/decision_reviewed_v1.json"
FINAL_RAW = ROOT / "evaluation/heldout/drift_raw_final_v1.json"
FINAL_RETRIEVAL = (
    ROOT / "evaluation/phase_iii_d/retrieval_independent_v1.json",
    ROOT / "evaluation/phase_iii_e/retrieval_independent_v1.json",
)


def key(baseline, message):
    return norm(baseline), norm(message)


def evaluate():
    cases = json.loads(DECISION.read_text())["cases"]
    decision_pairs = {key(case["baseline_requirement"], case["message"]) for case in cases}
    raw = json.loads(FINAL_RAW.read_text())
    raw_pairs = {key(case["baseline_requirement"], case["client_message"]) for case in raw["cases"]}
    sources = {
        "phase_iii_b_raw_final": {
            "historical_pairs": len(raw_pairs),
            "exact_normalized_pair_overlap": len(decision_pairs & raw_pairs),
        }
    }
    for path in FINAL_RETRIEVAL:
        corpus = json.loads(path.read_text())
        pairs = {
            key(requirement["description"], query["message"])
            for project in corpus["projects"]
            for requirement in project["requirements"]
            for query in project["queries"]
        }
        sources[path.parent.name] = {
            "historical_possible_pairs": len(pairs),
            "exact_normalized_description_message_pair_overlap": len(decision_pairs & pairs),
        }
    p1 = json.loads((ROOT / "evaluation/prompts/P1.json").read_text())
    return {
        "role": "PHASE_III_I_AGGREGATE_HISTORICAL_FINAL_OVERLAP_SCREEN",
        "timing": "Post-prediction aggregate audit; no case-level historical content emitted or used to change labels/prompt.",
        "decision_pairs": len(decision_pairs),
        "sources": sources,
        "p1_prompt_contains_few_shot_examples": any(
            key in p1 for key in ("examples", "few_shot_examples", "demonstrations")
        ),
        "limitation": "Exact normalized pair matching does not exclude paraphrase, template, or inaccessible historical-source overlap.",
    }


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2, sort_keys=True))
