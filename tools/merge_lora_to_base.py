#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

import torch
try:
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ImportError as exc:
    raise SystemExit(
        "Missing merge dependency. Install with `python -m pip install -r tools/requirements-local-model.txt`."
    ) from exc

from local_model_utils import (
    base_model_dir,
    format_base_model_status,
    merged_model_dir,
    project_root,
    validate_adapter,
    verify_base_model,
)


def tokenizer_source(adapter_root: Path) -> Path:
    config_path = adapter_root / "tokenizer_config.json"
    if not config_path.exists():
        return adapter_root
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(config.get("extra_special_tokens"), list):
        return adapter_root
    tmp = tempfile.TemporaryDirectory(prefix="drift-merge-tokenizer-")
    target = Path(tmp.name)
    for name in ["tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "vocab.json", "merges.txt", "added_tokens.json"]:
        source = adapter_root / name
        if source.exists():
            shutil.copy2(source, target / name)
    config["additional_special_tokens"] = config.pop("extra_special_tokens")
    (target / "tokenizer_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    tokenizer_source._tmp = tmp  # type: ignore[attr-defined]
    return target


def validate_merged(output_dir: Path) -> None:
    required = ["config.json", "tokenizer.json", "tokenizer_config.json"]
    missing = [name for name in required if not (output_dir / name).exists()]
    shards = list(output_dir.glob("*.safetensors"))
    has_index = (output_dir / "model.safetensors.index.json").exists()
    if missing or (not shards and not has_index):
        raise SystemExit(
            "Merged model validation failed. "
            f"Missing: {', '.join(missing) or 'none'}; safetensors/index present: {bool(shards or has_index)}"
        )


def main() -> None:
    root = project_root()
    base_dir = base_model_dir(root)
    adapter_ok, adapter_root, adapter_missing = validate_adapter(root / "models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA")
    output_dir = merged_model_dir(root)

    status = verify_base_model(base_dir)
    print(format_base_model_status(status), flush=True)
    if not status.complete:
        raise SystemExit("Base model is incomplete. Run `python tools/download_base_model.py` first.")
    if not adapter_ok:
        raise SystemExit(f"Adapter is incomplete at {adapter_root}. Missing: {', '.join(adapter_missing)}")

    print("Merging LoRA into base model. This is not training; it may require more than 16GB RAM.", flush=True)
    print(f"Base: {base_dir}", flush=True)
    print(f"Adapter: {adapter_root}", flush=True)
    print(f"Output: {output_dir}", flush=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    dtype = torch.float16
    if not torch.cuda.is_available():
        print("CUDA is not available. CPU merge will use float16 to reduce RAM, but may still exceed 16GB.", flush=True)

    base_model = AutoModelForCausalLM.from_pretrained(
        str(base_dir),
        torch_dtype=dtype,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True,
        local_files_only=True,
        low_cpu_mem_usage=True,
    )
    model = PeftModel.from_pretrained(base_model, str(adapter_root), local_files_only=True)
    merged = model.merge_and_unload()
    merged.save_pretrained(str(output_dir), safe_serialization=True)

    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_source(adapter_root)), trust_remote_code=True, local_files_only=True)
    tokenizer.save_pretrained(str(output_dir))
    validate_merged(output_dir)
    print("Merged model saved successfully.", flush=True)


if __name__ == "__main__":
    main()
