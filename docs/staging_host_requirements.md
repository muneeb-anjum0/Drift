# Staging Host Requirements

**Planning specification, not evidence of a deployed host.** No target staging host is available for Phase IV-C verification. Initial staging uses synthetic data only and the unchanged original GGUF, never the rejected Phase III-J candidate.

## Capacity derived from current artifacts

The original GGUF is 4,683,074,112 bytes (4.36 GiB); its required SHA-256 is `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. Local Docker image sizes observed during the rehearsal are approximately 1.22 GB llama.cpp, 1.18 GB Mongo 7, 251 MB inference, 116 MB Go API, and 76 MB frontend. These image sizes are not a bound on writable layers, logs, Mongo growth, or backup copies. The llama container has a 7 GiB memory limit and 8 GiB memory+swap limit in Compose.

| Resource | Minimum for an initial controlled rehearsal | Recommended for sustained staging | Verification on target |
| --- | --- | --- | --- |
| CPU | 4 usable cores | 8+ cores | `nproc`, synthetic prediction latency, CPU saturation. CPU-only llama.cpp is configured. |
| RAM | 12 GiB available to Docker, with swap permitted | 16–24 GiB and monitored swap | `free -h`, Docker stats during model load and concurrent API/Mongo activity; no OOM kills. The 7 GiB llama limit alone does not cover the other services or host. |
| Disk | 30 GiB free **after** OS/runtime installation | 60+ GiB, sized again for measured Mongo growth/retention | `df -h`, Docker storage location and backup filesystem. Allow for at least one 4.36 GiB model copy, current and previous images, Mongo volume, logs, and retained backups; double-space model replacement before swap. These are planning floors, not measured peak requirements. |
| Runtime | Docker Engine and Compose v2.24.4+ with `!override`/`!reset` | Pinned/tested Engine and Compose revisions | `docker version`, `docker compose version`, rendered config validation. |
| Network/TLS | Dedicated DNS name, valid certificate, restricted public 80/443 at external ingress; private internal Compose network | Host firewall, certificate renewal alerting, ingress access/error logs | Real HTTPS redirect, HSTS, origin, forwarded-IP and closed backend/inference/Mongo ports. Do not expose the loopback frontend directly. |
| Persistence/custody | Dedicated Mongo volume, original GGUF outside checkout, operator-owned backup directory | Encrypted off-host backup destination and restore-test sandbox | Volume mount, SHA before startup, archive/checksum/off-host retrieval and exact restore. |

The proposed ingress is a **separate** TLS reverse proxy on `staging-internal` at the configured `STAGING_TLS_PROXY_IP`; its upstreams are backend `:5000` for `/api/` and frontend `:80` for UI. The five existing services use distinct explicit IPs so this proxy IP remains available; do not use Docker `aux_addresses` for it. Check the proposed subnet does not overlap host/VPN/container networks. The ingress must overwrite untrusted `X-Forwarded-For` and terminate TLS; see [staging configuration](staging_configuration.md) and the [template](../deploy/staging-ingress.nginx.example.conf). The template is not a deployed ingress or certificate.

## Target-host acceptance sequence

1. Freeze a clean reviewed source SHA and immutable image digests; provision dedicated secrets, DNS, TLS, restricted network, Mongo volume, backup/off-host destinations, and a separately custodied original model copy.
2. Check exact model hash on the host and verify the read-only mount before starting llama.cpp. Reject a mismatch; do not relink a candidate.
3. Run the staging env preflight, Compose config check, service startup, schema/index check, HTTPS/CORS/proxy-IP probes, authenticated inference health, and a **synthetic** classification. Observe liveness versus readiness and logs.
4. Rehearse restore from the retained off-host archive and A→B→A rollback with actual reviewed images/config on that host. Verify monitoring delivery and restart detection.

Until a real target host completes these checks, target-host model load, public TLS, off-host custody, remote CI on the reviewed SHA, and staging rollback remain **BLOCKED**. Local rehearsal evidence must not be reported as target-host evidence.
