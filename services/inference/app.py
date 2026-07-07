from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
import threading
import zipfile
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError, field_validator

try:
    import torch
except ImportError:  # pragma: no cover
    torch = None

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
except ImportError:  # pragma: no cover
    AutoModelForCausalLM = AutoTokenizer = BitsAndBytesConfig = None

try:
    from peft import PeftModel
except ImportError:  # pragma: no cover
    PeftModel = None


LABELS = {"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"}
DEFAULT_GGUF_MODEL_PATH = Path("models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf")


def cuda_available() -> bool:
    return bool(torch is not None and torch.cuda.is_available())


def quantization_label(path: Path) -> str:
    name = path.name.upper()
    if "Q4_K_M" in name:
        return "Q4_K_M"
    return "GGUF"


def model_label(path: Path) -> str:
    quant = quantization_label(path)
    if quant == "GGUF":
        return "Qwen2.5-7B + DriftLedger LoRA (GGUF)"
    return f"Qwen2.5-7B + DriftLedger LoRA (GGUF {quant})"


def llama_health(settings: "Settings") -> dict[str, Any]:
    if settings.local_engine != "gguf":
        return {"connected": None, "status": None, "error": None}
    url = settings.llama_server_url.rstrip("/") + "/health"
    try:
        response = httpx.get(url, timeout=2)
        if response.status_code == 200:
            return {"connected": True, "status": "ok", "error": None}
        detail = response.text[:300]
        status = "loading" if response.status_code == 503 and "Loading model" in detail else "error"
        return {"connected": False, "status": status, "error": detail}
    except httpx.HTTPError as exc:
        return {"connected": False, "status": "error", "error": str(exc)}


REQUIRED_ADAPTER_FILES = {
    "adapter_config.json",
    "adapter_model.safetensors",
    "tokenizer.json",
    "tokenizer_config.json",
}
REQUIRED_BASE_FILES = {
    "config.json",
    "generation_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "model.safetensors.index.json",
}

SYSTEM_PROMPT = (
    "You are DriftLedger, a requirement drift analysis model. Compare the baseline "
    "requirement with the new client message. Classify the new message as exactly "
    "one of: added, modified, removed, contradiction, ambiguous, unchanged. Return "
    "only valid JSON with fields: label, confidence, reasoning, changed_elements."
)


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
        )


class PredictRequest(BaseModel):
    baseline_requirement: str = Field(min_length=1, max_length=12000)
    new_client_message: str = Field(min_length=1, max_length=12000)

    @field_validator("baseline_requirement", "new_client_message")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class DriftPrediction(BaseModel):
    label: Literal["added", "modified", "removed", "contradiction", "ambiguous", "unchanged"]
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    changed_elements: list[str] = Field(default_factory=list)


