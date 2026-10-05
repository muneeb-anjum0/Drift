#!/usr/bin/env python3
"""Score frozen Phase III-I.5 raw P1 calls; never alter reviewed truth."""

import argparse
import hashlib
import json
import math
import os
import statistics
from collections import Counter, defaultdict
from pathlib import Path

from phase3h_contracts import LABELS, validate_raw
from phase3i_score_raw import metrics as core_metrics
from phase3i_run_oracle import case_path
from phase3i5_run_oracle import CORPUS, FREEZE_MANIFEST


ROOT = CORPUS.parents[2]
BASE = CORPUS.parent


def ratio(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def nearest_rank(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * fraction) - 1)]


def load_rows(result_dir):
    corpus_bytes = CORPUS.read_bytes()
    corpus_sha = hashlib.sha256(corpus_bytes).hexdigest()
    corpus = json.loads(corpus_bytes)
    freeze = json.loads(FREEZE_MANIFEST.read_text())
    if freeze["files"]["frozen_corpus"]["sha256"] != corpus_sha:
        raise ValueError("frozen corpus hash differs from pre-inference manifest")
    cases = corpus["cases"]
    expected_ids = {case["id"] for case in cases}
    files = {path.stem for path in result_dir.glob("*.json") if path.name != "manifest.json"}
    if files != expected_ids:
        raise ValueError(f"result files incomplete/unexpected: missing={sorted(expected_ids-files)}, "
                         f"extra={sorted(files-expected_ids)}")
    result_manifest = json.loads((result_dir / "manifest.json").read_text())
    if result_manifest.get("corpus_sha256") != corpus_sha:
        raise ValueError("raw result manifest corpus mismatch")
    rows = []
    for case in cases:
        item = json.loads(case_path(result_dir, case["id"]).read_text())
        if (item.get("case_id") != case["id"] or item.get("dataset_sha256") != corpus_sha
                or item.get("baseline_requirement") != case["baseline_requirement"]
                or item.get("message") != case["message"]
                or item.get("reviewed_ground_truth") != case["review"]["reviewed_label"]
                or item.get("primary_scored") != case["primary_scored"]
                or item.get("runtime_error")):
            raise ValueError(f"result provenance differs: {case['id']}")
        response = item.get("raw_response", {})
        validation = validate_raw(
            item["raw_text"], "p1_single_v1",
            stopped_limit=response.get("stop_type") == "limit" or response.get("stopped_limit", False),
            generated_tokens=response.get("tokens_predicted"), output_budget=120,
        )
        if validation != item["validation"]:
            raise ValueError(f"structural validation differs on replay: {case['id']}")
        predicted = validation["parsed"]["label"] if validation["valid"] else None
        if item["raw_predicted_class"] != predicted:
            raise ValueError(f"raw prediction differs from parsed output: {case['id']}")
        rows.append({
            "case_id": case["id"], "truth": case["review"]["reviewed_label"],
            "predicted": predicted, "primary_scored": case["primary_scored"],
            "domain": case["domain"], "difficulty_tier": case["difficulty_tier"],
            "length_bucket": case["length_bucket"], "requirement_structure": case["requirement_structure"],
            "phenomenon_tags": case["phenomenon_tags"], "semantic_family": case["semantic_family"],
            "structural_category": validation["primary"],
            "confidence": validation["parsed"]["confidence"] if validation["valid"] else None,
            "latency_seconds": item["latency_seconds"], "prompt_tokens": item["prompt_tokens"],
            "generated_tokens": response.get("tokens_predicted"),
            "baseline_requirement": case["baseline_requirement"], "message": case["message"],
            "model_reasoning": validation["parsed"]["reasoning"] if validation["valid"] else None,
        })
    return corpus, rows


def primary_metrics(rows, corpus_sha):
    scored = [row for row in rows if row["primary_scored"]]
    report = core_metrics(scored)
    report["role"] = "PHASE_III_I_5_RAW_ORACLE_SCORE"
    report["dataset_sha256"] = corpus_sha
    report["all_recorded_cases"] = len(rows)
    report["unscored_ontology_gap_cases"] = len(rows) - len(scored)
    report["all_recorded_structural_valid"] = sum(row["predicted"] in LABELS for row in rows)
    report["all_recorded_structural_invalid"] = len(rows) - report["all_recorded_structural_valid"]
    report["all_recorded_invalid_categories"] = dict(sorted(Counter(
        row["structural_category"] for row in rows if row["predicted"] is None).items()))
    return report


def slice_metrics(rows, corpus_sha):
    scored = [row for row in rows if row["primary_scored"]]
    dimensions = defaultdict(lambda: defaultdict(list))
    for row in scored:
        for field in ("truth", "difficulty_tier", "domain", "length_bucket", "requirement_structure"):
            dimensions[field][row[field]].append(row)
        for tag in set(row["phenomenon_tags"]):
            dimensions["phenomenon_tag"][tag].append(row)
    report = {}
    for dimension, values in sorted(dimensions.items()):
        report[dimension] = {}
        for value, members in sorted(values.items()):
            correct = sum(row["predicted"] == row["truth"] for row in members)
            report[dimension][value] = {"support": len(members), "correct": correct,
                                        "accuracy": ratio(correct, len(members)),
                                        "error_case_ids": [row["case_id"] for row in members
                                                           if row["predicted"] != row["truth"]]}
    return {"role": "PHASE_III_I_5_RAW_SLICE_METRICS", "dataset_sha256": corpus_sha,
            "slices": report, "small_slice_warning": "All slices are diagnostic, not prevalence estimates."}


