# Model and Analysis Providers

Drift's Go pipeline owns authorization, full-snapshot comparison orchestration, normalization, impact presentation, and persistence. The inference-provider abstraction supplies a **proposed** six-class relationship for a selected requirement and new client text. Neither a local model nor an external provider can decide permissions, baseline ownership, change-request state, or any business mutation.

```mermaid
flowchart LR
  Input[New client input] --> Go[Go: authorize project and select scope snapshot]
  Go --> Retrieval[Score and order every saved requirement]
  Retrieval --> Provider{Compare each requirement with workspace provider}
  Provider -->|default local| FastAPI[Keyed FastAPI]
  FastAPI --> Llama[llama.cpp / original GGUF]
  Provider -->|opt-in external| HTTPS[OpenAI-compatible HTTPS adapter]
  Llama --> Normalize[Go validation and normalization]
  HTTPS --> Normalize
  Normalize --> Preview[Server-bound advisory preview]
  Preview --> Human[Explicit human save / later decision]
```

## Supported model and current contract

The only supported local artifact is `ai_model/artifacts/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf`, 4,683,074,112 bytes, SHA-256 `11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9`. It is ignored by Git and must come from authorized custody; no public download URL is promised. The normal Compose stack starts **without** llama.cpp. Model operation is optional for project/scope workflows but necessary for local AI comparison. CPU startup and optional GPU overlay are in [development](development.md). The rejected Phase III-J candidate must never be mounted under the original path.

The semantic task is one of `added`, `modified`, `removed`, `contradiction`, `ambiguous`, `unchanged`. New external BYOK calls request and strictly parse only `{"label":"<canonical>"}`. The model supplies no confidence, reasoning, or changed elements. Go uses the stored requirement and input to construct an advisory preview; impact and effort remain explicit application heuristics. New saved external analyses carry `server_bound_label_only_v2` provenance. Previously saved analyses remain readable with their original fields and provenance. The original local FastAPI/Go path still uses its four-field contract until a separately validated local-model migration. No result implies automatic approval or that every displayed label came from a model.

## Workspace selection and credential lifecycle

No workspace provider record means local mode. Workspace owners/admins can choose OpenAI, Google Gemini, DeepSeek, or another public HTTPS endpoint that implements OpenAI-compatible Chat Completions and JSON output. The named choices fill a fixed endpoint; the user supplies a model ID and the key issued by that provider. A ChatGPT subscription is not an OpenAI API key. The backend tests a synthetic case before saving the encrypted key and routes later analyses through that saved workspace choice. Other providers need a compatible API; arbitrary provider-specific protocols are not accepted. Members see only safe metadata. The project is loaded and authorized first, then its persisted workspace selects the provider. A request-supplied workspace ID never selects credentials. The browser acknowledges that selected requirement text and new client input will leave the local machine in online mode.

Saving an online provider is one action: the server tests the key and model with synthetic text, then encrypts and saves only after success. Switching to local mode pauses online routing while retaining the encrypted provider settings. Switching back tests the saved connection before reactivating it; a failed test leaves local mode active. The separate “Forget provider and key” action permanently deletes the saved configuration. Settings shows whether a key is saved without displaying the key itself.

The key crosses the browser's own network request once during connection test and save. The Go service encrypts it with AES-GCM and a separate `DRIFT_PROVIDER_MASTER_KEY` before Mongo storage; provider reads return only metadata, never the key or ciphertext. Responses use `Cache-Control: no-store`. The key is cleared from the form after save. Someone operating the browser can inspect the key while typing it or inspect their own request in developer tools, so this is not a way to hide a key from its owner or a compromised browser. Use HTTPS for access beyond localhost and protect the master key separately from Mongo backups.

For Gemini, Settings suggests text model IDs with a Standard API free tier listed in [Google's pricing table](https://aistudio.google.com/docs/pricing): `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, and `gemini-3-flash-preview`. Availability and quotas depend on the Google project. Google says free-tier content may be used to improve its products, so the provider choice must be made with the project's data policy in mind.

The independent base64-encoded 32-byte `DRIFT_PROVIDER_MASTER_KEY` enables external mode; local mode needs no such key. The backend encrypts saved API keys using AES-256-GCM with a fresh nonce and workspace/provider-bound authenticated data. Ciphertext, nonce and version—not plaintext—reside in Mongo. The key stays outside Git and must be separately backed up; losing it makes saved credentials unusable. Saved keys are never returned. Replacement tests the new key before atomic ciphertext replacement; switching to local/delete clears the external credential, not historical analyses. Master-key rotation requires a separately reviewed migration; unknown versions and decryption failures fail closed.

## External endpoint and result boundary

The adapter accepts only canonical public-domain HTTPS URLs on port 443, without userinfo, query, fragment, redirects, or IP-literal host. It appends only the fixed `/chat/completions` path. Proxy environment variables and insecure TLS are not honored. Every connection re-resolves A/AAAA, rejects special-use/private/loopback/link-local/metadata addresses, and dials an approved resolved IP while retaining the hostname for SNI and certificate verification. This protects test and inference against redirect/DNS-rebinding SSRF. Private self-hosted endpoints are intentionally unsupported in this initial BYOK mode.

Provider responses are size/schema/label bounded, normalized, and validated before reaching Go's advisory preview. Prompt text is untrusted data, not instructions with authority over HTTP targets, tools, files, or workflow. The selected provider's failure returns a sanitized error and **never silently falls back** to local or rule-based inference. No failed provider response becomes a saved analysis. Analysis provenance records the provider that actually executed, even if workspace selection later changes; no-prediction retrieval is marked `rule_based`. Direct diagnostic routes remain local-only. Secrets and raw provider request/response bodies must not enter logs or preview records.

## Scope-level comparison and uncertainty

Drift splits a client message into requests and checks each request against **every** requirement in the selected saved snapshot. Deterministic relevance orders those calls and helps reject weak pairwise claims, but does not omit requirements. An existing requirement classified as changed, removed, or contradicted remains linked to that exact baseline item. If no existing item accounts for the request and the full pass yields an `added` relationship, Drift proposes **one** unanchored new requirement for that request. The drift score is a transparent heuristic over those proposed changes and their impact; it is not a measure of contractual truth.

Pairwise labels cannot mathematically prove absence from a natural-language agreement. A near-restatement of saved wording that conflicts with an `added` label, or otherwise inconsistent evidence, becomes **Needs scope review** instead of a fabricated addition. Review-required results have no model confidence, added effort, or drift-score contribution and cannot generate a change request. Users should review proposed additions and affected existing requirements before deciding. There is still no formal per-change confirm/dismiss workflow.

Read [security](security.md) for preview binding, replay prevention, and authorization; [research history](research-history.md) for why the rejected label-only candidate does not replace the original; and [architecture](architecture.md) for the full workflow.
