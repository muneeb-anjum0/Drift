"""Boundary taxonomy is exhaustive without pretending tags prove causation."""

from phase3i5_error_taxonomy import analyze, primary_family


def test_known_boundary_and_other_fallback():
    assert primary_family({"truth": "removed", "predicted": "modified"})[0] == "REMOVAL_AS_MODIFICATION"
    assert primary_family({"truth": "modified", "predicted": "removed"})[0] == "MODIFICATION_AS_REMOVAL"
    assert primary_family({"truth": "removed", "predicted": "added"})[0] == "OTHER"


def test_every_error_retains_context_without_causal_claim():
    ledger = {"dataset_sha256": "frozen", "errors": [
        {"case_id": "x", "truth": "removed", "predicted": "modified",
         "phenomenon_tags": ["negation"], "difficulty_tier": "T3", "domain": "fixture"},
    ]}
    robustness = {"relations": [{"type": "distractor_invariance", "eligible": True,
                                 "metamorphic_consistent": False, "case_ids": ["x", "y"]}]}
    report = analyze(ledger, robustness)
    assert report["error_count"] == 1
    assert report["rows"][0]["primary_family"] == "REMOVAL_AS_MODIFICATION"
    assert report["rows"][0]["phenomena_present_not_proven_causal"] == ["negation"]
    assert report["rows"][0]["observed_relation_instability"] == ["DISTRACTOR_SENSITIVITY"]
