#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import site
from pathlib import Path

from local_model_utils import llama_cpp_dir, project_root


REPO_URL = "https://github.com/ggml-org/llama.cpp.git"
DEFAULT_LLAMA_CPP_REF = "b11151"


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd or project_root(), check=True)


def find_binary(build_dir: Path, names: list[str]) -> Path | None:
    for name in names:
        matches = list(build_dir.rglob(name))
        if matches:
            return matches[0]
    return None


def find_tool(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    executable_name = name if name.endswith(".exe") else f"{name}.exe"
    for scripts_dir in [
        Path(site.USER_BASE) / "Scripts",
        Path(site.USER_SITE).parent / "Scripts",
    ]:
        candidate = scripts_dir / executable_name
        if candidate.exists():
            return str(candidate)
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a pinned llama.cpp checkout and build its local tools.")
    parser.add_argument("--cuda", action="store_true", help="Build with CUDA support; the default build is CPU-only.")
    args = parser.parse_args()
    root = project_root()
    llama_dir = llama_cpp_dir(root)
    llama_ref = os.getenv("DRIFT_LLAMA_CPP_REF", DEFAULT_LLAMA_CPP_REF).strip()
    if not llama_ref:
        raise SystemExit("DRIFT_LLAMA_CPP_REF must not be empty.")
    vendor = llama_dir.parent
    vendor.mkdir(parents=True, exist_ok=True)

    if not llama_dir.exists():
        if not shutil.which("git"):
            raise SystemExit("Git is required to clone llama.cpp. Install Git and rerun this script.")
        run(["git", "clone", "--depth", "1", "--branch", llama_ref, REPO_URL, str(llama_dir)])
    else:
        status = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=no"],
            cwd=llama_dir,
            check=True,
            capture_output=True,
            text=True,
        )
        if status.stdout.strip():
            raise SystemExit(f"Refusing to replace modified llama.cpp checkout at {llama_dir}.")
        run(["git", "fetch", "--depth", "1", "origin", "tag", llama_ref], cwd=llama_dir)
        run(["git", "checkout", "--detach", "FETCH_HEAD"], cwd=llama_dir)
    print(f"llama.cpp ref: {llama_ref}", flush=True)

    convert = llama_dir / "convert_hf_to_gguf.py"
    if not convert.exists():
        raise SystemExit(f"Missing {convert}. The llama.cpp checkout may be incomplete.")

    build_dir = llama_dir / "build"
    cmake = find_tool("cmake")
    if not cmake:
        print("CMake not found. Install CMake and Visual Studio Build Tools with the C++ workload.", flush=True)
    else:
        build_dir.mkdir(parents=True, exist_ok=True)
        try:
            run(
                [cmake, "-S", str(llama_dir), "-B", str(build_dir), f"-DGGML_CUDA={'ON' if args.cuda else 'OFF'}"],
                cwd=root,
            )
            run([cmake, "--build", str(build_dir), "--config", "Release", "-j"], cwd=root)
        except subprocess.CalledProcessError as exc:
            raise SystemExit(
                "Could not build llama.cpp automatically. Install Visual Studio Build Tools with the C++ workload, "
                "then rerun this script. "
                f"Last error: {exc}"
            ) from exc

    quantize = find_binary(build_dir, ["llama-quantize.exe", "quantize.exe", "llama-quantize"])
    server = find_binary(build_dir, ["llama-server.exe", "server.exe", "llama-server"])
    print(f"convert_hf_to_gguf.py: {convert}", flush=True)
    print(f"quantizer: {quantize or 'not built yet'}", flush=True)
    print(f"llama server: {server or 'not built yet'}", flush=True)
    if not quantize or not server:
        print(
            "llama.cpp checkout is ready for conversion, but local binaries are missing. "
            "Quantization can still use the Docker fallback in tools/model/quantize_gguf_q4km.py.",
            flush=True,
        )


if __name__ == "__main__":
    main()
