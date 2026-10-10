#!/usr/bin/env python3
"""Build and audit the allowlisted, final-free Phase III-J Kaggle ZIP."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
PACKAGE_DIR = "drift_phase_iii_j_training"
FILES = {
    "phase3j.py": REPO / "tools/phase3j_kaggle/phase3j.py",
    "requirements.txt": REPO / "tools/phase3j_kaggle/requirements.txt",
    "README.md": REPO / "tools/phase3j_kaggle/README.md",
    "P1.json": REPO / "evaluation/prompts/P1.json",
    "training_config_v1.json": REPO / "evaluation/phase_iii_j/frozen/training_config_v1.json",
    "acceptance_gate_v1.json": REPO / "evaluation/phase_iii_j/frozen/acceptance_gate_v1.json",
    "reviewed_train_v1.json": REPO / "evaluation/phase_iii_j/frozen/reviewed_train_v1.json",
    "reviewed_development_v1.json": REPO / "evaluation/phase_iii_j/frozen/reviewed_development_v1.json",
}
PROTECTED = (
    "evaluation/phase_iii_d/retrieval_independent_v1.json",
    "evaluation/phase_iii_e/retrieval_independent_v1.json",
    "evaluation/phase_iii_i/decision_reviewed_v1.json",
    "evaluation/phase_iii_i_5/reviewed_frozen_v1.json",
)


def digest(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def all_strings(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"message", "baseline_requirement", "description", "text"} and isinstance(child, str):
                yield child
            else:
                yield from all_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from all_strings(child)


def protected_strings(sealed_final: Path):
    final = json.loads(sealed_final.read_text(encoding="utf-8"))
    if not isinstance(final, list) or len(final) != 182:
        raise ValueError("sealed final count mismatch")
    strings = set()
    for source in (final, *(json.loads((REPO / name).read_text()) for name in PROTECTED)):
        strings.update(value for value in all_strings(source) if len(value) >= 30)
    return strings


def zip_info(name: str):
    info = zipfile.ZipInfo(PACKAGE_DIR + "/" + name, date_time=(2026, 10, 6, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    return info


def build(output: Path):
    if output.resolve().is_relative_to(REPO.resolve()):
        raise ValueError("generated ZIP must stay outside Git repository")
    if not output.parent.is_dir() or output.exists():
        raise FileExistsError("output parent missing or ZIP already exists; refusing overwrite")
    contents = {name: path.read_bytes() for name, path in FILES.items()}
    config = json.loads(contents["training_config_v1.json"])
    gate = json.loads(contents["acceptance_gate_v1.json"])
    if config["sealed_final_sha256"] != gate["sealed_final_sha256"]:
        raise ValueError("config/gate final seal mismatch")
    for split in ("train", "development"):
        if digest(contents[f"reviewed_{split}_v1.json"]) != config[f"{split}_sha256"]:
            raise ValueError(f"frozen {split} hash mismatch")
    if digest(contents["P1.json"]) != config["prompt_sha256"]:
        raise ValueError("P1 hash mismatch")
    manifest = {
        "role": "PHASE_III_J_KAGGLE_PACKAGE_MANIFEST",
        "status": "UNTRAINED_FINAL_EXCLUDED",
        "provenance": "AI-authored and separately AI-reviewed; NOT human-reviewed",
        "files": {name: digest(body) for name, body in sorted(contents.items())},
        "config_sha256": digest(contents["training_config_v1.json"]),
        "acceptance_gate_sha256": digest(contents["acceptance_gate_v1.json"]),
        "train_sha256": config["train_sha256"],
        "development_sha256": config["development_sha256"],
        "sealed_final_sha256_metadata_only": config["sealed_final_sha256"],
        "sealed_final_count_metadata_only": config["sealed_final_rows"],
    }
    contents["package_manifest.json"] = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
    with output.open("xb") as raw:
        with zipfile.ZipFile(raw, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, body in sorted(contents.items()):
                archive.writestr(zip_info(name), body)
    return manifest


def validate(output: Path, sealed_final: Path):
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        expected = {PACKAGE_DIR + "/" + name for name in (*FILES, "package_manifest.json")}
        if len(names) != len(expected) or set(names) != expected:
            raise ValueError("ZIP member allowlist mismatch")
        if any(".." in Path(name).parts or Path(name).is_absolute() for name in names):
            raise ValueError("unsafe ZIP path")
        body = {Path(name).name: archive.read(name) for name in names}
    manifest = json.loads(body["package_manifest.json"])
    if set(manifest["files"]) != set(FILES):
        raise ValueError("manifest file allowlist mismatch")
    for name, expected_hash in manifest["files"].items():
        if digest(body[name]) != expected_hash:
            raise ValueError(f"ZIP hash mismatch: {name}")
    config = json.loads(body["training_config_v1.json"])
    if digest(sealed_final.read_bytes()) != config["sealed_final_sha256"]:
        raise ValueError("local sealed-final hash mismatch")
    for split in ("train", "development"):
        if digest(body[f"reviewed_{split}_v1.json"]) != config[f"{split}_sha256"]:
            raise ValueError(f"ZIP {split} hash mismatch")
        rows = json.loads(body[f"reviewed_{split}_v1.json"])
        if len(rows) != config[f"{split}_rows"] or any(row["partition"] != split for row in rows):
            raise ValueError(f"ZIP {split} partition/count mismatch")
    blob = b"\n".join(body.values())
    if re.search(rb"FH[0-9]{4,}", blob):
        raise ValueError("final case ID leaked into ZIP")
    if re.search(rb"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}", blob):
        raise ValueError("potential secret in ZIP")
    for text in protected_strings(sealed_final):
        if text.encode() in blob:
            raise ValueError("protected final/closed case text found in ZIP")
    return {"status": "PASS", "zip_sha256": digest(output.read_bytes()),
            "members": sorted(body), "train_rows": config["train_rows"],
            "development_rows": config["development_rows"],
            "final_text_matches": 0, "protected_text_matches": 0,
            "sealed_final_sha256_metadata_only": config["sealed_final_sha256"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("build", "validate"))
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--sealed-final", required=True, type=Path)
    args = parser.parse_args()
    if args.command == "build":
        build(args.output)
    result = validate(args.output, args.sealed_final)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