class ModelRuntime:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.tokenizer: Any | None = None
        self.model: Any | None = None
        self.adapter_path: Path | None = None
        self._tokenizer_tmp: tempfile.TemporaryDirectory[str] | None = None
        self.loaded = False
        self.loading = False
        self.load_error = ""

    def load(self) -> None:
        if self.settings.model_mode != "local":
            raise RuntimeError("Only DRIFT_MODEL_MODE=local is supported in this build.")
        if self.settings.local_engine == "gguf":
            if not self.settings.gguf_model_path.exists():
                raise RuntimeError(
                    f"{quantization_label(self.settings.gguf_model_path)} GGUF not found at {self.settings.gguf_model_path}. "
                    "Restore models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf or rebuild it with `python tools/build_q4km_model.py`."
                )
            self.loaded = True
            return
        if PeftModel is None or AutoModelForCausalLM is None or AutoTokenizer is None or BitsAndBytesConfig is None or torch is None:
            raise RuntimeError("PEFT dependencies are not installed; GGUF mode does not require them.")
        self._validate_base_model(self.settings.base_model_path)
        adapter_path = self._prepare_adapter()
        self.adapter_path = adapter_path

        if not cuda_available() and not self.settings.allow_cpu:
            raise RuntimeError(
                "CUDA GPU is not available. Qwen2.5-7B local inference is usually unrealistic on CPU. "
                "Install NVIDIA GPU support for Docker, or set DRIFT_ALLOW_CPU=true only for experiments."
            )

        tokenizer_source = self._prepare_tokenizer_source(adapter_path)
        self.tokenizer = AutoTokenizer.from_pretrained(
            str(tokenizer_source),
            trust_remote_code=True,
            local_files_only=True,
        )
        model_kwargs: dict[str, Any] = {
            "device_map": "auto",
            "trust_remote_code": True,
            "local_files_only": True,
        }
        if cuda_available():
            model_kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
        else:
            model_kwargs["torch_dtype"] = torch.float32

        base = AutoModelForCausalLM.from_pretrained(str(self.settings.base_model_path), **model_kwargs)
        self.model = PeftModel.from_pretrained(base, str(adapter_path), local_files_only=True)
        self.model.eval()
        self.loaded = True

    def _prepare_adapter(self) -> Path:
        self.settings.adapter_dir.parent.mkdir(parents=True, exist_ok=True)
        if not self.settings.adapter_dir.exists():
            if not self.settings.adapter_zip_path.exists():
                raise RuntimeError(
                    f"Adapter zip not found at {self.settings.adapter_zip_path}. "
                    "Place DriftLedger_v5_qwen2.5_7b_LoRA.zip there or set DRIFT_ADAPTER_ZIP_PATH."
                )
            with zipfile.ZipFile(self.settings.adapter_zip_path) as archive:
                archive.extractall(self.settings.adapter_dir)
        adapter_root = self._resolve_adapter_root(self.settings.adapter_dir)
        self._validate_adapter(adapter_root)
        return adapter_root

    def _prepare_tokenizer_source(self, adapter_path: Path) -> Path:
        config_path = adapter_path / "tokenizer_config.json"
        if not config_path.exists():
            return adapter_path
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return adapter_path
        if not isinstance(config.get("extra_special_tokens"), list):
            return adapter_path

        self._tokenizer_tmp = tempfile.TemporaryDirectory(prefix="drift-tokenizer-")
        target = Path(self._tokenizer_tmp.name)
        for pattern in [
            "tokenizer.json",
            "tokenizer_config.json",
            "special_tokens_map.json",
            "vocab.json",
            "merges.txt",
            "added_tokens.json",
        ]:
            source = adapter_path / pattern
            if source.exists():
                shutil.copy2(source, target / pattern)

        config["additional_special_tokens"] = config.pop("extra_special_tokens")
        (target / "tokenizer_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
        return target

    @staticmethod
    def _validate_base_model(base_dir: Path) -> None:
        if not base_dir.exists():
            raise RuntimeError(
                f"Base model folder not found at {base_dir}. Run `python tools/download_base_model.py` first."
            )
        missing = sorted(name for name in REQUIRED_BASE_FILES if not (base_dir / name).exists())
        expected_shards: list[str] = []
        index_error = ""
        index_path = base_dir / "model.safetensors.index.json"
        if index_path.exists():
            try:
                index_data = json.loads(index_path.read_text(encoding="utf-8"))
                expected_shards = sorted(
                    {str(name) for name in index_data.get("weight_map", {}).values() if str(name).endswith(".safetensors")}
                )
            except Exception as exc:
                index_error = f"could not read model.safetensors.index.json: {exc}"
        missing_shards = sorted(name for name in expected_shards if not (base_dir / name).exists())
        if missing or index_error or not expected_shards or missing_shards:
            details = []
            if missing:
                details.append(f"missing files: {', '.join(missing)}")
            if index_error:
                details.append(index_error)
            if not expected_shards:
                details.append("model.safetensors.index.json does not reference safetensors shards")
            if missing_shards:
                details.append(f"missing shard files: {', '.join(missing_shards)}")
            raise RuntimeError(
                f"Base model at {base_dir} is incomplete ({'; '.join(details)}). "
                "Run `python tools/download_base_model.py` to resume the download."
            )

    @staticmethod
    def _validate_adapter(adapter_dir: Path) -> None:
        missing = sorted(name for name in REQUIRED_ADAPTER_FILES if not (adapter_dir / name).exists())
        if missing:
            raise RuntimeError(f"Extracted adapter at {adapter_dir} is missing required files: {', '.join(missing)}")

    @staticmethod
    def _resolve_adapter_root(adapter_dir: Path) -> Path:
        if all((adapter_dir / name).exists() for name in REQUIRED_ADAPTER_FILES):
            return adapter_dir
        candidates = [
            path
            for path in adapter_dir.rglob("adapter_config.json")
            if all((path.parent / name).exists() for name in REQUIRED_ADAPTER_FILES)
        ]
        if not candidates:
            return adapter_dir
        candidates.sort(key=lambda path: len(path.parent.parts))
        return candidates[0].parent

    async def predict(self, request: PredictRequest) -> DriftPrediction:
        if self.settings.local_engine == "gguf":
            return await self._predict_gguf(request)
        if not self.loaded or self.model is None or self.tokenizer is None:
            raise HTTPException(status_code=503, detail="Model is not loaded.")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Baseline requirement:\n"
                    f"{request.baseline_requirement}\n\n"
                    "New client message:\n"
                    f"{request.new_client_message}\n\n"
                    'Return JSON like {"label":"unchanged","confidence":0.95,"reasoning":"...","changed_elements":[]}.'
                ),
            },
        ]
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
        with torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                max_new_tokens=self.settings.max_new_tokens,
                do_sample=False,
                temperature=None,
                top_p=None,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        output_ids = generated[0][inputs.input_ids.shape[-1] :]
        raw = self.tokenizer.decode(output_ids, skip_special_tokens=True)
        return parse_prediction(raw)

    async def _predict_gguf(self, request: PredictRequest) -> DriftPrediction:
        prompt = qwen_prompt(request)
        payload = {
            "prompt": prompt,
            "n_predict": self.settings.llama_max_tokens,
            "temperature": 0,
            "top_p": 1,
            "stop": ["<|im_end|>", "<|im_start|>"],
        }
        url = self.settings.llama_server_url.rstrip("/") + "/completion"
        async with httpx.AsyncClient(timeout=self.settings.llama_timeout_seconds) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail=f"llama.cpp inference request failed: {exc}") from exc
        try:
            data = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="llama.cpp returned a non-JSON response.") from exc
        raw = data.get("content") or data.get("response") or data.get("text") or ""
        return parse_prediction(str(raw))


