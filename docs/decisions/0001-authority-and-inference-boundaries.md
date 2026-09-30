# ADR 0001: Keep product authority in Go

- Status: accepted
- Date: 2026-09-30

## Context

Drift combines a browser application, business workflows, persistence, and a probabilistic local model. Authorization and durable state must not depend on browser behavior or generated output.

## Decision

The Go API is the only authoritative product boundary. React owns interaction, FastAPI adapts model execution, and llama.cpp executes weights. Go enforces tenancy, workflow transitions, validation, and persistence. The inference boundary uses a separate internal credential, and generated output is validated on both sides.

## Consequences

The browser and inference service remain replaceable without moving product rules. Some validation is intentionally duplicated across the inference trust boundary. Model failure can disable analysis while leaving unrelated workflows available.
