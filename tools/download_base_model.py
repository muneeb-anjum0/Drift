#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

from huggingface_hub import hf_hub_download, snapshot_download

from local_model_utils import REPO_ID, base_model_dir, format_base_model_status, project_root, verify_base_model

METHOD_TIMEOUT_SECONDS = int(os.getenv("DRIFT_DOWNLOAD_METHOD_TIMEOUT_SECONDS", "900"))


def clear_locks(target: Path) -> None:
    download_cache = target / ".cache" / "huggingface" / "download"
    for lock in download_cache.glob("*.lock") if download_cache.exists() else []:
        try:
            lock.unlink()
        except OSError:
            pass


def run_command(cmd: list[str], env: dict[str, str] | None = None, timeout: int = METHOD_TIMEOUT_SECONDS) -> None:
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=project_root(), env=env, check=True, timeout=timeout)


def find_cli() -> str | None:
    for name in ("huggingface-cli.exe", "huggingface-cli", "hf.exe", "hf"):
        found = shutil.which(name)
        if found:
            return found
    scripts = Path(os.environ.get("APPDATA", "")) / "Python" / f"Python{sys.version_info.major}{sys.version_info.minor}" / "Scripts"
    for name in ("huggingface-cli.exe", "hf.exe"):
        candidate = scripts / name
        if candidate.exists():
            return str(candidate)
    return None


def verify_or_print(target: Path) -> bool:
    status = verify_base_model(target)
    print(format_base_model_status(status), flush=True)
    return status.complete


def method_snapshot(target: Path, token: str | None) -> None:
    # Run snapshot_download in a subprocess so a stalled transfer can time out and let later methods run.
    script = (
        "import os; "
        "os.environ.setdefault('HF_HUB_DISABLE_XET','1'); "
        "from huggingface_hub import snapshot_download; "
        "kw={'repo_id':'Qwen/Qwen2.5-7B-Instruct','local_dir':r'" + str(target) + "','token':os.environ.get('HF_TOKEN') or None}; "
        "\ntry:\n snapshot_download(**kw, local_dir_use_symlinks=False, resume_download=True)\n"
        "except TypeError:\n snapshot_download(**kw)\n"
    )
    env = os.environ.copy()
    if token:
        env["HF_TOKEN"] = token
    run_command([sys.executable, "-c", script], env=env)


def method_cli(target: Path, token: str | None, enable_fast_transfer: bool = False) -> None:
    cli = find_cli()
    if not cli:
        raise RuntimeError("huggingface-cli/hf executable was not found on PATH or in the Python user Scripts folder")
    env = os.environ.copy()
    if token:
        env["HF_TOKEN"] = token
    if enable_fast_transfer:
        env["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
    if Path(cli).name.startswith("hf"):
        cmd = [cli, "download", REPO_ID, "--local-dir", str(target)]
    else:
        cmd = [cli, "download", REPO_ID, "--local-dir", str(target)]
    run_command(cmd, env=env)


def method_missing_shards(target: Path, token: str | None) -> None:
    status = verify_base_model(target)
    if not status.expected_shards:
        raise RuntimeError("model.safetensors.index.json is missing or does not reference safetensors shards")
    missing = status.missing_shards or status.expected_shards
    print(f"Retrying shard files: {', '.join(missing)}", flush=True)
    for shard in missing:
        print(f"Downloading {shard}...", flush=True)
        script = (
            "import os; "
            "os.environ.setdefault('HF_HUB_DISABLE_XET','1'); "
            "from huggingface_hub import hf_hub_download; "
            f"hf_hub_download(repo_id='{REPO_ID}', filename='{shard}', local_dir=r'{target}', token=os.environ.get('HF_TOKEN') or None)"
        )
        env = os.environ.copy()
        if token:
            env["HF_TOKEN"] = token
        run_command([sys.executable, "-c", script], env=env)


def main() -> None:
    root = project_root()
    target = base_model_dir(root)
    target.mkdir(parents=True, exist_ok=True)
    token = os.getenv("HF_TOKEN") or None

    print(f"Project root: {root}", flush=True)
    print(f"Target: {target}", flush=True)
    if verify_or_print(target):
        return

    failures: list[tuple[str, str]] = []
    methods = [
        ("snapshot_download", lambda: method_snapshot(target, token)),
        ("huggingface-cli download", lambda: method_cli(target, token, enable_fast_transfer=False)),
        ("huggingface-cli download with hf_transfer", lambda: method_cli(target, token, enable_fast_transfer=True)),
        ("missing shard retry", lambda: method_missing_shards(target, token)),
    ]

    for name, method in methods:
        print(f"\n== {name} ==", flush=True)
        try:
            clear_locks(target)
            if name.endswith("hf_transfer"):
                try:
                    run_command([sys.executable, "-m", "pip", "install", "-U", "hf_transfer"])
                except Exception as exc:
                    print(f"hf_transfer install failed, trying download anyway: {exc}", flush=True)
            method()
        except Exception as exc:
            failures.append((name, str(exc)))
            print(f"{name} failed: {exc}", flush=True)
        if verify_or_print(target):
            return

    status = verify_base_model(target)
    print("\nAll download methods failed.", flush=True)
    for name, error in failures:
        print(f"- {name}: {error}", flush=True)
    print(format_base_model_status(status), flush=True)
    raise SystemExit(1)


if __name__ == "__main__":
    main()
