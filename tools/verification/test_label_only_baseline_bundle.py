"""The Kaggle baseline package must contain development evidence only."""

import importlib.util
import hashlib
import json
import shutil
import zipfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
BUILDER = REPO / "ai_model/label_only_600/build_kaggle_baseline_bundle.py"


def test_bundle_contains_only_frozen_development_material(tmp_path):
    spec = importlib.util.spec_from_file_location("baseline_bundle_builder", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fixture_repo = tmp_path / "repo"
    for name, relative in module.FILES.items():
        target = fixture_repo / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if name == "development.csv":
            target.write_text("id,reviewed_label\nfixture,added\n", encoding="utf-8")
        else:
            shutil.copyfile(REPO / relative, target)
    freeze_path = fixture_repo / "evaluation/label_only_new/protocol_freeze_v1.json"
    freeze = json.loads(freeze_path.read_text())
    freeze["private_data"]["development_sha256"] = hashlib.sha256(
        (fixture_repo / module.FILES["development.csv"]).read_bytes()
    ).hexdigest()
    freeze_path.write_text(json.dumps(freeze), encoding="utf-8")
    output = tmp_path / "baseline.zip"
    result = module.build(fixture_repo, output)
    assert result["locked_test"] == "NOT_INCLUDED"
    assert result["train"] == "NOT_INCLUDED"
    with zipfile.ZipFile(output) as archive:
        names = {name.rsplit("/", 1)[-1] for name in archive.namelist()}
    assert names == set(module.FILES)
    assert "development.csv" in names
    assert "locked_test.csv" not in names
    assert "train.csv" not in names
