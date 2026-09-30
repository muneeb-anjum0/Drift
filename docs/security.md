# Security Boundaries

Security policy is enforced by the Go backend. Browser state and model output are untrusted inputs.

## Trust boundaries

- **Browser to Go:** JWT middleware authenticates the caller. Service-layer authorization checks workspace membership and capability on every tenant-owned operation.
- **Go to FastAPI:** requests carry a separate `DRIFT_INFERENCE_API_KEY`; it must not equal the JWT secret. The inference service has no public product authority.
- **FastAPI to model:** generated JSON is bounded, parsed, normalized, and validated. The Go client validates it again before orchestration.
- **Go to MongoDB:** MongoDB is authoritative for tenant metadata and workflow state. Unique indexes and atomic updates protect concurrency invariants.
- **Go to object storage:** file names, sizes, extensions, signatures, and DOCX structure are checked before optional cloud storage. Metadata retains tenant ownership.

## Authorization policy

`server-go/internal/authorization/policy.go` is the central role/capability map. Handlers may shape responses, but services must enforce access. A valid resource identifier from another workspace must not reveal or mutate that resource.

## Secrets and local artifacts

Real credentials belong in ignored `.env` files or a deployment secret store. Model weights, recovered `Model/` material, cloud service-account JSON, caches, test recordings, and generated reports must not be committed or added to Docker contexts.

## Defensive controls

- fail-closed JWT and internal inference secrets;
- bounded authentication and inference rate limits;
- request timeouts and body limits;
- security response headers and explicit CORS configuration;
- model response length/count/type constraints;
- upload extension plus content-signature checks;
- explicit liveness/readiness separation;
- retry-safe deletion and compensation behavior.

Security regression coverage is summarized in [Verification](verification.md). Deployment limitations—including localStorage tokens, process-local limits, and unverified real cloud storage—are tracked in [Known Limitations](known-limitations.md).
