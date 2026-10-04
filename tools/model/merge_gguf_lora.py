#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path

from local_model_utils import base_gguf_f16_path, gguf_f16_path, llama_cpp_dir, lora_gguf_f16_path, project_root


def find_exporter(build_dir: Path) -> Path | None:
    for name in ("llama-export-lora.exe", "llama-export-lora"):
        matches = list(build_dir.rglob(name))
        if matches:
            return matches[0]
    return None


def validate_gguf(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 4:
        raise RuntimeError(f"GGUF output is missing or empty: {path}")
    with path.open("rb") as handle:
        if handle.read(4) != b"GGUF":
            raise RuntimeError(f"GGUF output has an invalid header: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge a GGUF LoRA into its GGUF base one tensor at a time.")
    parser.add_argument("--force", action="store_true", help="Rebuild the merged F16 GGUF atomically.")
    parser.add_argument("--threads", type=int, default=4, help="CPU merge threads (default: 4).")
    args = parser.parse_args()
    if args.threads < 1:
        parser.error("--threads must be at least 1")

    root = project_root()
    base = base_gguf_f16_path(root)
    adapter = lora_gguf_f16_path(root)
    output = gguf_f16_path(root)
    if not base.exists() or not adapter.exists():
        raise SystemExit("Base/LoRA GGUF inputs are missing. Run `python tools/model/convert_sources_to_gguf.py` first.")
    validate_gguf(base)
    validate_gguf(adapter)
    if output.exists() and not args.force:
        validate_gguf(output)
        print(f"Using existing validated merged GGUF: {output}", flush=True)
        return

    exporter = find_exporter(llama_cpp_dir(root) / "build")
    if not exporter:
        raise SystemExit("llama-export-lora is missing. Run `python tools/model/setup_llama_cpp.py` first.")
    temporary = output.with_suffix(output.suffix + ".tmp")
    if temporary.exists():
        raise SystemExit(f"Refusing to overwrite possible partial output: {temporary}")
    command = [
        str(exporter),
        "-m",
        str(base),
        "--lora",
        str(adapter),
        "-o",
        str(temporary),
        "-t",
        str(args.threads),
        "--device",
        "none",
        "--n-gpu-layers",
        "0",
    ]
    environment = os.environ.copy()
    environment["CUDA_VISIBLE_DEVICES"] = ""
    print("+ " + " ".join(command), flush=True)
    try:
        subprocess.run(command, cwd=root, env=environment, check=True)
        validate_gguf(temporary)
        os.replace(temporary, output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    print(f"Created merged F16 GGUF: {output}", flush=True)


if __name__ == "__main__":
    main()
