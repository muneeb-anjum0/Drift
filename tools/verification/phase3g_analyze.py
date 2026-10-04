#!/usr/bin/env python3
"""Summarize frozen development pipeline evidence without treating it as final."""

import argparse
import hashlib
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "evaluation/phase_iii_g"


def read(name):
    return json.loads((DIR / name).read_bytes())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    raw = (DIR / "batch_dev_v1.json").read_bytes()
    frozen = read("batch_dev_freeze_v1.json")
    sha = hashlib.sha256(raw).hexdigest()
    if sha != frozen["dataset_sha256"]:
        raise SystemExit("Frozen panel mismatch")
    panel = json.loads(raw)
    cases = {case["id"]: case for case in panel["cases"]}
    retrieval = read("retrieval_r5_dev_v1.json")
    singleton = read("singleton_r5_p1_dev_v1.json")
    pilots = [read("pilot_probe_v1.json"), read("pilot_position_v1.json")]
    if singleton["dataset_sha256"] != sha or any(item["dataset_sha256"] != sha for item in pilots):
        raise SystemExit("Inference evidence dataset mismatch")
    selected = {row["query_id"]: row for row in retrieval["results"]}
    prediction = {(row["case_id"], row["requirement_id"]): row for row in singleton["results"]}
    if any(set(selected[case_id]["selected_requirement_ids"]) !=
           {rid for cid, rid in prediction if cid == case_id} for case_id in cases):
        raise SystemExit("P1 comparison does not match unchanged R5 selection")
    by_class = defaultdict(lambda: {"reached": 0, "correct": 0})
    query_rows = []
    for case_id, case in cases.items():
        expected = set(case["expected_affected_ids"])
        got = set(selected[case_id]["selected_requirement_ids"])
        correct_ids = {rid for rid in got & expected
                       if prediction[(case_id, rid)]["valid_contract"]
                       and prediction[(case_id, rid)]["parsed"]["label"] == case["expected_labels"][rid]}
        false_drift = [rid for rid in got - expected
                       if prediction[(case_id, rid)]["valid_contract"]
                       and prediction[(case_id, rid)]["parsed"]["label"] != "unchanged"
                       and prediction[(case_id, rid)]["parsed"]["confidence"] >= 0.35]
        for rid in got & expected:
            label = case["expected_labels"][rid]
            by_class[label]["reached"] += 1
            by_class[label]["correct"] += rid in correct_ids
        times = [prediction[(case_id, rid)]["elapsed_seconds"] for rid in got]
        query_rows.append({"case_id": case_id, "expected_targets": len(expected),
                           "selected_candidates": len(got), "retrieval_hits": len(got & expected),
                           "correct_selected_labels": len(correct_ids),
                           "false_candidate_drift_at_p1_stage": len(false_drift),
                           "p1_component_complete_positive": bool(expected) and expected == correct_ids
                           and not false_drift,
                           "p1_calls": len(got), "p1_sequential_seconds": round(sum(times), 3),
                           "p1_prompt_tokens": sum(prediction[(case_id, rid)]["prompt_tokens"] for rid in got),
                           "p1_generated_tokens": sum(prediction[(case_id, rid)]["generated_tokens"] for rid in got)})
    pilot_rows = [row for item in pilots for row in item["results"]]
    valid = [row for row in pilot_rows if row["valid_contract"]]
    qualified = []
    for row in valid:
        case = cases[row["case_id"]]
        expected = set(case["expected_affected_ids"]) & set(row["ids"])
        actual = {result["id"] for result in row["parsed"] if result["affected"]}
        correct = all(result["label"] == case["expected_labels"][result["id"]]
                      for result in row["parsed"] if result["id"] in expected and result["affected"])
        qualified.append(actual == expected and correct)
    output = {
        "role": "DEVELOPMENT_NOT_INDEPENDENT_NOT_FULL_PRODUCT",
        "dataset_sha256": sha,
        "retrieval": {"query_count": len(query_rows), "positive_queries": sum(row["expected_targets"] > 0 for row in query_rows),
                      "expected_links": sum(row["expected_targets"] for row in query_rows),
                      "selected_hits": sum(row["retrieval_hits"] for row in query_rows),
                      "false_exposures": retrieval["metrics"]["false_exposure_count"],
                      "complete_positive_queries": retrieval["metrics"]["all_expected_reached_count"],
                      "selected_calls": sum(row["p1_calls"] for row in query_rows)},
        "singleton_p1": {"calls": len(singleton["results"]),
                         "valid_contract_calls": sum(row["valid_contract"] for row in singleton["results"]),
                         "correct_selected_target_labels": sum(row["correct_selected_labels"] for row in query_rows),
                         "false_candidate_drift_at_p1_stage": sum(row["false_candidate_drift_at_p1_stage"]
                                                                    for row in query_rows),
                         "p1_component_complete_positive_queries": sum(row["p1_component_complete_positive"]
                                                                        for row in query_rows),
                         "by_expected_class": dict(by_class),
                         "total_sequential_seconds": round(sum(row["p1_sequential_seconds"] for row in query_rows), 3),
                         "positive_message_median_seconds": statistics.median(
                             row["p1_sequential_seconds"] for row in query_rows if row["expected_targets"]),
                         "prompt_tokens": sum(row["p1_prompt_tokens"] for row in query_rows),
                         "generated_tokens": sum(row["p1_generated_tokens"] for row in query_rows)},
        "batch_pilot": {"calls": len(pilot_rows), "valid_contract_calls": len(valid),
                        "valid_and_correct_affectedness_and_label": sum(qualified),
                        "by_batch_size": {str(size): {"calls": len(rows),
                                                       "valid_contract_calls": sum(row["valid_contract"] for row in rows),
                                                       "elapsed_seconds": [row["elapsed_seconds"] for row in rows],
                                                       "prompt_tokens": [row["prompt_tokens"] for row in rows],
                                                       "generated_tokens": [row["generated_tokens"] for row in rows]}
                                          for size in (1, 2, 3, 5)
                                          if (rows := [row for row in pilot_rows if row["size"] == size])},
                        "failure_types": dict(Counter(row.get("error", "valid") for row in pilot_rows))},
        "query_results": query_rows,
        "limitations": ["Author-labeled small development panel, not independent generalisation evidence",
                        "P1 comparison calls the model/parser directly, not authenticated Go Analyze or PP1",
                        "Zero-target retrieval query would trigger production new-requirement fallback; it is not a no-drift product label",
                        "Batch probe is eight deliberately diagnostic calls, not a statistical accuracy estimate",
                        "Pilot latency is warm sequential CPU, no representative p95 or cold-start measurement"],
    }
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({key: output[key] for key in ("retrieval", "singleton_p1", "batch_pilot")}, indent=2))


if __name__ == "__main__":
    main()
