"""Model-free scoring checks for Phase III-I.5 raw results."""

from phase3i5_score_raw import confidence_and_latency, primary_metrics, robustness, slice_metrics


def row(case_id, truth, predicted, scored=True, tags=()):
    return {"case_id": case_id, "truth": truth, "predicted": predicted,
            "primary_scored": scored, "domain": "fixture", "difficulty_tier": "T1",
            "length_bucket": "short", "requirement_structure": "atomic",
            "phenomenon_tags": list(tags), "semantic_family": "fixture",
            "structural_category": "VALID" if predicted else "INVALID_JSON",
            "confidence": 0.95 if predicted else None, "latency_seconds": 1.0,
            "prompt_tokens": 20, "generated_tokens": 10}


def test_unscored_review_does_not_enter_primary_metrics():
    rows = [row("one", "removed", "modified"), row("gap", None, "contradiction", False)]
    report = primary_metrics(rows, "frozen")
    assert report["total_cases"] == 1
    assert report["correct_cases"] == 0
    assert report["all_recorded_cases"] == 2
    assert report["unscored_ontology_gap_cases"] == 1
    assert report["confusion_matrix"]["removed"]["modified"] == 1


def test_reviewed_relation_eligibility_is_respected():
    rows = [row("a", "removed", "removed"), row("b", "modified", "modified"),
            row("gap", None, "added", False)]
    corpus = {"relations": [
        {"id": "pair", "type": "minimal_pair_contrast", "case_ids": ["a", "b"],
         "expected_labels": ["removed", "modified"], "primary_eligible": True,
         "eligibility_reason": "ELIGIBLE"},
        {"id": "excluded", "type": "paraphrase_invariance", "case_ids": ["a", "gap"],
         "primary_eligible": False, "eligibility_reason": "UNSCORED_MEMBER"},
    ]}
    result = robustness(corpus, rows, "frozen")
    assert result["summary"]["minimal_pair_contrast"]["both_correct"] == 1
    assert result["summary"]["paraphrase_invariance"]["ineligible"] == 1
    assert result["metamorphic_eligible"] == 1


def test_slices_and_confidence_count_only_scored():
    rows = [row("one", "added", "added", tags=("lexical_trap",)),
            row("gap", None, "removed", False, tags=("lexical_trap",))]
    slices = slice_metrics(rows, "frozen")
    assert slices["slices"]["phenomenon_tag"]["lexical_trap"]["support"] == 1
    confidence = confidence_and_latency(rows, "frozen")
    assert sum(band["support"] for band in confidence["confidence_bands"]) == 1
    assert confidence["latency_seconds"]["calls"] == 2
