#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import shutil
from pathlib import Path

from local_model_utils import file_size_gb, gguf_f16_path, gguf_q3km_path, llama_cpp_dir, project_root


def find_quantizer(build_dir: Path) -> Path | None:
    for name in ["llama-quantize.exe", "quantize.exe", "llama-quantize"]:
        matches = list(build_dir.rglob(name))
        if matches:
            return matches[0]
    return None


def main() -> None:
    root = project_root()
    f16 = gguf_f16_path(root)
    q3 = gguf_q3km_path(root)
    quantizer = find_quantizer(llama_cpp_dir(root) / "build")
    if not f16.exists():
        raise SystemExit(f"F16 GGUF not found: {f16}. Run `python tools/convert_merged_to_gguf.py` first.")
    q3.parent.mkdir(parents=True, exist_ok=True)
    if quantizer:
        cmd = [str(quantizer), str(f16), str(q3), "Q3_K_M"]
    else:
        if not shutil.which("docker"):
            raise SystemExit(
                "llama.cpp quantizer not found and Docker is unavailable. "
                "Install Visual Studio Build Tools and run `python tools/setup_llama_cpp.py`, or install Docker."
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
            "/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf",
            "Q3_K_M",
        ]
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=root, check=True)
    if not q3.exists() or q3.stat().st_size == 0:
        raise SystemExit(f"Q3_K_M quantization failed; output missing or empty: {q3}")
    print(f"Q3_K_M GGUF created: {q3}", flush=True)
    print(f"Q3_K_M file size: {file_size_gb(q3)} GB", flush=True)


if __name__ == "__main__":
    main()
