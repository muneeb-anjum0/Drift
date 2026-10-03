#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys

from local_model_utils import (
    adapter_dir,
    base_model_dir,
    format_base_model_status,
    gguf_q4km_path,
    project_root,
    validate_adapter,
    verify_base_model,
)


def valid_gguf_header(path) -> bool:
    if not path.is_file() or path.stat().st_size <= 4:
        return False
    with path.open("rb") as handle:
        return handle.read(4) == b"GGUF"


def run(script: str, *args: str) -> None:
    cmd = [sys.executable, script, *args]
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=project_root(), check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build DriftLedger Q4_K_M with the sequential, low-memory GGUF LoRA workflow."
    )
    parser.add_argument("--force", action="store_true", help="Rebuild all generated GGUF stages atomically.")
    args = parser.parse_args()
    root = project_root()

    base_status = verify_base_model(base_model_dir(root))
    print(format_base_model_status(base_status), flush=True)
    if not base_status.complete:
        raise SystemExit("Base model is incomplete. Run `python tools/model/download_base_model.py` first.")
    adapter_ok, adapter_root, missing = validate_adapter(adapter_dir(root))
    if not adapter_ok:
        raise SystemExit(f"Adapter is incomplete at {adapter_root}. Missing: {', '.join(missing)}")

    if not args.force and valid_gguf_header(gguf_q4km_path(root)):
        print(f"Q4_K_M GGUF already exists: {gguf_q4km_path(root)}", flush=True)
        return
    if gguf_q4km_path(root).exists() and not args.force:
        raise SystemExit(f"Existing Q4_K_M artifact is not a valid GGUF: {gguf_q4km_path(root)}")

    run("tools/model/setup_llama_cpp.py")
    stage_args = ["--force"] if args.force else []
    run("tools/model/convert_sources_to_gguf.py", *stage_args)
    run("tools/model/merge_gguf_lora.py", *stage_args)
    run("tools/model/quantize_gguf_q4km.py", *stage_args)

    if not gguf_q4km_path(root).exists() or gguf_q4km_path(root).stat().st_size == 0:
        raise SystemExit("Q4_K_M GGUF was not created.")
    print(f"Q4_K_M GGUF ready: {gguf_q4km_path(root)}", flush=True)


if __name__ == "__main__":
    main()
