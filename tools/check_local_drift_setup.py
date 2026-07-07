#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from local_model_utils import file_size_gb, gguf_q4km_path, project_root


ROOT = project_root()
Q4_CONTAINER_PATH = "/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
FORBIDDEN_STRINGS = [
    "hosted_api",
    "hf_adapter",
    "DRIFT_HOSTED_INFERENCE_URL",
    "DRIFT_HOSTED_INFERENCE_TOKEN",
    "DRIFT_ADAPTER_REPO",
    "DriftLedger-Qwen2.5-7B-" + "Q" + "3_K_M.gguf",
    "DRIFT_GGUF_" + "Q" + "3KM_PATH",
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
    if text not in file_path.read_text(encoding="utf-8", errors="ignore"):
        fail(f"{path} does not contain {text!r}", failures)
        return
    ok(f"{path} contains {text}")


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
            "DRIFT_GGUF_Q4KM_PATH=models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf",
            f"DRIFT_GGUF_MODEL_PATH={Q4_CONTAINER_PATH}",
        ]:
            if required not in text:
                fail(f"{env_file} does not contain {required}", failures)
        for forbidden in FORBIDDEN_STRINGS:
            if forbidden in text:
                fail(f"{env_file} still contains unsupported value {forbidden}", failures)
        ok(f"{env_file} Q4-only runtime paths checked")


def check_forbidden_project_strings(failures: list[str]) -> None:
    ignored_parts = {"node_modules", ".git", "__pycache__", "models", "dist"}
    ignored_files = {"package-lock.json", "check_local_drift_setup.py"}
    offenders: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.name in ignored_files or any(part in ignored_parts for part in path.parts):
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
        ok("no unsupported hosted/Q3 runtime references found")


def main() -> None:
    failures: list[str] = []
    q4_path = gguf_q4km_path(ROOT)
    q4_exists = q4_path.exists() and q4_path.stat().st_size > 0
    base_exists = (ROOT / "models/base/Qwen2.5-7B-Instruct").exists()
    print(f"Q4_K_M GGUF exists: {str(q4_exists).lower()}")
    print(f"Q4_K_M file size: {file_size_gb(q4_path)} GB")
    print(f"Base model folder exists: {str(base_exists).lower()} (not required for runtime)")
    if not q4_exists:
        fail("Q4_K_M GGUF is missing. Restore models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf before starting Docker.", failures)

    for path in [
        "services/inference/app.py",
        "services/inference/requirements.txt",
        "docker-compose.yml",
        ".env",
        ".env.example",
        "tools/evaluate_q4_quality.py",
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
