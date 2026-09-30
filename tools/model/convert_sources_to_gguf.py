#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from local_model_utils import (
    adapter_dir,
    base_gguf_f16_path,
    base_model_dir,
    format_base_model_status,
    llama_cpp_dir,
    lora_gguf_f16_path,
    project_root,
    validate_adapter,
    verify_base_model,
)


def validate_gguf(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 4:
        raise RuntimeError(f"GGUF output is missing or empty: {path}")
    with path.open("rb") as handle:
        if handle.read(4) != b"GGUF":
            raise RuntimeError(f"GGUF output has an invalid header: {path}")


def convert_atomic(command: list[str], output: Path, force: bool) -> None:
    if output.exists() and not force:
        validate_gguf(output)
        print(f"Using existing validated GGUF: {output}", flush=True)
        return
    temporary = output.with_suffix(output.suffix + ".tmp")
    if temporary.exists():
        raise SystemExit(f"Refusing to overwrite possible partial output: {temporary}")
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [*command, str(temporary)]
    print("+ " + " ".join(command), flush=True)
    environment = os.environ.copy()
    environment["CUDA_VISIBLE_DEVICES"] = ""
    try:
        subprocess.run(command, cwd=project_root(), env=environment, check=True)
        validate_gguf(temporary)
        os.replace(temporary, output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    print(f"Created: {output}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Lazily convert the Qwen base and DriftLedger LoRA to F16 GGUF.")
    parser.add_argument("--force", action="store_true", help="Rebuild completed intermediate GGUF files atomically.")
    args = parser.parse_args()
    root = project_root()
    base = base_model_dir(root)
    adapter_ok, adapter, missing = validate_adapter(adapter_dir(root))
    status = verify_base_model(base)
    print(format_base_model_status(status), flush=True)
    if not status.complete:
        raise SystemExit("Base model is incomplete. Run `python tools/model/download_base_model.py` first.")
    if not adapter_ok:
        raise SystemExit(f"Adapter is incomplete at {adapter}. Missing: {', '.join(missing)}")

    llama_dir = llama_cpp_dir(root)
    base_converter = llama_dir / "convert_hf_to_gguf.py"
    lora_converter = llama_dir / "convert_lora_to_gguf.py"
    if not base_converter.exists() or not lora_converter.exists():
        raise SystemExit("llama.cpp converters are missing. Run `python tools/model/setup_llama_cpp.py` first.")

    convert_atomic(
        [sys.executable, str(base_converter), str(base), "--outtype", "f16", "--outfile"],
        base_gguf_f16_path(root),
        args.force,
    )
    convert_atomic(
        [
            sys.executable,
            str(lora_converter),
            str(adapter),
            "--base",
            str(base),
            "--outtype",
            "f16",
            "--outfile",
        ],
        lora_gguf_f16_path(root),
        args.force,
    )


if __name__ == "__main__":
    main()
