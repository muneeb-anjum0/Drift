"""Portable, model-free integrity checks for the committed Phase III-I.5 freeze."""

import hashlib
import json
from pathlib import Path

from phase3i5_freeze import validate_review
from phase3i5_import_human_review import validate_sources


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "evaluation/phase_iii_i_5"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_three_source_reviews_match_candidate_and_transcription():
    normalized, counts = validate_sources(
        BASE / "candidate_draft_v1.json", BASE / "human_review/source.json",
        BASE / "human_review/source.csv", BASE / "human_review/source.txt",
    )
    assert counts == {"CONFIRMED": 214, "REVISED": 1, "AMBIGUOUS": 1}
    assert normalized == json.loads((BASE / "human_review/normalized_review_v1.json").read_text())


def test_frozen_corpus_preserves_review_and_unscored_gap():
    expected = validate_review(BASE / "candidate_draft_v1.json",
                               BASE / "human_review/normalized_review_v1.json")
    actual = json.loads((BASE / "reviewed_frozen_v1.json").read_text())
    assert actual == expected
    by_id = {case["id"]: case for case in actual["cases"]}
    assert by_id["s03-02"]["proposed_label"] == "added"
    assert by_id["s03-02"]["review"]["reviewed_label"] == "unchanged"
    assert by_id["s09-03"]["primary_scored"] is False
    assert by_id["s09-03"]["review"]["reviewed_label"] is None
    assert sum(case["primary_scored"] for case in actual["cases"]) == 215
    assert sum(relation["primary_eligible"] for relation in actual["relations"]
               if relation["type"] == "paraphrase_invariance") == 9


def test_pre_inference_manifest_and_stability_are_bound_to_files():
    manifest = json.loads((BASE / "pre_inference_manifest_v1.json").read_text())
    assert manifest["primary_scored_cases"] == 215
    for name, item in manifest["files"].items():
        if name == "model":  # The multi-GiB local model is intentionally absent in CI.
            continue
        assert sha(ROOT / item["path"]) == item["sha256"]
    assert (BASE / "reviewed_frozen_v1.json.sha256").read_text() == (
        f"{sha(BASE / 'reviewed_frozen_v1.json')}  reviewed_frozen_v1.json\n")
    selection = json.loads((BASE / "stability_selection_v1.json").read_text())
    assert selection["corpus_sha256"] == sha(BASE / "reviewed_frozen_v1.json")
    assert len(selection["case_ids"]) == len(set(selection["case_ids"])) == 24
