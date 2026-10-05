"""Model-free freeze-gate tests for the Phase III-I.5 corpus."""

import hashlib
import json
import pytest

from phase3i5_freeze import validate_draft, validate_review


def fixtures(tmp_path):
    cases = []
    for index in range(180):
        cases.append({
            "id": f"stress-{index:03d}",
            "baseline_requirement": f"The service records item {index}.",
            "message": f"Continue recording item {index}.",
            "proposed_label": "unchanged",
            "proposed_rationale": "Same behavior.",
            "difficulty_tier": "T1",
            "semantic_family": f"test-{index}",
            "domain": "unit-test",
            "requirement_structure": "atomic",
            "phenomenon_tags": ["unit_test"],
            "author_provenance": "AI_ASSISTED_SYNTHETIC_PROPOSAL",
        })
    draft_path = tmp_path / "draft.json"
    draft_path.write_text(json.dumps({"role": "PHASE_III_I_5_PROPOSED_NOT_REVIEWED_NOT_SCORED",
                                      "cases": cases}))
    review = {
        "draft_sha256": hashlib.sha256(draft_path.read_bytes()).hexdigest(),
        "reviewer": "Unit Test Reviewer",
        "review_provenance": "TEST_FIXTURE_ONLY",
        "author_exposure_assessment": "ACCEPTABLE_WITH_LIMITATION",
        "author_exposure_reason": "Synthetic fixture only; no closed-content exposure.",
        "review_date": "2026-10-05",
        "decisions": [{"case_id": case["id"], "decision": "CONFIRMED",
                       "reviewed_label": "unchanged", "review_note": ""} for case in cases],
    }
    review_path = tmp_path / "review.json"
    review_path.write_text(json.dumps(review))
    return draft_path, review_path


def test_valid_review_preserves_proposal(tmp_path):
    draft, review = fixtures(tmp_path)
    assert len(validate_draft(draft)["cases"]) == 180
    frozen = validate_review(draft, review)
    assert len(frozen["cases"]) == 180
    assert frozen["cases"][0]["proposed_label"] == "unchanged"
    assert frozen["cases"][0]["review"]["reviewed_label"] == "unchanged"


def test_stale_review_is_rejected(tmp_path):
    draft, review = fixtures(tmp_path)
    data = json.loads(review.read_text())
    data["draft_sha256"] = "0" * 64
    review.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        validate_review(draft, review)


def test_missing_review_is_rejected(tmp_path):
    draft, review = fixtures(tmp_path)
    data = json.loads(review.read_text())
    data["decisions"].pop()
    review.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="exactly one"):
        validate_review(draft, review)


def test_ambiguous_case_is_unscored(tmp_path):
    draft, review = fixtures(tmp_path)
    data = json.loads(review.read_text())
    data["decisions"][0] = {"case_id": "stress-000", "decision": "AMBIGUOUS",
                            "reviewed_label": None, "review_note": "Unresolved referent"}
    review.write_text(json.dumps(data))
    frozen = validate_review(draft, review)
    assert frozen["cases"][0]["primary_scored"] is False


def test_revised_label_must_change(tmp_path):
    draft, review = fixtures(tmp_path)
    data = json.loads(review.read_text())
    data["decisions"][0]["decision"] = "REVISED"
    data["decisions"][0]["review_note"] = "No actual change"
    review.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="different canonical"):
        validate_review(draft, review)


def test_material_author_exposure_blocks_freeze(tmp_path):
    draft, review = fixtures(tmp_path)
    data = json.loads(review.read_text())
    data["author_exposure_assessment"] = "MATERIAL_COMPROMISE"
    data["author_exposure_reason"] = "Closed material may have shaped cases."
    review.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="author-exposure limitation"):
        validate_review(draft, review)
