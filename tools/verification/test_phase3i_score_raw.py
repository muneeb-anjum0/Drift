"""Model-free metric checks for the Phase III-I raw scorer."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from phase3i_score_raw import category_results, metrics


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