def robustness(corpus, rows, corpus_sha):
    by_id = {row["case_id"]: row for row in rows}
    relation_rows = []
    totals = defaultdict(Counter)
    for relation in corpus["relations"]:
        members = [by_id[case_id] for case_id in relation["case_ids"]]
        kind = relation["type"]
        if not relation["primary_eligible"]:
            relation_rows.append({"id": relation["id"], "type": kind, "eligible": False,
                                  "reason": relation["eligibility_reason"],
                                  "case_ids": relation["case_ids"]})
            totals[kind]["ineligible"] += 1
            continue
        correct = [item["predicted"] == item["truth"] for item in members]
        predicted = [item["predicted"] for item in members]
        if kind == "minimal_pair_contrast":
            outcome = ("both_correct" if all(correct) else "first_only_correct" if correct[0]
                       else "second_only_correct" if correct[1] else "both_incorrect")
            consistent = all(correct)
        else:
            outcome = "all_correct" if all(correct) else "not_all_correct"
            consistent = len(set(predicted)) == 1
            flips = sum(value != predicted[0] for value in predicted[1:])
            totals[kind]["prediction_flips_relative_to_first"] += flips
            totals[kind]["prediction_flip_opportunities"] += len(predicted) - 1
        totals[kind]["eligible"] += 1
        totals[kind][outcome] += 1
        totals[kind]["consistent" if consistent else "violated"] += 1
        relation_rows.append({"id": relation["id"], "type": kind, "eligible": True,
                              "case_ids": relation["case_ids"], "expected": [item["truth"] for item in members],
                              "predicted": predicted, "correct": correct, "outcome": outcome,
                              "metamorphic_consistent": consistent})
    summary = {}
    for kind, counts in sorted(totals.items()):
        eligible = counts["eligible"]
        summary[kind] = {**dict(counts), "eligible": eligible, "ineligible": counts["ineligible"],
                         "consistent": counts["consistent"], "violated": counts["violated"],
                         "consistency_rate": ratio(counts["consistent"], eligible),
                         "violation_rate": ratio(counts["violated"], eligible),
                         "prediction_flip_rate_relative_to_first": ratio(
                             counts["prediction_flips_relative_to_first"],
                             counts["prediction_flip_opportunities"])
                         if kind != "minimal_pair_contrast" else None}
    total_eligible = sum(item["eligible"] for item in summary.values())
    total_consistent = sum(item["consistent"] for item in summary.values())
    return {"role": "PHASE_III_I_5_RAW_ROBUSTNESS", "dataset_sha256": corpus_sha,
            "summary": summary, "metamorphic_consistent": total_consistent,
            "metamorphic_eligible": total_eligible,
            "metamorphic_rate": ratio(total_consistent, total_eligible), "relations": relation_rows}


def confidence_and_latency(rows, corpus_sha):
    scored = [row for row in rows if row["primary_scored"]]
    bands = ((0.0, 0.5), (0.5, 0.8), (0.8, 0.9), (0.9, 1.0000001))
    confidence = []
    for lower, upper in bands:
        members = [row for row in scored if row["confidence"] is not None
                   and lower <= row["confidence"] < upper]
        correct = sum(row["predicted"] == row["truth"] for row in members)
        confidence.append({"lower_inclusive": lower, "upper_exclusive": min(upper, 1.0),
                           "support": len(members), "correct": correct,
                           "accuracy": ratio(correct, len(members)),
                           "mean_self_reported_confidence": statistics.mean(
                               row["confidence"] for row in members) if members else None})
    high_wrong = [row["case_id"] for row in scored if row["confidence"] is not None
                  and row["confidence"] >= 0.9 and row["predicted"] != row["truth"]]
    latencies = [row["latency_seconds"] for row in rows]
    return {"role": "PHASE_III_I_5_CONFIDENCE_LATENCY", "dataset_sha256": corpus_sha,
            "confidence_warning": "Self-reported model confidence is not calibrated probability.",
            "confidence_bands": confidence, "high_confidence_wrong_ge_0_9": len(high_wrong),
            "high_confidence_wrong_case_ids": high_wrong,
            "latency_seconds": {"calls": len(latencies), "total": sum(latencies),
                                "mean": statistics.mean(latencies), "median": statistics.median(latencies),
                                "p95_nearest_rank": nearest_rank(latencies, 0.95), "max": max(latencies)},
            "prompt_tokens": {"max": max(row["prompt_tokens"] for row in rows)},
            "generated_tokens": {"max": max(row["generated_tokens"] or 0 for row in rows)}}


def save_new(path, value):
    body = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(fd, "wb") as target:
        target.write(body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=BASE)
    args = parser.parse_args()
    corpus, rows = load_rows(args.results)
    corpus_sha = hashlib.sha256(CORPUS.read_bytes()).hexdigest()
    primary = primary_metrics(rows, corpus_sha)
    save_new(args.output_dir / "raw_metrics_v1.json", primary)
    save_new(args.output_dir / "slice_metrics_v1.json", slice_metrics(rows, corpus_sha))
    save_new(args.output_dir / "robustness_v1.json", robustness(corpus, rows, corpus_sha))
    save_new(args.output_dir / "confidence_latency_v1.json", confidence_and_latency(rows, corpus_sha))
    save_new(args.output_dir / "raw_error_ledger_v1.json", {
        "role": "PHASE_III_I_5_RAW_ERROR_LEDGER", "dataset_sha256": corpus_sha,
        "errors": [row for row in rows if row["primary_scored"] and row["predicted"] != row["truth"]],
        "unscored_ontology_gap": [row for row in rows if not row["primary_scored"]],
    })
    print(json.dumps({"scored": primary["total_cases"], "correct": primary["correct_cases"],
                      "accuracy": primary["accuracy"], "macro_f1": primary["macro_f1"],
                      "all_structurally_valid": primary["all_recorded_structural_valid"]}, indent=2))


if __name__ == "__main__":
    main()
