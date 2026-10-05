"""Model-free Phase III-J training-data audit tests."""

import json

from phase3j_audit_training import lexical_near_rows, message, numeric_mask, pair, summary


def row(baseline, note, label="modified"):
    return {"baseline_requirement": baseline, "new_client_message": note, "label": label}


def test_summary_reports_duplicates_conflicts_without_text(tmp_path):
    rows = [row("Track 5 units", "Allow 6 units", "modified"),
            row("Track 5 units", "Allow 6 units", "removed"),
            row("Track 7 units", "Allow 8 units", "modified")]
    source = tmp_path / "fixture.csv"
    source.write_text("fixture bytes")
    result = summary(rows, source)
    assert result["rows"] == 3
    assert result["normalized_pair_duplicate_excess"] == 1
    assert result["normalized_pairs_with_conflicting_labels"] == 1
    assert result["numeric_masked_pair_skeleton_duplicate_excess"] == 2
    assert "Track" not in json.dumps(result)


def test_protected_case_message_field_is_supported():
    protected = {"baseline_requirement": "Track 5 units", "message": "Allow 6 units"}
    assert pair(protected) == ("track 5 units", "allow 6 units")
    assert message(protected) == "allow 6 units"
    assert numeric_mask("Track 5 units") == "track number units"


def test_lexical_screen_excludes_exact_match_but_detects_near_pair():
    train = [row("Only owners may approve the weekly ledger.",
                 "Change the weekly ledger approval deadline from Monday to Tuesday.")]
    target = [row("Only owners may approve the weekly ledger.",
                  "Change the weekly ledger approval deadline from Monday to Wednesday.")]
    result = lexical_near_rows(train, target)
    assert result["target_rows_with_same_baseline_and_message_token_jaccard_ge_0_8"] == 1
    assert lexical_near_rows(train, train)["target_rows_with_same_baseline_and_message_token_jaccard_ge_0_8"] == 0
