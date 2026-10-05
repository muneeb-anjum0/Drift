"""Fail-closed Phase III-J authored-case and human-review gate tests."""

import pytest

from phase3j_freeze_inputs import partition_for_freeze, validate


LABELS = ("added", "modified", "removed", "contradiction", "ambiguous", "unchanged")
PARTITIONS = ("train", "development", "final")


def fixtures():
    cases, reviews = [], []
    for partition in PARTITIONS:
        for label in LABELS:
            case_id = f"j-{partition}-{label}"
            cases.append({
                "id": case_id, "partition": partition, "family_id": case_id,
                "domain": f"{partition}-{label}",
                "baseline_requirement": f"A unique {partition} {label} fixture baseline.",
                "message": f"A distinct {partition} {label} fixture message.",
                "proposed_label": label, "author": "Fixture Author",
                "authored_date": "2026-10-05", "source_license": "synthetic fixture",
                "privacy_classification": "synthetic", "kaggle_upload_approved": "YES",
            })
            reviews.append({"case_id": case_id, "decision": "CONFIRMED",
                            "reviewed_label": label, "reason": "", "reviewer": "Fixture Reviewer",
                            "review_date": "2026-10-06", "review_provenance": "fixture only"})
    return cases, reviews


def test_valid_review_freezes_exact_proposals_and_family_count():
    cases, reviews = fixtures()
    frozen = validate(cases, reviews, min_final_per_label=1)
    assert len(frozen["cases"]) == 18
    assert frozen["family_count"] == 18
    assert frozen["review_decision_counts"] == {"CONFIRMED": 18}
    assert frozen["reviewed_class_counts_by_partition"]["final"]["removed"] == 1
    train_dev, final_sha, final_count = partition_for_freeze(frozen)
    assert len(train_dev["cases"]) == 12
    assert all(case["partition"] != "final" for case in train_dev["cases"])
    assert final_count == 6
    assert len(final_sha) == 64


def test_missing_review_blocks_freeze():
    cases, reviews = fixtures()
    with pytest.raises(ValueError, match="every case needs exactly one"):
        validate(cases, reviews[:-1], min_final_per_label=1)


def test_same_family_across_splits_blocks_freeze():
    cases, reviews = fixtures()
    cases[6]["family_id"] = cases[0]["family_id"]
    with pytest.raises(ValueError, match="semantic family crosses"):
        validate(cases, reviews, min_final_per_label=1)


def test_closed_overlap_blocks_freeze():
    cases, reviews = fixtures()
    with pytest.raises(ValueError, match="protected-evaluation overlap"):
        validate(cases, reviews, min_final_per_label=1,
                 protected_messages={"a distinct train added fixture message"})


def test_high_lexical_similarity_to_closed_case_blocks_freeze():
    cases, reviews = fixtures()
    protected = [{"baseline_requirement": cases[0]["baseline_requirement"],
                  "message": cases[0]["message"] + " Extra."}]
    with pytest.raises(ValueError, match="high lexical similarity to protected"):
        validate(cases, reviews, min_final_per_label=1, protected_rows=protected)


def test_unapproved_kaggle_upload_blocks_training_split():
    cases, reviews = fixtures()
    cases[0]["kaggle_upload_approved"] = "NO"
    with pytest.raises(ValueError, match="not approved for Kaggle upload"):
        validate(cases, reviews, min_final_per_label=1)


def test_unscored_review_requires_reason_and_does_not_fill_class():
    cases, reviews = fixtures()
    reviews[-1]["decision"] = "AMBIGUOUS"
    reviews[-1]["reviewed_label"] = ""
    with pytest.raises(ValueError, match="non-confirmation needs reason"):
        validate(cases, reviews, min_final_per_label=1)
    reviews[-1]["reason"] = "Two interpretations remain"
    with pytest.raises(ValueError, match="insufficient final/unchanged support"):
        validate(cases, reviews, min_final_per_label=1)


def test_revised_review_preserves_original_proposal():
    cases, reviews = fixtures()
    reviews[0]["decision"] = "REVISED"
    reviews[0]["reviewed_label"] = "modified"
    reviews[0]["reason"] = "Fixture correction"
    with pytest.raises(ValueError, match="insufficient train/added support"):
        validate(cases, reviews, min_final_per_label=1)
    cases.append({**cases[0], "id": "j-extra-added", "family_id": "j-extra-added",
                  "baseline_requirement": "A separate training baseline.",
                  "message": "A separate training message."})
    reviews.append({**reviews[0], "case_id": "j-extra-added", "decision": "CONFIRMED",
                    "reviewed_label": "added", "reason": ""})
    frozen = validate(cases, reviews, min_final_per_label=1)
    assert frozen["cases"][0]["proposed_label"] == "added"
    assert frozen["cases"][0]["review"]["reviewed_label"] == "modified"
