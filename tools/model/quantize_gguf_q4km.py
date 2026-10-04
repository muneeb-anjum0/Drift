#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
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


def validate_gguf(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 4:
        raise RuntimeError(f"GGUF output is missing or empty: {path}")
    with path.open("rb") as handle:
        if handle.read(4) != b"GGUF":
            raise RuntimeError(f"GGUF output has an invalid header: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Quantize DriftLedger F16 GGUF to Q4_K_M.")
    parser.add_argument("--force", action="store_true", help="Overwrite the existing Q4_K_M output.")
    parser.add_argument("--threads", type=int, default=4, help="CPU quantization threads (default: 4).")
    args = parser.parse_args()
    if args.threads < 1:
        parser.error("--threads must be at least 1")

    root = project_root()
    f16 = gguf_f16_path(root)
    q4 = gguf_q4km_path(root)
    temporary_q4 = q4.with_suffix(q4.suffix + ".tmp")
    quantizer = find_quantizer(llama_cpp_dir(root) / "build")

    print(f"Input F16 GGUF: {f16}", flush=True)
    print(f"Output Q4_K_M GGUF: {q4}", flush=True)
    print(f"Quantization type: {QUANTIZATION_TYPE}", flush=True)

    if not f16.exists():
        raise SystemExit(f"F16 GGUF not found: {f16}. Run `python tools/model/merge_gguf_lora.py` first.")
    if q4.exists() and q4.stat().st_size > 0 and not args.force:
        validate_gguf(q4)
        print(f"Q4_K_M GGUF already exists: {q4}", flush=True)
        print(f"Q4_K_M file size: {file_size_gb(q4)} GB", flush=True)
        return
    q4.parent.mkdir(parents=True, exist_ok=True)
    if temporary_q4.exists():
        raise SystemExit(f"Refusing to overwrite possible partial output: {temporary_q4}")
    if quantizer:
        cmd = [str(quantizer), str(f16), str(temporary_q4), QUANTIZATION_TYPE, str(args.threads)]
    else:
        if not shutil.which("docker"):
            raise SystemExit(
                "llama.cpp quantizer not found and Docker is unavailable. "
                "Run `python tools/model/setup_llama_cpp.py`, or install Docker and rerun this script."
            )
        cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{root / 'models'}:/models",
            os.getenv("DRIFT_LLAMA_CPP_TOOLS_IMAGE", "ghcr.io/ggml-org/llama.cpp:full-b11151"),
            "--quantize",
            "/models/gguf/DriftLedger-Qwen2.5-7B-F16.gguf",
            f"/models/gguf/{temporary_q4.name}",
            QUANTIZATION_TYPE,
        ]

    print("+ " + " ".join(cmd), flush=True)
    environment = os.environ.copy()
    environment["CUDA_VISIBLE_DEVICES"] = ""
    try:
        subprocess.run(cmd, cwd=root, env=environment, check=True)
    except Exception:
        temporary_q4.unlink(missing_ok=True)
        raise
    validate_gguf(temporary_q4)
    os.replace(temporary_q4, q4)
    print(f"Q4_K_M GGUF created: {q4}", flush=True)
    print(f"Q4_K_M file size: {file_size_gb(q4)} GB", flush=True)


if __name__ == "__main__":
    main()
