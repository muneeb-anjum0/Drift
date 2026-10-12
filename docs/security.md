# Security Boundaries

Security policy is enforced by the Go backend. Browser state and model output are untrusted inputs.

## Trust boundaries

- **Browser to Go:** JWT middleware authenticates the caller. Service-layer authorization checks workspace membership and capability on every tenant-owned operation.
- **Go to FastAPI:** requests carry a separate `DRIFT_INFERENCE_API_KEY`; it must not equal the JWT secret. The inference service has no public product authority.
- **FastAPI to model:** generated JSON is bounded, parsed, normalized, and validated. The Go client validates it again before orchestration.
- **Go to MongoDB:** MongoDB is authoritative for tenant metadata and workflow state. Unique indexes and atomic updates protect concurrency invariants.
- **Go to object storage:** file names, sizes, extensions, signatures, and DOCX structure are checked before optional cloud storage. Metadata retains tenant ownership.
- **Go to external BYOK provider:** a workspace-owned encrypted credential can be used only after project/workspace authorization. The outbound endpoint is public HTTPS with connection-time IP policy, TLS verification, no redirects or proxy-environment bypass, and bounded response validation.

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

JWT and inference-key settings are required and independent. Workspace roles map to server-side capabilities; browser control visibility is not authorization. Rate limits are process-local. Trusted proxy CIDRs are explicit; forwarding headers from untrusted peers are ignored. CORS is explicit, and security response headers are applied. These controls are not a claim that the default localhost stack is safe for public exposure.

## BYOK credential and endpoint boundary

Only workspace owner/admin can test, configure, rotate, or delete an external provider; members can read safe metadata. Project analysis derives the workspace from the authorized persisted project, never from a caller-selected credential. The independent `DRIFT_PROVIDER_MASTER_KEY` is a base64-encoded 32-byte key held outside Mongo/Git. Saved provider keys use AES-256-GCM with a fresh nonce and versioned workspace/provider-bound authenticated data. Decryption failure or unknown key version fails closed; no key is returned to the browser or stored in a preview. Losing the master key makes existing ciphertext unusable. There is no automatic master-key rotation.

External endpoints must be canonical public-domain HTTPS on port 443, with no userinfo, query, fragment, redirect, IP literal, or private/self-hosted exception. The connection resolves and validates every A/AAAA address, rejects special-use destinations, dials an approved IP, and retains hostname-based SNI/certificate validation. Proxy environment variables and insecure TLS are not honored. This is enforced on both provider test and prediction. Never log provider key/header, raw config, request body, or raw response. See [model/providers](model-and-providers.md) for selection and failure behavior.

## Server-bound analysis persistence

`POST /api/v1/drift/analyze` yields an advisory preview, not an approved change. `POST /api/v1/drift/save` accepts **only** `{ "previewId": "<64 lowercase hex characters>" }`; unknown JSON fields are rejected. A crypto-random 256-bit ID addresses a Mongo preview bound to the analyzing user, authorized workspace/project, immutable baseline ID/version, exact input and hash, provider that actually ran, normalized result, and timestamps. Provider credentials never enter it. Mongo TTL removes abandoned previews after ten minutes, while save checks expiry independently. Save rechecks current write permission and baseline ownership, then atomically consumes the preview. Cross-user reuse, replay, expiry, and retargeting to a newer snapshot fail; persistence is built from the consumed server record, not browser-supplied analysis fields. If persistence fails after consumption, the caller must analyze again. Activity follows successful persistence.

The stored `analysisEngine` and `provenanceVersion=server_bound_v1` are server-owned; older records without that marker are **not** retroactively certified. Switching providers after analyze cannot rewrite execution provenance. A no-prediction retrieval path is marked `rule_based`. Change-request `generatedBy` derives from the persisted analysis even if the human edits draft content. Model output and provider metadata do not confer approval.

**Known residual race:** permission revocation after the final authorization check but before persistence is not transactionally serialized with save. This is documented, not fixed or silently treated as closed. A future change requires an explicit transaction/authorization design and tests.

## Deployment limitations

Browser JWTs use `localStorage` in the current local product; public hosting needs a coordinated cookie/CSRF design. Process-local rate limiting is not multi-instance enforcement. Standalone Mongo cascades are retry-safe but not transactionally atomic across collections. Real GCS behavior remains unverified without a disposable bucket. A host/Docker administrator can inspect local environment secrets and volumes. Protect `.env`, master keys, backups, and ignored model files; no public staging security claim follows from local tests.

Security regression coverage and commands are in [development](development.md) and `.github/workflows/verify.yml`. Operational prerequisites are in [deployment](deployment.md) and [operations](operations.md).
