# AI model boundary

`inference/` is the FastAPI service. `tooling/` contains the original-model download and conversion scripts. `artifacts/` is the local mount source for weights and adapters; only its placeholder files are versioned. Docker mounts it as `/app/models`, so container configuration still uses that path.

The original GGUF is distributed separately and must pass the hash check in `scripts/install-original-model.sh`. The rejected Phase III-J adapter is research-only. Training data and frozen evaluation evidence remain in `evaluation/`; moving the application folders does not reopen those records.
