"""Model-free checks for the Phase III-I singleton recorder."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from phase3i_run_oracle import case_path, save_new, sha256


def test_case_path_rejects_unsafe_id(tmp_path):
    assert case_path(tmp_path, "i-mod-01") == tmp_path / "i-mod-01.json"
    with pytest.raises(ValueError, match="unsafe case ID"):
        case_path(tmp_path, "../outside")


def test_save_new_is_exclusive(tmp_path):
    target = tmp_path / "row.json"
    save_new(target, {"case_id": "i-mod-01", "raw_predicted_class": "modified"})
    first = target.read_bytes()
    with pytest.raises(FileExistsError):
        save_new(target, {"case_id": "i-mod-01", "raw_predicted_class": "added"})
    assert target.read_bytes() == first
    assert json.loads(first)["raw_predicted_class"] == "modified"
    assert len(sha256(target)) == 64
