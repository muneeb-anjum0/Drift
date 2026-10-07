#!/usr/bin/env python3
"""Build or run a private, development-only raw-output probe for the saved adapter.

Build is model-free and uses only the frozen v2 package plus the original run
backup. Run performs 12 development generations on a GPU; it never trains or
opens the protected final holdout.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import random
import re
import time
import zipfile
from collections import Counter
from pathlib import Path


BUNDLE = "drift_phase_iii_j_probe_v1"
PACKAGE = "drift_phase_iii_j_training"
RUN = "saved_run"
BACKUP_ROOT = "drift_phase_iii_j_compat_v2"
PACKAGE_SHA256 = "c2492dad96a34dac232b0cc52bc9b526300967c7d43b4f87f2cd5d240104a8cf"
BACKUP_SHA256 = "852c453e29803237eb2112b54ca805a0ed585570b094945075263514c319fa25"
TRAINING_SCRIPT_SHA256 = "35d98b849377196d791bbd86537475c4df87e2cc2dfafe60ecde2bdbc2913f95"
ADAPTER_SHA256 = "907c98a7156d878e694d6a854fe75c9c4624a6d7f9b077735c9f3b9070ef4b21"
CONFIG_SHA256 = "4ef6911d9e7508184db146bdb7e49dec18b4e26ba2edfe7285b5fb9d774bc0a3"
SELECTED_CHECKPOINT = "/kaggle/working/drift_phase_iii_j_compat_v2/checkpoint-60"
RUN_FILES = (
    "run_identity.json",
    "checkpoint-180/trainer_state.json",
    "best_adapter/adapter_config.json",
    "best_adapter/adapter_model.safetensors",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_training_module(path: Path):
    spec = importlib.util.spec_from_file_location("phase3j_frozen_probe", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load frozen training script")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def select_development_sample(rows, labels):
    """Take two stable IDs per class without consulting model outcomes."""
    selected = []
    for label in labels:
        eligible = sorted((row for row in rows if row["review"]["reviewed_label"] == label),
                          key=lambda row: row["id"])
        if len(eligible) < 2:
            raise ValueError(f"fewer than two development rows for {label}")
        selected.extend(eligible[:2])
    if len({row["id"] for row in selected}) != 12:
        raise ValueError("development probe IDs are not unique")
    return selected


def parse_failure(raw: str) -> str | None:
    """Diagnostic only; frozen strict_prediction remains the scoring authority."""
    try:
        obj = json.loads(raw.strip())
    except json.JSONDecodeError as error:
        return f"invalid_json: {error.msg} at char {error.pos}"
    if not isinstance(obj, dict):
        return "not_json_object"
    expected = {"label", "confidence", "reasoning", "changed_elements"}
    if set(obj) != expected:
        return f"field_mismatch: missing={sorted(expected - set(obj))}, extra={sorted(set(obj) - expected)}"
    if obj["label"] not in ("added", "modified", "removed", "contradiction", "ambiguous", "unchanged"):
        return "invalid_label"
    confidence = obj["confidence"]
    if type(confidence) not in (int, float) or not math.isfinite(confidence) or not 0 <= confidence <= 1:
        return "invalid_confidence"
    if not isinstance(obj["reasoning"], str):
        return "invalid_reasoning"
    if not isinstance(obj["changed_elements"], list) or not all(
            isinstance(value, str) for value in obj["changed_elements"]):
        return "invalid_changed_elements"
    return None


def recover_diagnostic_label(raw: str) -> str | None:
    """Recover an unambiguous label for diagnosis, never for strict scoring."""
    labels = ("added", "modified", "removed", "contradiction", "ambiguous", "unchanged")
    text = raw.strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        obj = None
    if isinstance(obj, dict) and obj.get("label") in labels:
        return obj["label"]
    if isinstance(obj, str) and obj in labels:
        return obj
    pattern = r'(?:\{\s*)?(?:"label"\s*:\s*)?"?(' + "|".join(labels) + r')"?\s*\}?'
    match = re.fullmatch(pattern, text)
    return match.group(1) if match else None


def zip_member_info(name: str):
    info = zipfile.ZipInfo(name, date_time=(2026, 10, 8, 0, 0, 0))
    info.compress_type = zipfile.ZIP_STORED
    info.external_attr = 0o600 << 16
    return info


def copy_member(source_zip, source_name, target_zip, target_name):
    digest = hashlib.sha256()
    with source_zip.open(source_name) as source, target_zip.open(zip_member_info(target_name), "w", force_zip64=True) as target:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            target.write(chunk)
            digest.update(chunk)
    return digest.hexdigest()


def build(package_zip: Path, backup_zip: Path, output_zip: Path):
    if output_zip.exists() or not output_zip.parent.is_dir():
        raise FileExistsError("bundle output exists or its parent is missing")
    if sha256(package_zip) != PACKAGE_SHA256 or sha256(backup_zip) != BACKUP_SHA256:
        raise ValueError("source ZIP hash differs from the preserved run")

    with zipfile.ZipFile(package_zip) as package, zipfile.ZipFile(backup_zip) as backup:
        package_members = {name for name in package.namelist() if not name.endswith("/")}
        expected_package = {f"{PACKAGE}/{name}" for name in (
            "phase3j.py", "requirements.txt", "README.md", "P1.json",
            "training_config_v1.json", "acceptance_gate_v1.json",
            "reviewed_train_v1.json", "reviewed_development_v1.json",
            "package_manifest.json")}
        if package_members != expected_package:
            raise ValueError("training package member inventory differs")
        package_manifest = json.loads(package.read(f"{PACKAGE}/package_manifest.json"))
        if package_manifest["files"]["phase3j.py"] != TRAINING_SCRIPT_SHA256:
            raise ValueError("unexpected frozen training script")
        config = json.loads(package.read(f"{PACKAGE}/training_config_v1.json"))
        state = json.loads(backup.read(f"{BACKUP_ROOT}/checkpoint-180/trainer_state.json"))
        identity = json.loads(backup.read(f"{BACKUP_ROOT}/run_identity.json"))
        if (state.get("global_step") != 180 or state.get("best_global_step") != 60
                or state.get("best_model_checkpoint") != SELECTED_CHECKPOINT):
            raise ValueError("completed-run identity or checkpoint selection differs")
        for key, wanted in (("config_sha256", CONFIG_SHA256),
                            ("train_sha256", config["train_sha256"]),
                            ("development_sha256", config["development_sha256"]),
                            ("sealed_final_sha256", config["sealed_final_sha256"])):
            if identity.get(key) != wanted:
                raise ValueError(f"completed-run identity mismatch: {key}")
        if f"{BACKUP_ROOT}/checkpoint-60/adapter_model.safetensors" not in backup.namelist():
            raise ValueError("selected checkpoint adapter missing")

        files = {}
        with output_zip.open("xb") as raw, zipfile.ZipFile(raw, "w") as target:
            for source_name in sorted(expected_package):
                relative = source_name
                target_name = f"{BUNDLE}/{relative}"
                files[relative] = copy_member(package, source_name, target, target_name)
                filename = Path(source_name).name
                if filename in package_manifest["files"] and files[relative] != package_manifest["files"][filename]:
                    raise ValueError(f"package member hash mismatch: {filename}")
            for relative in RUN_FILES:
                source_name = f"{BACKUP_ROOT}/{relative}"
                if source_name not in backup.namelist():
                    raise ValueError(f"run member missing: {relative}")
                files[f"{RUN}/{relative}"] = copy_member(
                    backup, source_name, target, f"{BUNDLE}/{RUN}/{relative}")
            selected_hash = hashlib.sha256()
            with backup.open(f"{BACKUP_ROOT}/checkpoint-60/adapter_model.safetensors") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    selected_hash.update(chunk)
            if (files[f"{RUN}/best_adapter/adapter_model.safetensors"] != ADAPTER_SHA256
                    or selected_hash.hexdigest() != ADAPTER_SHA256):
                raise ValueError("saved adapter does not match selected checkpoint")
            own_bytes = Path(__file__).read_bytes()
            own_name = "probe_phase3j.py"
            files[own_name] = hashlib.sha256(own_bytes).hexdigest()
            target.writestr(zip_member_info(f"{BUNDLE}/{own_name}"), own_bytes)
            manifest = {
                "role": "DEVELOPMENT_ONLY_RAW_OUTPUT_PROBE",
                "source_package_sha256": PACKAGE_SHA256,
                "source_run_backup_sha256": BACKUP_SHA256,
                "selected_adapter_sha256": ADAPTER_SHA256,
                "selected_checkpoint": SELECTED_CHECKPOINT,
                "sealed_final_sha256_metadata_only": package_manifest["sealed_final_sha256_metadata_only"],
                "files": dict(sorted(files.items())),
            }
            target.writestr(zip_member_info(f"{BUNDLE}/probe_bundle_manifest.json"),
                            (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode())
    with zipfile.ZipFile(output_zip) as built:
        if built.testzip() is not None or set(built.namelist()) != {
                f"{BUNDLE}/{name}" for name in (*files, "probe_bundle_manifest.json")}:
            raise ValueError("built probe bundle failed ZIP validation")
    print(json.dumps({"status": "PROBE_BUNDLE_BUILT", "path": str(output_zip),
                      "bytes": output_zip.stat().st_size, "sha256": sha256(output_zip)}, indent=2))


def checked_bundle(bundle_dir: Path):
    if bundle_dir.name != BUNDLE:
        raise ValueError("unexpected probe bundle directory")
    manifest_path = bundle_dir / "probe_bundle_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (manifest.get("role") != "DEVELOPMENT_ONLY_RAW_OUTPUT_PROBE"
            or manifest.get("source_package_sha256") != PACKAGE_SHA256
            or manifest.get("source_run_backup_sha256") != BACKUP_SHA256
            or manifest.get("selected_adapter_sha256") != ADAPTER_SHA256
            or manifest.get("selected_checkpoint") != SELECTED_CHECKPOINT):
        raise ValueError("probe bundle manifest differs")
    expected_files = {f"{PACKAGE}/{name}" for name in (
        "phase3j.py", "requirements.txt", "README.md", "P1.json",
        "training_config_v1.json", "acceptance_gate_v1.json",
        "reviewed_train_v1.json", "reviewed_development_v1.json",
        "package_manifest.json")}
    expected_files.update(f"{RUN}/{name}" for name in RUN_FILES)
    expected_files.add("probe_phase3j.py")
    actual_files = {str(path.relative_to(bundle_dir)) for path in bundle_dir.rglob("*") if path.is_file()}
    if set(manifest["files"]) != expected_files or actual_files != expected_files | {"probe_bundle_manifest.json"}:
        raise ValueError("probe bundle contains missing or unexpected files")
    for relative, expected in manifest["files"].items():
        path = bundle_dir / relative
        if Path(relative).is_absolute() or ".." in Path(relative).parts or not path.is_file() or sha256(path) != expected:
            raise ValueError(f"probe bundle member mismatch: {relative}")
    if manifest["files"].get("probe_phase3j.py") != sha256(Path(__file__)):
        raise ValueError("probe script differs from bundle")
    package_dir = bundle_dir / PACKAGE
    frozen = load_training_module(package_dir / "phase3j.py")
    package_manifest, config, _, datasets = frozen.checked_inputs()
    if (frozen.sha256(package_dir / "phase3j.py") != TRAINING_SCRIPT_SHA256
            or frozen.sha256(package_dir / "training_config_v1.json") != CONFIG_SHA256
            or package_manifest["sealed_final_sha256_metadata_only"]
            != manifest["sealed_final_sha256_metadata_only"]):
        raise ValueError("frozen package identity differs")
    run_dir = bundle_dir / RUN
    identity = json.loads((run_dir / "run_identity.json").read_text(encoding="utf-8"))
    state = json.loads((run_dir / "checkpoint-180/trainer_state.json").read_text(encoding="utf-8"))
    for key, wanted in (("config_sha256", CONFIG_SHA256),
                        ("train_sha256", config["train_sha256"]),
                        ("development_sha256", config["development_sha256"]),
                        ("sealed_final_sha256", config["sealed_final_sha256"])):
        if identity.get(key) != wanted:
            raise ValueError(f"run identity mismatch: {key}")
    if (state.get("global_step") != 180 or state.get("best_global_step") != 60
            or state.get("best_model_checkpoint") != SELECTED_CHECKPOINT
            or frozen.sha256(run_dir / "best_adapter/adapter_model.safetensors") != ADAPTER_SHA256):
        raise ValueError("saved adapter or selected checkpoint mismatch")
    sample = select_development_sample(datasets["development"], frozen.LABELS)
    return frozen, config, run_dir, sample, manifest


def run(bundle_dir: Path, cache_dir: Path, output_dir: Path, dry_run: bool, gpu_preflight: bool):
    frozen, config, run_dir, sample, bundle_manifest = checked_bundle(bundle_dir)
    if output_dir.exists() or output_dir.with_suffix(".zip").exists():
        raise FileExistsError("probe output or ZIP already exists; refusing overwrite")
    if dry_run:
        print(json.dumps({"status": "PROBE_MODEL_FREE_PREFLIGHT_PASS",
                          "sample_ids": [row["id"] for row in sample],
                          "adapter_sha256": ADAPTER_SHA256}, indent=2))
        return
    if not cache_dir.is_dir() or not output_dir.parent.is_dir():
        raise ValueError("cache or output parent directory missing")

    visible = os.environ.get("CUDA_VISIBLE_DEVICES")
    os.environ["CUDA_VISIBLE_DEVICES"] = visible.split(",")[0] if visible else "0"
    runtime = frozen.runtime_preflight(config, output_dir, cache_dir)
    if gpu_preflight:
        print(json.dumps({"status": "PROBE_GPU_PREFLIGHT_PASS", "runtime": runtime,
                          "sample_ids": [row["id"] for row in sample]}, indent=2))
        return
    import torch
    from peft import PeftModel, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    random.seed(config["seed"])
    torch.manual_seed(config["seed"])
    torch.backends.cuda.matmul.allow_tf32 = False
    tokenizer = AutoTokenizer.from_pretrained(
        config["tokenizer"], revision=config["tokenizer_revision"],
        cache_dir=str(cache_dir), trust_remote_code=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                               bnb_4bit_use_double_quant=True,
                               bnb_4bit_compute_dtype=torch.float16)
    base = AutoModelForCausalLM.from_pretrained(
        config["base_model"], revision=config["base_revision"],
        cache_dir=str(cache_dir), quantization_config=quant,
        device_map={"": 0}, dtype=torch.float16, trust_remote_code=False)
    base.config.use_cache = False
    base = prepare_model_for_kbit_training(base, use_gradient_checkpointing=True)
    model = PeftModel.from_pretrained(base, str(run_dir / "best_adapter"), is_trainable=False)
    model.eval()

    p1 = frozen.read_json("P1.json")
    output = []
    for index, row in enumerate(sample, 1):
        tokens = tokenizer(frozen.prompt_for(row, p1), return_tensors="pt", add_special_tokens=False)
        tokens = {key: value.to("cuda:0") for key, value in tokens.items()}
        torch.cuda.synchronize()
        started = time.monotonic()
        with torch.inference_mode():
            generated = model.generate(**tokens, max_new_tokens=config["generation_max_new_tokens"],
                                       do_sample=False, pad_token_id=tokenizer.eos_token_id)
        torch.cuda.synchronize()
        elapsed = time.monotonic() - started
        generated_ids = generated[0, tokens["input_ids"].shape[1]:].tolist()
        raw = tokenizer.decode(generated_ids, skip_special_tokens=True)
        prediction = frozen.strict_prediction(raw)
        failure = parse_failure(raw)
        if (prediction is None) != (failure is not None):
            raise RuntimeError("diagnostic disagrees with frozen strict parser")
        stop_reason = ("eos_token" if generated_ids and generated_ids[-1] == tokenizer.eos_token_id
                       else "max_new_tokens" if len(generated_ids) == config["generation_max_new_tokens"]
                       else "other_or_unknown")
        output.append({"id": row["id"], "truth": row["review"]["reviewed_label"],
                       "raw_evaluation_text": raw,
                       "raw_with_special_tokens": tokenizer.decode(generated_ids, skip_special_tokens=False),
                       "generated_token_ids": generated_ids,
                       "prompt_token_count": int(tokens["input_ids"].shape[1]),
                       "generated_token_count": len(generated_ids),
                       "stop_reason_inferred": stop_reason,
                       "strict_prediction": prediction,
                       "diagnostic_label_if_recoverable": recover_diagnostic_label(raw),
                       "parse_failure": failure,
                       "latency_seconds": elapsed})
        print(f"Probe {index}/12: {row['id']} valid={prediction is not None}", flush=True)

    output_dir.mkdir(exist_ok=False)
    raw_path = output_dir / "raw_outputs.json"
    frozen.save_json(raw_path, output)
    evidence = {
        "status": "DEVELOPMENT_ONLY_RAW_OUTPUT_PROBE_NOT_FINAL_NOT_PROMOTED",
        "sample_ids": [row["id"] for row in sample],
        "valid_count": sum(row["strict_prediction"] is not None for row in output),
        "sample_count": len(output),
        "stop_reason_counts_inferred": dict(Counter(row["stop_reason_inferred"] for row in output)),
        "raw_outputs_sha256": frozen.sha256(raw_path),
        "probe_script_sha256": frozen.sha256(Path(__file__)),
        "bundle_manifest_sha256": frozen.sha256(bundle_dir / "probe_bundle_manifest.json"),
        "adapter_sha256": ADAPTER_SHA256,
        "source_run_backup_sha256": BACKUP_SHA256,
        "sealed_final_sha256_metadata_only": bundle_manifest["sealed_final_sha256_metadata_only"],
        "runtime": runtime,
        "generation": {"max_new_tokens": config["generation_max_new_tokens"],
                       "do_sample": False, "pad_token_id": tokenizer.eos_token_id,
                       "prompt": "unchanged frozen P1 assistant prompt"},
    }
    manifest_path = output_dir / "probe_manifest.json"
    frozen.save_json(manifest_path, evidence)
    zip_path = output_dir.with_suffix(".zip")
    with zipfile.ZipFile(zip_path, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in (raw_path, manifest_path):
            archive.write(path, arcname=f"{output_dir.name}/{path.name}")
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("probe evidence ZIP failed CRC validation")
    print(json.dumps({"status": evidence["status"], "valid_count": evidence["valid_count"],
                      "sample_count": len(output), "download_now": str(zip_path),
                      "zip_sha256": frozen.sha256(zip_path)}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    builder = sub.add_parser("build", help="build a small, private Kaggle upload bundle")
    builder.add_argument("--package-zip", required=True, type=Path)
    builder.add_argument("--backup-zip", required=True, type=Path)
    builder.add_argument("--output-zip", required=True, type=Path)
    probe = sub.add_parser("probe", help="run or model-free-check the frozen development probe")
    probe.add_argument("--bundle-dir", required=True, type=Path)
    probe.add_argument("--cache-dir", required=True, type=Path)
    probe.add_argument("--output-dir", required=True, type=Path)
    preflight = probe.add_mutually_exclusive_group()
    preflight.add_argument("--dry-run", action="store_true")
    preflight.add_argument("--gpu-preflight", action="store_true")
    args = parser.parse_args()
    if args.command == "build":
        build(args.package_zip, args.backup_zip, args.output_zip)
    else:
        run(args.bundle_dir, args.cache_dir, args.output_dir, args.dry_run, args.gpu_preflight)


if __name__ == "__main__":
    main()
