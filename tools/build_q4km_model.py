#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.metadata
import importlib.util
import subprocess
import sys

from local_model_utils import (
    adapter_dir,
    base_model_dir,
    format_base_model_status,
    gguf_f16_path,
    gguf_q4km_path,
    merged_model_dir,
    project_root,
    validate_adapter,
    verify_base_model,
)


def merged_model_valid(path) -> bool:
    required = ["config.json", "tokenizer.json", "tokenizer_config.json"]
    return (
        path.exists()
        and all((path / name).exists() for name in required)
        and (any(path.glob("*.safetensors")) or (path / "model.safetensors.index.json").exists())
    )


def nonempty_file(path) -> bool:
    return path.exists() and path.is_file() and path.stat().st_size > 0


def check_python_dependencies() -> None:
    missing = [name for name in ["accelerate", "peft", "transformers", "safetensors"] if importlib.util.find_spec(name) is None]
    problems: list[str] = []
    if missing:
        problems.append("missing packages: " + ", ".join(missing))
    try:
        transformers_version = importlib.metadata.version("transformers")
        major = int(transformers_version.split(".", 1)[0])
        if major >= 5:
            problems.append(f"transformers {transformers_version} is installed, but the merge workflow expects transformers 4.x")
    except Exception:
        pass
    if problems:
        raise SystemExit(
            "Q4_K_M build dependencies are not ready: "
            + "; ".join(problems)
            + ". Install them with `python -m pip install -r tools/requirements-q3km.txt`."
        )


def run(script: str, *args: str) -> None:
    cmd = [sys.executable, script, *args]
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=project_root(), check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build DriftLedger Q4_K_M GGUF from the existing LoRA adapter.")
    parser.add_argument("--force", action="store_true", help="Re-run Q4 quantization even if output already exists.")
    args = parser.parse_args()
    root = project_root()
    check_python_dependencies()

    base_status = verify_base_model(base_model_dir(root))
    print(format_base_model_status(base_status), flush=True)
    if not base_status.complete:
        raise SystemExit("Base model is incomplete. Run `python tools/download_base_model.py` first.")
    adapter_ok, adapter_root, missing = validate_adapter(adapter_dir(root))
    if not adapter_ok:
        raise SystemExit(f"Adapter is incomplete at {adapter_root}. Missing: {', '.join(missing)}")

    if not args.force and nonempty_file(gguf_q4km_path(root)):
        print(f"Q4_K_M GGUF already exists: {gguf_q4km_path(root)}", flush=True)
        return

    if not merged_model_valid(merged_model_dir(root)):
        run("tools/merge_lora_to_base.py")
    else:
        print("Skipping merge; merged model already exists.", flush=True)

    run("tools/setup_llama_cpp.py")

    if not nonempty_file(gguf_f16_path(root)):
        run("tools/convert_merged_to_gguf.py")
    else:
        print("Skipping F16 GGUF conversion; output already exists.", flush=True)

    quantize_args = ["--force"] if args.force else []
    run("tools/quantize_gguf_q4km.py", *quantize_args)

    if not gguf_q4km_path(root).exists() or gguf_q4km_path(root).stat().st_size == 0:
        raise SystemExit("Q4_K_M GGUF was not created.")
    print(f"Q4_K_M GGUF ready: {gguf_q4km_path(root)}", flush=True)


if __name__ == "__main__":
    main()
