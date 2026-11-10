"""Create a private development-only Kaggle ZIP; never include train or locked test."""

import argparse
import hashlib
import json
import os
import zipfile
from pathlib import Path


FILES = {
    "development.csv": "evaluation/label_only_new/local_review/v1/development.csv",
    "protocol_freeze_v1.json": "evaluation/label_only_new/protocol_freeze_v1.json",
    "prompt_v1.json": "evaluation/label_only_new/prompt_v1.json",
    "gate_v1.json": "evaluation/label_only_new/gate_v1.json",
    "label_only_600_contract.py": "tools/verification/label_only_600_contract.py",
    "model_freeze_v1.json": "ai_model/label_only_600/model_freeze_v1.json",
    "requirements-kaggle.txt": "ai_model/label_only_600/requirements-kaggle.txt",
    "kaggle_baseline.py": "ai_model/label_only_600/kaggle_baseline.py",
}


def build(repo: Path, destination: Path) -> dict:
    if destination.exists():
        raise FileExistsError(destination)
    freeze = json.loads((repo / "evaluation/label_only_new/protocol_freeze_v1.json").read_text())
    sources = {name: repo / relative for name, relative in FILES.items()}
    for name, path in sources.items():
        if not path.is_file():
            raise FileNotFoundError(path)
        expected = {
            "development.csv": freeze["private_data"]["development_sha256"],
            "prompt_v1.json": freeze["prompt"]["sha256"],
            "gate_v1.json": freeze["gate"]["sha256"],
            "label_only_600_contract.py": freeze["parser_and_scorer"]["sha256"],
        }.get(name)
        if expected and hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Frozen {name} differs from protocol")
    destination.parent.mkdir(parents=True, exist_ok=True)
    old_umask = os.umask(0o077)
    try:
        with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, path in sources.items():
                archive.write(path, arcname=f"label_only_600_baseline/{name}")
    finally:
        os.umask(old_umask)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError("ZIP integrity check failed")
        if sorted(archive.namelist()) != sorted(f"label_only_600_baseline/{name}" for name in FILES):
            raise ValueError("ZIP has unexpected contents")
    return {"path": str(destination), "bytes": destination.stat().st_size,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
            "contains": sorted(FILES), "locked_test": "NOT_INCLUDED", "train": "NOT_INCLUDED"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.repo, args.output), indent=2))


if __name__ == "__main__":
    main()
