"""Model-free metric checks for the Phase III-I raw scorer."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from phase3i_score_raw import category_results, metrics
from phase3i_score_pp1 import analyze


def row(case_id, truth, predicted, categories=()):
    return {
        "case_id": case_id, "truth": truth, "predicted": predicted,
        "categories": list(categories),
        "structural_category": "VALID" if predicted else "INVALID_JSON",
    }


def test_metrics_count_invalid_as_wrong_and_preserve_six_classes():
    rows = [
        row("a", "added", "added", ("numeric",)),
        row("b", "modified", "unchanged", ("numeric",)),
        row("c", "removed", "modified", ("negation",)),
        row("d", "contradiction", None, ("conditional",)),
        row("e", "ambiguous", "ambiguous"),
        row("f", "unchanged", "added"),
    ]
    report = metrics(rows)
    assert report["total_cases"] == 6
    assert report["valid_cases"] == 5
    assert report["invalid_cases"] == 1
    assert report["correct_cases"] == 2
    assert report["accuracy"] == 2 / 6
    assert len(report["confusion_matrix"]) == 6
    assert report["per_class"]["contradiction"]["support"] == 1
    assert report["per_class"]["contradiction"]["recall"] == 0
    assert report["critical_errors"]["actual_drift_predicted_unchanged"] == 1
    assert report["critical_errors"]["unchanged_predicted_drift"] == 1
    assert report["critical_errors"]["contradiction_missed"] == 1
    assert report["critical_errors"]["added_or_removed_predicted_modified"] == 1
    categories = category_results(rows)["categories"]
    assert categories["numeric"]["support"] == 2
    assert categories["numeric"]["correct"] == 1
    assert categories["negation"]["error_case_ids"] == ["c"]


def test_pp1_effects_are_verified_against_raw_truth():
    rows = [row("a", "added", "modified"), row("b", "removed", "removed")]
    replay = {
        "role": "PHASE_III_I_FROZEN_GO_PP1_REPLAY",
        "effect_counts": {"FIXED": 1, "WORSENED": 0, "NEUTRAL": 1},
        "changed_labels": 1,
        "rows": [
            {"case_id": "a", "truth": "added", "raw_label": "modified",
             "pp1_label": "added", "effect": "FIXED", "changed": True},
            {"case_id": "b", "truth": "removed", "raw_label": "removed",
             "pp1_label": "removed", "effect": "NEUTRAL", "changed": False},
        ],
    }
    report = analyze(rows, replay)
    assert report["raw"]["correct_cases"] == 1
    assert report["raw_plus_pp1"]["correct_cases"] == 2
    assert report["changed_label_case_ids"] == ["a"]
