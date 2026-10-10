# Known Limitations

These constraints are deliberate or currently unverified. They should remain visible rather than being hidden behind architectural polish.

Actionable follow-up is tracked in the [GitHub issue backlog](https://github.com/muneeb-anjum0/Drift/issues). The current release sequence is repository consolidation, staging readiness, controlled deployment, operational validation, and production hardening; see the historical [Phase IV-A baseline](phase_iv_a_repository_and_release_readiness.md), [Phase IV-B assessment](phase_iv_b_release_candidate_readiness.md), current [Phase IV-C blocker report](phase_iv_c_release_blocker_remediation.md), and [staging gate](staging_readiness_gate.md). Older issue labels may describe historical plans rather than current authorization:

- **Historical Phase III:** [model artifact and quality baseline](https://github.com/muneeb-anjum0/Drift/issues/9) and [post-processing ablation](https://github.com/muneeb-anjum0/Drift/issues/15). Model research is now frozen; see [current status](model_research_status.md).
- **Before public hosting:** [real Firebase/GCS validation](https://github.com/muneeb-anjum0/Drift/issues/10), [hosted staging and rollback](https://github.com/muneeb-anjum0/Drift/issues/11), and [browser authentication storage review](https://github.com/muneeb-anjum0/Drift/issues/12).
- **When architecture requires:** [shared rate limiting](https://github.com/muneeb-anjum0/Drift/issues/13) and [stronger MongoDB atomicity](https://github.com/muneeb-anjum0/Drift/issues/14).
- **Maintenance:** [GitHub Actions runtime deprecations](https://github.com/muneeb-anjum0/Drift/issues/16).

- Browser JWTs use `localStorage`. This is accepted for the current local/demo deployment; public hosting needs a coordinated HttpOnly/Secure/SameSite cookie and CSRF design.
- Rate limits are process-local. Multi-instance deployment needs shared enforcement or an API gateway.
- Standalone MongoDB is intentional. Multi-collection cascades are retry-safe, not transactionally atomic.
- The backend report bind mount and upstream Mongo/Nginx images prevent a verified claim that every container runs as non-root.
- Real Firebase/Google Cloud Storage behavior is unverified without credentials and a disposable bucket. Never validate against production storage.
- Hosted TLS, reverse-proxy behavior, staging monitoring, and production load remain unverified.
- Model artifact reconstruction, checksums, output quality, and latency are separate from software verification and require suitable hardware. The original GGUF remains selected; the Phase III-J candidate is rejected and must not be promoted.
- `drift_postprocess.go` includes tested canonical rules for known model/evaluation domains. These compensate for model variability and should be reassessed using Phase III quality evidence, not removed during a structural refactor.
- The frontend project-detail page is large, but it currently composes one coupled project workflow from already separated feature components. Further extraction should follow a real independent workflow, not a line-count target.
- A dependency-level Starlette TestClient deprecation warning remains until the FastAPI/Starlette ecosystem migration is appropriate.
- Retrieval development data is synthetic and single-author. R5's suffix and alias vocabulary improves development recall but may be corpus-specific; no untouched Phase III-C final set exists.
- Baseline snapshots carry requirement status but do not define inactive/rejected exclusion. Historical version immutability and status filtering need a product-level contract before code changes.
- The original LoRA training examples, split, deduplication record, and annotator agreement remain unavailable, so retraining readiness and evaluation independence cannot be established.
