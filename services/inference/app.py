from __future__ import annotations

import secrets
import threading
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status

from services.inference.config import Settings, model_label, quantization_label
from services.inference.contracts import DriftPrediction, PredictRequest
from services.inference.runtime import ModelRuntime, cuda_available, llama_health


settings = Settings.from_env()
runtime = ModelRuntime(settings)


def start_model_load() -> None:
    def load_in_background() -> None:
        runtime.loading = True
        try:
            runtime.load()
        except Exception as exc:
            runtime.load_error = str(exc)
        finally:
            runtime.loading = False

    threading.Thread(target=load_in_background, name="drift-model-loader", daemon=True).start()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_model_load()
    yield


app = FastAPI(
    title="DriftLedger Local Inference Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def require_internal_api_key(
    x_drift_inference_key: str | None = Header(default=None),
) -> None:
    if x_drift_inference_key is None or not secrets.compare_digest(
        x_drift_inference_key,
        settings.inference_api_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid inference service credential.",
        )


@app.get("/live", dependencies=[Depends(require_internal_api_key)])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health", dependencies=[Depends(require_internal_api_key)])
def health(response: Response) -> dict[str, Any]:
    llama = llama_health(settings)
    gguf_ready = settings.local_engine != "gguf" or bool(llama["connected"])
    service_status = (
        "ok"
        if runtime.loaded and gguf_ready
        else "loading"
        if runtime.loading or llama["status"] == "loading"
        else "error"
    )
    if service_status != "ok":
        response.status_code = 503
    return {
        "status": service_status,
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


@app.post(
    "/predict-drift",
    response_model=DriftPrediction,
    dependencies=[Depends(require_internal_api_key)],
)
async def predict_drift(request: PredictRequest) -> DriftPrediction:
    if runtime.loading and not runtime.loaded:
        raise HTTPException(status_code=503, detail="Model is still loading.")
    if runtime.load_error and not runtime.loaded:
        raise HTTPException(status_code=503, detail=runtime.load_error)
    return await runtime.predict(request)
