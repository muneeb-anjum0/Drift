#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

from local_model_utils import file_size_gb, gguf_f16_path, gguf_q4km_path, llama_cpp_dir, project_root


QUANTIZATION_TYPE = "Q4_K_M"


def find_quantizer(build_dir: Path) -> Path | None:
    for name in ["llama-quantize.exe", "quantize.exe", "llama-quantize", "quantize"]:
        matches = list(build_dir.rglob(name))
        if matches:
            return matches[0]
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Quantize DriftLedger F16 GGUF to Q4_K_M.")
    parser.add_argument("--force", action="store_true", help="Overwrite the existing Q4_K_M output.")
    args = parser.parse_args()

    root = project_root()
    f16 = gguf_f16_path(root)
    q4 = gguf_q4km_path(root)
    quantizer = find_quantizer(llama_cpp_dir(root) / "build")

    print(f"Input F16 GGUF: {f16}", flush=True)
    print(f"Output Q4_K_M GGUF: {q4}", flush=True)
    print(f"Quantization type: {QUANTIZATION_TYPE}", flush=True)

    if not f16.exists():
        raise SystemExit(f"F16 GGUF not found: {f16}. Run `python tools/convert_merged_to_gguf.py` first.")
    if q4.exists() and q4.stat().st_size > 0 and not args.force:
        print(f"Q4_K_M GGUF already exists: {q4}", flush=True)
        print(f"Q4_K_M file size: {file_size_gb(q4)} GB", flush=True)
        return
    if q4.exists() and args.force:
        q4.unlink()

    q4.parent.mkdir(parents=True, exist_ok=True)
    if quantizer:
        cmd = [str(quantizer), str(f16), str(q4), QUANTIZATION_TYPE]
    else:
        if not shutil.which("docker"):
            raise SystemExit(
                "llama.cpp quantizer not found and Docker is unavailable. "
                "Run `python tools/setup_llama_cpp.py`, or install Docker and rerun this script."
            )
        cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{root / 'models'}:/models",
            "ghcr.io/ggml-org/llama.cpp:full-cuda",
            "--quantize",
            "/models/gguf/DriftLedger-Qwen2.5-7B-F16.gguf",
            "/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf",
            QUANTIZATION_TYPE,
        ]

    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=root, check=True)
    if not q4.exists() or q4.stat().st_size == 0:
        raise SystemExit(f"Q4_K_M quantization failed; output missing or empty: {q4}")
    print(f"Q4_K_M GGUF created: {q4}", flush=True)
    print(f"Q4_K_M file size: {file_size_gb(q4)} GB", flush=True)


if __name__ == "__main__":
    main()
