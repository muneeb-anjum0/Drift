# Phase V-B UI/UX Redesign

Status: implementation on `phase-v-b/ui-redesign`, pending full PR review. This document records the redesigned interface, not a model or deployment change. The Phase V-A [current-state audit](ui_ux_current_state.md) remains the pre-redesign reference.

## Product model and information architecture

The primary journey is **Project → Agreed scope → New change → What changed → Impact → Decision**. The application shell now emphasizes Home, Projects and (for owner/admin roles) Decisions; Workspaces, About & runtime, advanced evaluation and demo billing sit in the account menu. Existing URLs remain: `/dashboard`, `/projects`, `/projects/:projectId`, `/approvals`, `/workspaces`, `/settings`, `/evaluation`, `/billing`. The project page accepts old `?section=requirements|drift|changes|history|documents` links and maps them to the new Overview, Agreed scope, Changes, Decisions and More sections. New internal links use the new section names.

The landing page is shorter and begins with a concrete agreed-scope/new-request/proposed-difference example, not module cards, quantization or paid pricing. It states that the model service is locally configured and human review is required. The first-run dashboard chooses one project-dependent next action; the empty state opens project creation. A new project form asks first for workspace, project, client and original agreement, with secondary fields collapsed. Scope-item entry follows the same essential/advanced pattern.

## Semantics and workflow

“Scope snapshot” replaces misleading baseline-approval language. The confirmation dialog explicitly says it captures **all** current requirements, including proposed/rejected ones, without changing approval status. The comparison surface asks what the client said, checks inference readiness before enabling comparison, shows proposed differences with class names in human language, and places score/confidence/effort under technical details with heuristic caveats. A result must be saved before a change request can be prepared. A generated request is saved as a **draft**, not an approval. Request record state and approval decision are labeled separately. Owner/admin decision controls remain backed by server authorization.

The six backend labels remain unchanged: added, modified, removed, contradiction, ambiguous and unchanged. UI labels are “New requirement”, “Changed requirement”, “Requirement removed”, “Conflicts with agreement”, “Needs clarification” and “No meaningful change”. No analysis result is fabricated when inference is unavailable. Uploaded files remain supporting project records and do not automatically enter analysis. File upload is hidden when the backend storage capability is disabled, while existing file metadata remains readable.

## UX implementation notes

- The shell has labeled desktop and mobile navigation, a skip link, and an account menu. Project sections and forms use native controls where possible.
- Shared dialogs now expose `role=dialog`, accessible title/description, Escape closing, focus containment and focus return. Input validation/error association, status announcements, named password-reveal buttons and reduced-motion handling were improved.
- Loading, API-error and truly empty states are distinct on Home, Projects, Workspaces, project sections and Decisions. A failed query is never intentionally rendered as “no items”.
- Backend work is limited to read-only authenticated readiness/capability endpoints and exposing the current member role on workspace responses. No model weights, generation contract, authorization policy, data model, or acceptance gate changed.
- Role-aware UI hides mutation actions from viewers and approval actions from non-approvers. The API remains the authority; hiding a button is not an authorization mechanism.

## Intentional limitations and domain work

`UX_REQUIRES_DOMAIN_CHANGE`: the backend has no per-detected-change confirm/edit/dismiss lifecycle. The UI therefore calls analysis output a proposal, allows review and saving, and does not pretend a change was individually confirmed. A proper reviewed-change state would require a separate domain/API design.

`UX_REQUIRES_DOMAIN_CHANGE`: a scope snapshot is not formal acceptance of each requirement. If product policy requires signed/reviewed agreement, the snapshot alone cannot represent it. This redesign does **not** silently create an approval workflow or alter snapshot inclusion rules.

The project-level request draft can be edited before first save, but this phase does not create an inline per-change evidence editor or independently validate heuristic cost/effort. Existing evaluation remains in Advanced diagnostics, with the direct model sandbox moved there from the normal project journey. Billing remains a demo and BYOK is not implemented. The public landing example is illustrative, not a live model output.

## Verification boundary

Frontend lint, typecheck and production build were run locally. A logged-out Playwright route test passed; core-journey tests were rewritten for CI's existing no-model Compose setup. The local Go toolchain is absent, and the Docker reset left no app/Mongo containers running, so Go and authenticated browser journeys require exact-head CI. Compose configuration was parsed locally. Landing was rendered and inspected at 375px and 1440px; authenticated screens and other viewport sizes remain unverified locally. No GGUF, GPU or final-holdout access occurred. Full PR review is required before merge.
