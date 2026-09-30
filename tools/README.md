# Tooling

Tooling is grouped by responsibility:

- `model/` builds and validates local model artifacts. These commands are never part of standard CI and may require large downloads or a GPU.
- `verification/` contains runtime smoke tests, product regression scripts, configuration checks, and explicit model evaluation.

Run scripts from the repository root so relative configuration and report paths resolve consistently. The supported day-to-day entrypoints remain the root `Makefile`; see `docs/verification.md`.
