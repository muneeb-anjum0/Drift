# Known Limitations

These constraints are deliberate or currently unverified. They should remain visible rather than being hidden behind architectural polish.

- Browser JWTs use `localStorage`. This is accepted for the current local/demo deployment; public hosting needs a coordinated HttpOnly/Secure/SameSite cookie and CSRF design.
- Rate limits are process-local. Multi-instance deployment needs shared enforcement or an API gateway.
- Standalone MongoDB is intentional. Multi-collection cascades are retry-safe, not transactionally atomic.
- The backend report bind mount and upstream Mongo/Nginx images prevent a verified claim that every container runs as non-root.
- Real Firebase/Google Cloud Storage behavior is unverified without credentials and a disposable bucket. Never validate against production storage.
- Hosted TLS, reverse-proxy behavior, staging monitoring, and production load remain unverified.
- Model artifact reconstruction, checksums, output quality, and latency are separate from software verification and require suitable hardware.
- `drift_postprocess.go` includes tested canonical rules for known model/evaluation domains. These compensate for model variability and should be reassessed using Phase III quality evidence, not removed during a structural refactor.
- The frontend project-detail page is large, but it currently composes one coupled project workflow from already separated feature components. Further extraction should follow a real independent workflow, not a line-count target.
- A dependency-level Starlette TestClient deprecation warning remains until the FastAPI/Starlette ecosystem migration is appropriate.
