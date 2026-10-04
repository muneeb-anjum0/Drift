#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
Q4_CONTAINER_PATH = "/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
Q4_HOST_PATH = "models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"{path} is missing")
    return target.read_text(encoding="utf-8", errors="ignore")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    try:
        for path, needle in [
            ("tools/model/quantize_gguf_q4km.py", "Q4_K_M"),
            ("tools/model/build_q4km_model.py", "quantize_gguf_q4km.py"),
            ("tools/model/local_model_utils.py", "GGUF_Q4KM_RELATIVE"),
            ("tools/verification/evaluate_q4_quality.py", "Q4_K_M"),
        ]:
            require((ROOT / path).exists(), f"{path} is missing")
            require(needle in read(path), f"{path} does not contain {needle!r}")

        compose = read("docker-compose.yml")
        require(Q4_CONTAINER_PATH in compose, "docker-compose.yml does not default to Q4_K_M")
        require("--n-gpu-layers" in compose and "DRIFT_LLAMA_GPU_LAYERS:-0" in compose, "llama GPU layers are not pinned to zero")
        require("--device" in compose and "- none" in compose, "llama device offloading is not explicitly disabled")
        require("--parallel" in compose and "DRIFT_LLAMA_PARALLEL:-1" in compose, "llama concurrency is not pinned to one")

        env_example = read(".env.example")
        require(Q4_CONTAINER_PATH in env_example, ".env.example does not point Docker model path at Q4_K_M")
        require(Q4_HOST_PATH in env_example, ".env.example does not expose Q4_K_M host path")
        require("DRIFT_LLAMA_PARALLEL=1" in env_example, ".env.example does not pin llama concurrency to one")

        inference = read("services/inference/app.py") + read("services/inference/config.py")
        require("model_label" in inference and "quantization_label" in inference, "inference health lacks model metadata")
        require("Q4_K_M" in inference, "inference default does not mention Q4_K_M")
        require("base_model_required" in inference, "inference health does not clarify base model runtime requirement")

        frontend = "\n".join(
            read(path)
            for path in [
                "client/src/features/drift/DriftAnalysisPanel.tsx",
                "client/src/features/settings/settingsSections.ts",
                "client/src/pages/LandingPage.tsx",
            ]
        )
        require("Q4_K_M" in frontend, "frontend does not present the Q4_K_M runtime")

        docs = "\n".join(
            read(path)
            for path in [
                "README.md",
                "docs/development.md",
                "docs/model-pipeline.md",
                "docs/verification.md",
            ]
        )
        require("Q4_K_M" in docs, "docs do not mention Q4_K_M")
        require(("Q3" + "_K_M") not in docs, "docs still advertise the old runtime fallback")
    except AssertionError as exc:
        print(f"FAIL Q4_K_M config: {exc}", file=sys.stderr)
        return 1
    print("PASS Q4_K_M-only runtime config")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
