#!/usr/bin/env python3
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

from local_model_utils import (
    ADAPTER_DIR_RELATIVE,
    ADAPTER_ZIP_RELATIVE,
    REQUIRED_ADAPTER_FILES,
    base_model_dir,
    file_size_gb,
    format_base_model_status,
    gguf_q3km_path,
    gguf_q4km_path,
    merged_model_dir,
    project_root,
    verify_base_model,
)


ROOT = project_root()
ADAPTER_ZIP = ROOT / ADAPTER_ZIP_RELATIVE
ADAPTER_DIR = ROOT / ADAPTER_DIR_RELATIVE
FORBIDDEN_STRINGS = [
    "D:" + "\\MODELS",
    "D:" + "/MODELS",
    "/" + "models" + "-" + "base",
    "models" + "-" + "base",
    "hosted" + "_api",
    "hf" + "_adapter",
    "DRIFT" + "_HOSTED_INFERENCE_URL",
    "DRIFT" + "_HOSTED_INFERENCE_TOKEN",
    "DRIFT" + "_ADAPTER_REPO",
]


def ok(message: str) -> None:
    print(f"[ok] {message}")


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)
    print(f"[fail] {message}")


def contains(path: str, text: str, failures: list[str]) -> None:
    file_path = ROOT / path
    if not file_path.exists():
        fail(f"{path} is missing", failures)
        return
    if text not in file_path.read_text(encoding="utf-8"):
        fail(f"{path} does not contain {text!r}", failures)
        return
    ok(f"{path} contains {text}")


def resolve_adapter_root(adapter_dir: Path) -> Path:
    if all((adapter_dir / name).exists() for name in REQUIRED_ADAPTER_FILES):
        return adapter_dir
    candidates = [
        path.parent
        for path in adapter_dir.rglob("adapter_config.json")
        if all((path.parent / name).exists() for name in REQUIRED_ADAPTER_FILES)
    ]
    candidates.sort(key=lambda path: len(path.parts))
    return candidates[0] if candidates else adapter_dir


def check_adapter(failures: list[str]) -> None:
    if ADAPTER_ZIP.exists():
        ok(f"adapter zip exists at {ADAPTER_ZIP}")
    else:
        fail(f"adapter zip missing at {ADAPTER_ZIP}", failures)

    if ADAPTER_DIR.exists():
        adapter_root = resolve_adapter_root(ADAPTER_DIR)
        missing = sorted(name for name in REQUIRED_ADAPTER_FILES if not (adapter_root / name).exists())
        if missing:
            fail(f"extracted adapter missing files: {', '.join(missing)}", failures)
        else:
            ok(f"extracted adapter files found at {adapter_root}")
        return

    if not ADAPTER_ZIP.exists():
        return
    with zipfile.ZipFile(ADAPTER_ZIP) as archive:
        names = {Path(name).name for name in archive.namelist()}
    missing = sorted(REQUIRED_ADAPTER_FILES - names)
    if missing:
        fail(f"adapter zip cannot satisfy required files: {', '.join(missing)}", failures)
    else:
        ok("adapter folder is missing, but adapter zip can be extracted")


def check_env_paths(failures: list[str]) -> None:
    for env_file in [".env", ".env.example"]:
        path = ROOT / env_file
        if not path.exists():
            fail(f"{env_file} missing", failures)
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for required in [
            "DRIFT_MODEL_MODE=local",
            "DRIFT_LOCAL_ENGINE=gguf",
            "DRIFT_BASE_MODEL_PATH=models/base/Qwen2.5-7B-Instruct",
            "DRIFT_ADAPTER_ZIP_PATH=models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip",
            "DRIFT_ADAPTER_DIR=models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA",
            "DRIFT_GGUF_Q3KM_PATH=models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf",
            "DRIFT_GGUF_Q4KM_PATH=models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf",
        ]:
            if required not in text:
                fail(f"{env_file} does not contain {required}", failures)
        if (
            "DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf" not in text
            and "DRIFT_GGUF_MODEL_PATH=models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf" not in text
        ):
            fail(f"{env_file} does not point DRIFT_GGUF_MODEL_PATH at Q4_K_M by default", failures)
        for forbidden in FORBIDDEN_STRINGS:
            if forbidden in text:
                fail(f"{env_file} still contains forbidden value {forbidden}", failures)
        ok(f"{env_file} local-only paths checked")


def check_forbidden_project_strings(failures: list[str]) -> None:
    ignored_parts = {"node_modules", ".git", "__pycache__", "models"}
    offenders: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in ignored_parts for part in path.parts):
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".ico", ".lock"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for forbidden in FORBIDDEN_STRINGS:
            if forbidden in text:
                offenders.append(f"{path.relative_to(ROOT)} contains {forbidden}")
    if offenders:
        for offender in offenders:
            fail(offender, failures)
    else:
        ok("no forbidden hosted/D:\\MODELS references found")


def main() -> None:
    failures: list[str] = []
    local_engine = "unknown"
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("DRIFT_LOCAL_ENGINE="):
                local_engine = line.split("=", 1)[1].strip()
    print(f"Local engine: {local_engine}")
    status = verify_base_model(base_model_dir(ROOT))
    print(format_base_model_status(status))
    if status.complete:
        ok("base model is complete")
    else:
        fail("base model is incomplete", failures)

    check_adapter(failures)
    merged_exists = merged_model_dir(ROOT).exists()
    q3_path = gguf_q3km_path(ROOT)
    q4_path = gguf_q4km_path(ROOT)
    q3_exists = q3_path.exists() and q3_path.stat().st_size > 0
    q4_exists = q4_path.exists() and q4_path.stat().st_size > 0
    print(f"Merged model exists: {str(merged_exists).lower()}")
    print(f"Q3_K_M GGUF exists: {str(q3_exists).lower()}")
    print(f"Q3_K_M file size: {file_size_gb(q3_path)} GB")
    print(f"Q4_K_M GGUF exists: {str(q4_exists).lower()}")
    print(f"Q4_K_M file size: {file_size_gb(q4_path)} GB")
    if q3_exists and not q4_exists:
        print("[warn] Q3_K_M fallback exists, but Q4_K_M default is missing. Run `python tools/build_q4km_model.py`.")
    if local_engine == "gguf" and not q4_exists:
        fail("DRIFT_LOCAL_ENGINE=gguf but default Q4_K_M GGUF is missing. Run `python tools/build_q4km_model.py`.", failures)
    for path in [
        "services/inference/app.py",
        "services/inference/requirements.txt",
        "docker-compose.yml",
        ".env",
        ".env.example",
    ]:
        if (ROOT / path).exists():
            ok(f"{path} exists")
        else:
            fail(f"{path} missing", failures)

    check_env_paths(failures)
    contains("server-go/internal/modules/drift/drift_routes.go", "analyze", failures)
    contains("server-go/internal/modules/drift/inference_client.go", "predict-drift", failures)
    contains("client/src/features/drift/DriftAnalysisPanel.tsx", "Model sandbox", failures)
    contains("docker-compose.yml", "name: Drift", failures)
    contains("docker-compose.yml", "./models:/app/models", failures)
    contains("services/inference/app.py", "Only DRIFT_MODEL_MODE=local", failures)
    contains("services/inference/app.py", "local_engine", failures)
    check_forbidden_project_strings(failures)

    if failures:
        print("\nLocal Drift setup checks failed:")
        for item in failures:
            print(f"- {item}")
        sys.exit(1)
    print("\nLocal Drift setup checks passed.")


if __name__ == "__main__":
    main()
