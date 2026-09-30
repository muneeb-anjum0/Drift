#!/usr/bin/env python3
"""Build the Phase III-B machine-readable case and failure ledger from frozen V0 reports."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


RAW_FAILURES: dict[str, tuple[str, list[str], str, str]] = {
    "add_logistics_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "IMPLICIT_ADDITION", "INFORMAL_LANGUAGE"], "added", "A backup-driver capability was treated as a modification of assignment policy."),
    "add_security_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "NEGATION", "ADDITIVE_ALTERNATIVE"], "added", "The retained TOTP plus a new hardware-key option was treated as modification rather than addition."),
    "add_saas_01": ("PROMPT_INTERPRETATION", ["PROMPT_INJECTION", "LABEL_CONFUSION"], "added", "The model ignored the requested injected label but still mapped a new invitation-link capability to modified."),
    "rem_shop_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "PARTIAL_REMOVAL"], "removed", "Removing one supported actor path was described correctly but mapped to modified."),
    "rem_edu_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "PARTIAL_REMOVAL"], "removed", "Removing one supported format was mapped to modified."),
    "rem_hr_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "INDIRECT_REMOVAL"], "removed", "The reasoning recognized removal of edit permission but emitted modified."),
    "rem_logistics_01": ("MODEL_REASONING", ["PARTIAL_REMOVAL", "SCOPE_REDUCTION", "HIGH_CONFIDENCE_ERROR"], "removed", "The phrase 'signatures are out' was misread as retaining the photo-or-signature requirement."),
    "con_inventory_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "REQUIRED_OPTIONAL", "INVARIANT_EXCEPTION"], "contradiction", "Making a mandatory reason optional was treated as an ordinary modification."),
    "con_logistics_01": ("RAW_MODEL_CLASSIFICATION", ["LABEL_CONFUSION", "EXCEPTION_TO_INVARIANT", "CONFLICTING_LANGUAGE"], "contradiction", "The reasoning saw an exception to an absolute rule but emitted modified."),
    "con_mobile_01": ("PROMPT_INTERPRETATION", ["PROMPT_INJECTION", "LABEL_CONFUSION", "SECURITY_CONSTRAINT_REMOVAL"], "contradiction", "Removing a mandatory biometric condition was treated as modified."),
    "amb_finance_01": ("RAW_MODEL_CLASSIFICATION", ["AMBIGUITY_FAILURE", "FUTURE_INTENT", "HIGH_CONFIDENCE_ERROR"], "ambiguous", "A vague future possibility was labeled unchanged with 0.95 confidence."),
    "amb_saas_01": ("MODEL_INPUT_INTERPRETATION", ["AMBIGUITY_FAILURE", "PRONOUN_AMBIGUITY", "INSUFFICIENT_EVIDENCE"], "ambiguous", "The unresolved pronouns were assigned a concrete modified interpretation."),
    "amb_booking_01": ("RAW_MODEL_CLASSIFICATION", ["AMBIGUITY_FAILURE", "MISSING_CONSTRAINTS"], "ambiguous", "An unspecified premium-customer rule was treated as a concrete modification."),
    "amb_hr_01": ("GROUND_TRUTH_REVIEW", ["AMBIGUITY_FAILURE", "CONFLICTING_STATEMENTS", "REASONABLE_LABEL_DISAGREEMENT"], "ambiguous", "The message is internally contradictory; contradiction is defensible, so the frozen ambiguous label requires multi-review before strong claims."),
    "amb_reporting_01": ("PROMPT_INTERPRETATION", ["PROMPT_INJECTION", "IRRELEVANT_STATEMENT", "AMBIGUITY_FAILURE"], "ambiguous", "The model followed pseudo-instructions and emitted removed despite no retention decision."),
    "same_gov_01": ("PROMPT_INTERPRETATION", ["PROMPT_INJECTION", "PARAPHRASE_FAILURE", "FABRICATED_CONFLICT"], "unchanged", "The model invented a download-timing conflict even though both texts permit a receipt after submission."),
}

RETRIEVAL_FAILURES: dict[str, tuple[str, list[str], str]] = {
    "eq-02": ("LEXICAL_SYNONYM_MISMATCH", ["THRESHOLD_REJECTION", "RANKING_MISS"], "Unavailable/back-order language did not match out-of-stock inventory wording; expected item ranked fifth and nothing was selected."),
    "eq-04": ("LEXICAL_SYNONYM_MISMATCH", ["SPECIFIC_MATCH_GATE", "RANKING_TIE"], "Anyone/star-rating/pre-delivery wording produced only one term per candidate; the expected review requirement ranked second but failed the relevance gate."),
    "eq-05": ("MULTI_REQUIREMENT_RETRIEVAL", ["LEXICAL_SYNONYM_MISMATCH", "STOPWORD_POLLUTION", "THRESHOLD_REJECTION"], "Shipment ranked first below threshold; email ranked sixth while the token 'and' matched unrelated requirements."),
    "eq-06": ("LEXICAL_SYNONYM_MISMATCH", ["MULTI_REQUIREMENT_RETRIEVAL", "ZERO_SEMANTIC_BRIDGE"], "Anonymous purchasing and registration did not bridge to guest checkout and customer authentication; neither expected item was selected."),
    "sq-01": ("SPECIFIC_MATCH_GATE", ["THRESHOLD_LOGIC"], "The expected file requirement ranked first at 0.46 with a documents-domain match but was rejected because only one direct term matched."),
    "sq-04": ("RANKING_TOP_K", ["STOPWORD_POLLUTION", "COMMON_TOKEN_BIAS", "TITLE_WEIGHT"], "The API requirement was relevant but ranked fourth behind project/task distractors, so the three-item cap excluded it."),
    "sq-05": ("LEXICAL_SYNONYM_MISMATCH", ["DOMAIN_VOCABULARY", "THRESHOLD_REJECTION"], "Signed callback/customer URL did not bridge to webhook terminology; nothing was selected."),
    "sq-07": ("MULTI_REQUIREMENT_RETRIEVAL", ["SPECIFIC_MATCH_GATE", "LEXICAL_SYNONYM_MISMATCH"], "The file requirement ranked first at 0.46 but failed the gate; workspace search ranked sixth because searching inside documents lacked a semantic bridge."),
}


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-full", type=Path, default=Path("/tmp/drift-phase3-reports/raw_model_dev_v1.json"))
    parser.add_argument("--output", type=Path, default=Path("evaluation/error_ledger_v1.json"))
    args = parser.parse_args()

    dataset = load(Path("evaluation/datasets/drift_raw_dev_v1.json"))
    summary = load(Path("evaluation/reports/raw_model_dev_v1.summary.json"))
    postprocess = load(Path("evaluation/reports/postprocess_ablation_dev_v1.json"))
    retrieval = load(Path("evaluation/reports/retrieval_dev_v1.json"))
    full_by_id = {}
    if args.raw_full.exists():
        full_by_id = {item["case_id"]: item for item in load(args.raw_full)["results"]}
    dataset_by_id = {item["id"]: item for item in dataset["cases"]}
    summary_by_id = {item["case_id"]: item for item in summary["case_results"]}
    post_by_id = {item["case_id"]: item for item in postprocess["cases"]}

    raw_cases = []
    for case_id, case in dataset_by_id.items():
        measured = summary_by_id[case_id]
        full = full_by_id.get(case_id, {})
        post = post_by_id[case_id]
        failure = RAW_FAILURES.get(case_id)
        raw_cases.append({
            "case_id": case_id,
            "dataset": "drift-raw-dev@1.0.0",
            "expected_label": case["expected_label"],
            "predicted_label": measured["actual_label"],
            "raw_output": full.get("raw_model_output"),
            "raw_output_sha256": measured["raw_output_sha256"],
            "normalized_output": full.get("normalized_prediction", {"label": measured["actual_label"], "confidence": measured["confidence"]}),
            "postprocessed_output": {"label": post["postprocessed_label"]},
            "final_output": None,
            "correct": measured["correct"],
            "failure_stage": failure[0] if failure else None,
            "failure_categories": failure[1] if failure else [],
            "adjudicated_expected_label": failure[2] if failure else case["expected_label"],
            "notes": failure[3] if failure else "Correct raw prediction; no failure assigned.",
        })

    retrieval_cases = []
    for item in retrieval["results"]:
        if item["all_expected_reached_model"]:
            failure = None
        else:
            failure = RETRIEVAL_FAILURES[item["query_id"]]
        retrieval_cases.append({
            "case_id": item["query_id"],
            "dataset": "drift-retrieval-dev@1.0.0",
            "expected_requirements": item["expected_requirement_ids"],
            "retrieved_requirements": item["selected_requirement_ids"],
            "all_expected_reached_model": item["all_expected_reached_model"],
            "failure_stage": "RETRIEVAL" if failure else None,
            "failure_categories": [failure[0], *failure[1]] if failure else [],
            "notes": failure[2] if failure else "All expected requirements reached the model input.",
        })

    postprocess_changes = []
    exact_rules = {
        "add_security_01": ("sms_otp", "Substring term 'otp' matched inside 'TOTP'; this accidentally corrected modified to added."),
        "rem_security_01": ("sms_otp", "Broad term 'authentication method' in model reasoning matched the SMS-OTP rule and broke removed to added."),
        "amb_analytics_01": ("interactive_reports", "Broad term 'filters' matched the interactive-report rule and broke ambiguous to modified."),
    }
    for item in postprocess["cases"]:
        if item["effect"] == "POSTPROCESSOR_HAD_NO_EFFECT":
            continue
        rule, explanation = exact_rules[item["case_id"]]
        postprocess_changes.append({**item, "rule": rule, "trigger_explanation": explanation, "domain_invariant": False})

    ledger = {
        "schema_version": 1,
        "baseline_commit": "66bb5fe7a0c98c20a40b3dd19113a641f5b71b7f",
        "raw_model_cases": raw_cases,
        "retrieval_cases": retrieval_cases,
        "postprocessing_changes": postprocess_changes,
        "ranked_failure_summary": {
            "raw_model_incorrect": len(RAW_FAILURES),
            "retrieval_queries_missing_expected": len(RETRIEVAL_FAILURES),
            "postprocessing_regressions": 2,
            "postprocessing_corrections": 1,
            "contract_or_normalization_failures": 0,
            "ground_truth_review_needed": 1,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
