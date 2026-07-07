from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


REPO_ID = "Qwen/Qwen2.5-7B-Instruct"
MODEL_DIR_RELATIVE = Path("models/base/Qwen2.5-7B-Instruct")
ADAPTER_ZIP_RELATIVE = Path("models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip")
ADAPTER_DIR_RELATIVE = Path("models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA")
MERGED_MODEL_RELATIVE = Path("models/merged/DriftLedger-Qwen2.5-7B-Merged")
GGUF_F16_RELATIVE = Path("models/gguf/DriftLedger-Qwen2.5-7B-F16.gguf")
GGUF_Q4KM_RELATIVE = Path("models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf")
LLAMA_CPP_RELATIVE = Path("tools/vendor/llama.cpp")
REQUIRED_BASE_FILES = {
    "config.json",
    "generation_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "model.safetensors.index.json",
}
REQUIRED_ADAPTER_FILES = {
    "adapter_config.json",
    "adapter_model.safetensors",
    "tokenizer.json",
    "tokenizer_config.json",
}


@dataclass
class BaseModelStatus:
    complete: bool
    target: Path
    required_missing: list[str]
    expected_shards: list[str]
    missing_shards: list[str]
    shard_count: int
    expected_shard_count: int
    total_size_gb: float
    error: str = ""


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def base_model_dir(root: Path | None = None) -> Path:
    return (root or project_root()) / MODEL_DIR_RELATIVE


def adapter_dir(root: Path | None = None) -> Path:
    return (root or project_root()) / ADAPTER_DIR_RELATIVE


def adapter_zip(root: Path | None = None) -> Path:
    return (root or project_root()) / ADAPTER_ZIP_RELATIVE


def merged_model_dir(root: Path | None = None) -> Path:
    return (root or project_root()) / MERGED_MODEL_RELATIVE


def gguf_f16_path(root: Path | None = None) -> Path:
    return (root or project_root()) / GGUF_F16_RELATIVE


def gguf_q4km_path(root: Path | None = None) -> Path:
    return (root or project_root()) / GGUF_Q4KM_RELATIVE


def llama_cpp_dir(root: Path | None = None) -> Path:
    return (root or project_root()) / LLAMA_CPP_RELATIVE


def folder_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def expected_shards_from_index(target: Path) -> tuple[list[str], str]:
    index_path = target / "model.safetensors.index.json"
    if not index_path.exists():
        return [], ""
    try:
        data = json.loads(index_path.read_text(encoding="utf-8"))
        shards = sorted({name for name in data.get("weight_map", {}).values() if str(name).endswith(".safetensors")})
        return shards, ""
    except Exception as exc:
        return [], f"could not read model.safetensors.index.json: {exc}"


def verify_base_model(target: Path) -> BaseModelStatus:
    required_missing = sorted(name for name in REQUIRED_BASE_FILES if not (target / name).exists())
    expected_shards, error = expected_shards_from_index(target)
    actual_shards = sorted(path.name for path in target.glob("*.safetensors"))
    missing_shards = sorted(name for name in expected_shards if not (target / name).exists())
    complete = not required_missing and bool(expected_shards) and not missing_shards and not error
    return BaseModelStatus(
        complete=complete,
        target=target,
        required_missing=required_missing,
        expected_shards=expected_shards,
        missing_shards=missing_shards,
        shard_count=len(actual_shards),
        expected_shard_count=len(expected_shards),
        total_size_gb=round(folder_size_bytes(target) / (1024**3), 2),
        error=error,
    )


def format_base_model_status(status: BaseModelStatus) -> str:
    lines = [
        f"Base model complete: {str(status.complete).lower()}",
        f"Target: {status.target}",
        f"Safetensors shards found: {status.shard_count}/{status.expected_shard_count}",
        f"Total folder size: {status.total_size_gb} GB",
    ]
    if status.required_missing:
        lines.append(f"Missing required files: {', '.join(status.required_missing)}")
    if status.missing_shards:
        lines.append(f"Missing shard files: {', '.join(status.missing_shards)}")
    if status.error:
        lines.append(f"Index error: {status.error}")
    return "\n".join(lines)


def resolve_adapter_root(path: Path) -> Path:
    if all((path / name).exists() for name in REQUIRED_ADAPTER_FILES):
        return path
    candidates = [
        item.parent
        for item in path.rglob("adapter_config.json")
        if all((item.parent / name).exists() for name in REQUIRED_ADAPTER_FILES)
    ]
    candidates.sort(key=lambda candidate: len(candidate.parts))
    return candidates[0] if candidates else path


def validate_adapter(path: Path) -> tuple[bool, Path, list[str]]:
    root = resolve_adapter_root(path)
    missing = sorted(name for name in REQUIRED_ADAPTER_FILES if not (root / name).exists())
    return not missing, root, missing


def file_size_gb(path: Path) -> float:
    return round(path.stat().st_size / (1024**3), 2) if path.exists() else 0.0
