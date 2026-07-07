#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
Q4_CONTAINER_PATH = "/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
Q3_CONTAINER_PATH = "/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf"
Q4_HOST_PATH = "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
Q3_HOST_PATH = "models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf"


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"{path} is missing")
    return target.read_text(encoding="utf-8", errors="ignore")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    checks = [
        ("tools/quantize_gguf_q4km.py", "Q4_K_M"),
        ("tools/build_q4km_model.py", "quantize_gguf_q4km.py"),
        ("tools/local_model_utils.py", "GGUF_Q4KM_RELATIVE"),
    ]
    try:
        for path, needle in checks:
            require((ROOT / path).exists(), f"{path} is missing")
            require(needle in read(path), f"{path} does not contain {needle!r}")

        compose = read("docker-compose.yml")
        require(Q4_CONTAINER_PATH in compose, "docker-compose.yml does not default to Q4_K_M")
        require("${DRIFT_GGUF_MODEL_PATH:-" in compose, "docker-compose.yml does not keep DRIFT_GGUF_MODEL_PATH override")

        env_example = read(".env.example")
        require(Q4_CONTAINER_PATH in env_example, ".env.example does not point Docker model path at Q4_K_M")
        require(Q3_HOST_PATH in env_example, ".env.example no longer exposes Q3_K_M fallback path")
        require(Q4_HOST_PATH in env_example, ".env.example does not expose Q4_K_M host path")

        inference = read("services/inference/app.py")
        require("quantization_label" in inference and "model_label" in inference, "inference health lacks model metadata helpers")
        require("Q4_K_M" in inference, "inference default does not mention Q4_K_M")
        require("Q3_K_M fallback" in inference, "inference error does not mention Q3 fallback")

        frontend = read("client/src/features/drift/DriftAnalysisPanel.tsx")
        require("VITE_DRIFT_MODEL_LABEL" in frontend, "frontend model label is not configurable")
        require("GGUF Q4_K_M" in frontend, "frontend default model label is not Q4_K_M")

        docs = "\n".join(read(path) for path in ["README.md", "docs/docker.md", "docs/local_model_setup.md", "docs/model_inference.md", "docs/runtime_testing.md"])
        require("Q4_K_M" in docs, "docs do not mention Q4_K_M")
        require("Q3_K_M" in docs, "docs do not mention Q3_K_M fallback")
    except AssertionError as exc:
        print(f"FAIL Q4_K_M config: {exc}", file=sys.stderr)
        return 1
    print("PASS Q4_K_M default config with Q3_K_M fallback")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
