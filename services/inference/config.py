from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


DEFAULT_GGUF_MODEL_PATH = Path("models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf")


def quantization_label(path: Path) -> str:
    if "Q4_K_M" in path.name.upper():
        return "Q4_K_M"
    return "GGUF"


def model_label(path: Path) -> str:
    quantization = quantization_label(path)
    if quantization == "GGUF":
        return "Qwen2.5-7B + DriftLedger LoRA (GGUF)"
    return f"Qwen2.5-7B + DriftLedger LoRA (GGUF {quantization})"


class Settings(BaseModel):
    model_mode: Literal["local"] = Field(default="local")
    local_engine: Literal["gguf", "peft"] = Field(default="gguf")
    base_model_path: Path = Field(default=Path("models/base/Qwen2.5-7B-Instruct"))
    adapter_zip_path: Path = Field(default=Path("models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip"))
    adapter_dir: Path = Field(default=Path("models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA"))
    max_new_tokens: int = Field(default=224)
    allow_cpu: bool = Field(default=False)
    gguf_model_path: Path = Field(default=DEFAULT_GGUF_MODEL_PATH)
    llama_server_url: str = Field(default="http://llama:8080")
    llama_ctx_size: int = Field(default=768)
    llama_gpu_layers: int = Field(default=16)
    llama_threads: int = Field(default=6)
    llama_max_tokens: int = Field(default=120)
    llama_timeout_seconds: float = Field(default=120)
    inference_api_key: str = Field(min_length=32)

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            model_mode=os.getenv("DRIFT_MODEL_MODE", "local"),
            local_engine=os.getenv("DRIFT_LOCAL_ENGINE", "gguf"),
            base_model_path=Path(os.getenv("DRIFT_BASE_MODEL_PATH", "models/base/Qwen2.5-7B-Instruct")),
            adapter_zip_path=Path(os.getenv("DRIFT_ADAPTER_ZIP_PATH", "models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA.zip")),
            adapter_dir=Path(os.getenv("DRIFT_ADAPTER_DIR", "models/adapters/DriftLedger_v5_qwen2.5_7b_LoRA")),
            max_new_tokens=int(os.getenv("DRIFT_MAX_NEW_TOKENS", "224")),
            allow_cpu=os.getenv("DRIFT_ALLOW_CPU", "false").lower() == "true",
            gguf_model_path=Path(os.getenv("DRIFT_GGUF_MODEL_PATH", str(DEFAULT_GGUF_MODEL_PATH))),
            llama_server_url=os.getenv("DRIFT_LLAMA_SERVER_URL", "http://llama:8080"),
            llama_ctx_size=int(os.getenv("DRIFT_LLAMA_CTX_SIZE", "768")),
            llama_gpu_layers=int(os.getenv("DRIFT_LLAMA_GPU_LAYERS", "16")),
            llama_threads=int(os.getenv("DRIFT_LLAMA_THREADS", "6")),
            llama_max_tokens=int(os.getenv("DRIFT_LLAMA_MAX_TOKENS", "120")),
            llama_timeout_seconds=float(os.getenv("DRIFT_LLAMA_TIMEOUT_SECONDS", "120")),
            inference_api_key=os.getenv("DRIFT_INFERENCE_API_KEY", "").strip(),
        )
