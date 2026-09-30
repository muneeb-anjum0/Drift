#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import os

from local_model_utils import gguf_f16_path, llama_cpp_dir, merged_model_dir, project_root


def main() -> None:
    root = project_root()
    merged = merged_model_dir(root)
    output = gguf_f16_path(root)
    temporary_output = output.with_suffix(output.suffix + ".tmp")
    convert = llama_cpp_dir(root) / "convert_hf_to_gguf.py"
    if not merged.exists():
        raise SystemExit(f"Merged model not found: {merged}. Run `python tools/merge_lora_to_base.py` first.")
    if not convert.exists():
        raise SystemExit(f"llama.cpp converter not found: {convert}. Run `python tools/setup_llama_cpp.py` first.")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_output.unlink(missing_ok=True)
    cmd = [sys.executable, str(convert), str(merged), "--outfile", str(temporary_output), "--outtype", "f16"]
    print("+ " + " ".join(cmd), flush=True)
    try:
        subprocess.run(cmd, cwd=root, check=True)
    except Exception:
        temporary_output.unlink(missing_ok=True)
        raise
    if not temporary_output.exists() or temporary_output.stat().st_size == 0:
        temporary_output.unlink(missing_ok=True)
        raise SystemExit(f"GGUF conversion failed; output missing or empty: {temporary_output}")
    os.replace(temporary_output, output)
    print(f"F16 GGUF created: {output}", flush=True)


if __name__ == "__main__":
    main()
