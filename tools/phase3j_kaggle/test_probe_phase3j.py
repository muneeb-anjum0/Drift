"""Model-free checks for the saved-adapter development probe."""

from probe_phase3j import parse_failure, recover_diagnostic_label, select_development_sample


def test_sample_uses_two_lowest_ids_per_class_without_outcome_selection():
    labels = ("added", "modified", "removed", "contradiction", "ambiguous", "unchanged")
    rows = [
        {"id": f"{index:02d}-{label}", "review": {"reviewed_label": label}}
        for label in labels for index in (3, 1, 2)
    ]
    selected = select_development_sample(rows, labels)
    assert [row["id"] for row in selected] == [
        f"{index:02d}-{label}" for label in labels for index in (1, 2)
    ]


def test_parse_failure_matches_full_p1_contract():
    assert parse_failure('{"label":"removed","confidence":0.8,"reasoning":"Removed option","changed_elements":[]}') is None
    assert parse_failure('{"label":"removed"}').startswith("field_mismatch")
    assert parse_failure('removed"').startswith("invalid_json")
    assert parse_failure('{"label":"removed","confidence":true,"reasoning":"x","changed_elements":[]}') == "invalid_confidence"


def test_fragment_label_recovery_is_diagnostic_only():
    assert recover_diagnostic_label('modified') == "modified"
    assert recover_diagnostic_label('"modified"') == "modified"
    assert recover_diagnostic_label('{"label":"modified"') == "modified"
    assert recover_diagnostic_label('{"label":"modified","confidence":0.5}') == "modified"
    assert recover_diagnostic_label("The change is modified.") is None
