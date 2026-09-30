# ADR 0002: Accept bounded single-instance deployment tradeoffs

- Status: accepted for the local/demo deployment
- Date: 2026-09-30

## Context

The current target is a reproducible local-first deployment using Docker Compose and standalone MongoDB. Distributed infrastructure would add operational complexity without improving the intended deployment today.

## Decision

Keep MongoDB as the system of record, process-local rate limiting, and retry-safe multi-collection cascades. Exclude large model execution from standard CI; verify its software boundary with mocks and run quality evaluation explicitly on suitable hardware.

## Consequences

Concurrent single-document transitions and baseline allocation are protected, but cascades are not cross-collection transactions. Horizontal scaling requires shared rate limiting and a deployment review. CI proves application behavior without claiming model quality or latency.