def qwen_prompt(request: PredictRequest) -> str:
    return (
        "<|im_start|>system\n"
        f"{SYSTEM_PROMPT}\n"
        "<|im_end|>\n"
        "<|im_start|>user\n"
        "Baseline requirement:\n"
        f"{request.baseline_requirement}\n\n"
        "New client message:\n"
        f"{request.new_client_message}\n\n"
        'Return JSON like {"label":"unchanged","confidence":0.95,"reasoning":"...","changed_elements":[]}.\n'
        "<|im_end|>\n"
        "<|im_start|>assistant\n"
    )


def parse_prediction(raw: str) -> DriftPrediction:
    candidates = [raw]
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        candidates.append(match.group(0))
    for candidate in candidates:
        try:
            return normalize_payload(json.loads(candidate))
        except (json.JSONDecodeError, TypeError, ValidationError, ValueError):
            continue
    raise HTTPException(status_code=502, detail="Model returned malformed JSON that could not be normalized.")


def normalize_payload(payload: Any) -> DriftPrediction:
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        payload = payload["data"]
    if isinstance(payload, dict) and "prediction" in payload and isinstance(payload["prediction"], dict):
        payload = payload["prediction"]
    if not isinstance(payload, dict):
        raise ValueError("prediction payload must be an object")
    label = str(payload.get("label", "")).strip().lower()
    if label not in LABELS:
        raise ValueError(f"invalid label: {label}")
    confidence = payload.get("confidence", 0)
    if isinstance(confidence, (int, float)) and confidence > 1:
        confidence = confidence / 100
    changed = payload.get("changed_elements", [])
    if isinstance(changed, str):
        changed = [changed]
    return DriftPrediction.model_validate(
        {
            "label": label,
            "confidence": confidence,
            "reasoning": str(payload.get("reasoning", "")),
            "changed_elements": [str(item) for item in changed if str(item).strip()],
        }
    )


settings = Settings.from_env()
runtime = ModelRuntime(settings)
app = FastAPI(title="DriftLedger Local Inference Service", version="1.0.0")


@app.on_event("startup")
def load_model() -> None:
    def load_in_background() -> None:
        runtime.loading = True
        try:
            runtime.load()
        except Exception as exc:
            runtime.load_error = str(exc)
        finally:
            runtime.loading = False

    threading.Thread(target=load_in_background, name="drift-model-loader", daemon=True).start()


@app.get("/health")
def health() -> dict[str, Any]:
    llama = llama_health(settings)
    gguf_ready = settings.local_engine != "gguf" or bool(llama["connected"])
    status = "ok" if runtime.loaded and gguf_ready else "loading" if runtime.loading or llama["status"] == "loading" else "error"
    return {
        "status": status,
        "model_mode": settings.model_mode,
        "local_engine": settings.local_engine,
        "base_model_path": None if settings.local_engine == "gguf" else str(settings.base_model_path).replace("\\", "/"),
        "base_model_required": settings.local_engine != "gguf",
        "adapter_path": None if settings.local_engine == "gguf" else str((runtime.adapter_path or settings.adapter_dir)).replace("\\", "/"),
        "adapter_required": settings.local_engine != "gguf",
        "gguf_model_path": str(settings.gguf_model_path).replace("\\", "/"),
        "model_label": model_label(settings.gguf_model_path),
        "quantization_label": quantization_label(settings.gguf_model_path),
        "llama_server_url": settings.llama_server_url,
        "llama_connected": llama["connected"],
        "llama_status": llama["status"],
        "llama_error": llama["error"],
        "cuda_available": cuda_available(),
        "model_loaded": runtime.loaded and gguf_ready,
        "error": runtime.load_error or None,
    }


@app.post("/predict-drift", response_model=DriftPrediction)
async def predict_drift(request: PredictRequest) -> DriftPrediction:
    if runtime.loading and not runtime.loaded:
        raise HTTPException(status_code=503, detail="Model is still loading.")
    if runtime.load_error and not runtime.loaded:
        raise HTTPException(status_code=503, detail=runtime.load_error)
    return await runtime.predict(request)
