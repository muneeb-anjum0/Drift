# Drift productization direction

## Product value and current scope

Drift remains a local-first system for Project → Agreed scope → New change → Proposed impact → Human decision. The Go API owns authorization and workflow state. The optional analysis provider suggests an interpretation; it cannot approve scope or changes. There is no hosted SaaS conversion in this phase.

## BYOK economics

External provider credentials belong to the customer's workspace. The customer pays their provider directly for usage. Drift neither sells nor bundles AI tokens. The local model remains usable without an external key. External analysis sends selected project text to the configured provider, so it is an explicit privacy choice.

## Free and paid possibilities

The implemented local distribution includes core projects, requirements, scope snapshots, change workflow, human decisions, local-model support, and workspace BYOK configuration. No paywall or entitlement enforcement is implemented. Calling BYOK “Pro-only” in a cloneable Apache-licensed repository without a real licensing/product decision would be misleading.

A later commercial offering could charge for an official supported distribution, managed updates, support, separately developed premium integrations, or team operations. Those are possibilities, not shipped features or purchase promises. A future entitlement service would be separate from workspace roles and provider credentials: it would answer which Drift features an installation may use, not which model analyzes a workspace. Frontend hiding is not an enforcement mechanism.

## Pricing and billing

Price: **TBD**. No "$5" price is authorized. There is no payment processing in this phase. The existing billing route remains explicitly a demo and must not present a purchasable plan.

## Open-source and licensing decision

The repository contains an Apache License 2.0 `LICENSE`. Its permissions include use and redistribution subject to its terms; see the [official license text](https://www.apache.org/licenses/LICENSE-2.0.html). An official paid offering cannot assume that a client-side switch prevents users of the cloneable code from using included features. **LICENSING_DECISION_REQUIRED** before defining a paid edition, commercial terms, trademarks, redistribution packaging, or enforcement. This document is product planning, not legal advice, and does not change the license.

## Non-goals and future hosted option

No token resale, fake subscription, hard-coded price, cloud-hosted Drift, multi-provider routing, or automatic provider fallback. A hosted product might be evaluated later with separate tenancy, secret custody, compliance, reliability, and commercial design; this phase does not claim it exists.
