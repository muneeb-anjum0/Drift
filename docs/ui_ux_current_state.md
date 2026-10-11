# Drift UI/UX Current State

Source snapshot: `18cd3e0ca5af685ad86ac2128abef93a9c1241cc` (`main`); product status `LOCAL_DISTRIBUTION_READY`. Phase V-A is discovery only. This report describes implemented behavior, not a redesign specification. The original local GGUF remains the selected production model; the rejected Phase III-J candidate is research only. No model or sealed final holdout was used for this audit.

## 1. Product Model

Drift is a local-first scope-control workspace: record a project's requirements, snapshot them as a baseline, compare later client text with that snapshot, inspect proposed changes, and prepare an approval-tracked change request. The Go API owns authentication, tenancy, persistence, and authorization; the local inference runtime supplies advisory drift classifications when available. The application remains useful for workspace/project/requirement/file management when inference is absent, although its central comparison step then cannot run. [README](../README.md), [server modules](../server-go/internal/modules), [client routes](../client/src/routes/AppRoutes.tsx).

| Concept | Implemented meaning and boundary |
| --- | --- |
| Workspace | Tenant/container with name, slug, owner, membership and member roles; registration creates one default workspace. It separates projects, files and activity. There is no frontend membership manager. |
| Project | Belongs to a workspace; stores client, scope, status, priority, deadline, requirements, versions, analyses, requests and files. |
| Requirement | Mutable title/description plus type, priority, status, source/source text, acceptance criteria, tags and estimated effort. It can be entered manually or added from heuristic text extraction. |
| Baseline | Numbered immutable snapshot of **all** project requirements at creation, even if an individual requirement is still proposed or rejected. Creation requires owner/admin authority, but is not a separate reviewed approval workflow. Later edits do not rewrite older snapshots. |
| New/client input | Text pasted as a client message, meeting note, scope update, document text or other input; the baseline and selected text feed analysis. Uploaded files do not automatically become analysis input. |
| Drift result | Advisory comparison with six labels: `added`, `modified`, `removed`, `contradiction`, `ambiguous`, `unchanged`; raw/presented results can include confidence, reasoning and changed elements, plus a heuristic score/risk, class counts, relevant/ignored requirements and estimated extra hours. These figures are not independently verified facts. |
| Change request | Editable draft generated from a **saved** analysis, with narrative, client, timeline/cost impacts, recommendation, requested changes, general status and a distinct approval status/history. It can be submitted and decided by authorized roles. |
| Files/evidence | Project-level uploaded document or image metadata and optional public URL. Storage may be disabled by configuration. Files are not linked as first-class evidence to a particular requirement, analysis or request. |
| Activity/history | Cross-workspace recent activity, requirement-version history, saved analysis history and approval decision history. Activity logging is best effort, not a guaranteed forensic audit trail. |

`estimatedEffort` on a requirement has no clear unit in its form. Drift `estimatedExtraHours`, impact and effort are derived through service-side heuristics, not reviewed ground truth. Roles are owner/admin/member/viewer: owner/admin have approval authority; member can read/write ordinary project content; viewer can read. See [authorization policy](../server-go/internal/authorization/policy.go), [requirement service](../server-go/internal/modules/requirement), [drift service](../server-go/internal/modules/drift).

## 2. Route Map

Three named public routes, eight authenticated routes and one public catch-all exist. There is no frontend role-specific route guard: `ProtectedRoute` checks session presence, while the API enforces capability checks. Project `?section=` selections are panels within one route, not additional routes. Sources: [route tree](../client/src/routes/AppRoutes.tsx), [protected guard](../client/src/routes/ProtectedRoute.tsx), [pages](../client/src/pages).

| URL → component | Auth / role | Purpose; primary and secondary actions | Data / states |
| --- | --- | --- | --- |
| `/` → `LandingPage` | No / n.a. | Explain product; Open Workspace, Create Account; billing, demo, repository and mail links. | Static. No fetch, loading or API error. |
| `/login` → `LoginPage`/`LoginForm` | No / n.a. | Sign in; switch to registration. | `POST /auth/login`, auth bootstrap; inline credential/network error and submit loading. |
| `/register` → `RegisterPage`/`RegisterForm` | No / n.a. | Register; switch to login. | Registration API, default-workspace creation; field checks, inline error, submit loading. |
| `/dashboard` → `DashboardPage` | Yes / all members | Read overview; Open Projects, Evaluation, Workspaces; expand activity. | Workspaces/projects/activity queries; whole-page spinner; empty states only for empty arrays; query errors can resemble emptiness. |
| `/workspaces` → `WorkspacesPage` | Yes / all; mutations require API capability | List, create, edit, delete workspaces. | Workspace query/mutations; spinner, no-workspace CTA; mutation/API errors surfaced by hook/UI inconsistently; no explicit query-error panel. |
| `/projects` → `ProjectsPage` | Yes / all; writes require member+ | List/filter; create; view/edit/delete cards. | Workspace/project queries; loading and zero-results state; query errors not always distinct from no results. |
| `/projects/:projectId` → `ProjectDetailsPage` | Yes / project member; actions vary by API capability | Overview plus Requirements, Drift, History, Documents, Change Requests; create baseline, analyze, upload, draft request. | Project, requirements, versions, analyses, requests, files loaded together; spinner; missing/inaccessible project combined message; panel-specific empties and inline errors. |
| `/evaluation` → `EvaluationPage` | Yes / all authenticated | View model information; initiate ten-case benchmark. | Evaluation APIs/model health; loading and model-unavailable/result states. This is a technical/diagnostic surface, not the core scope workflow. |
| `/approvals` → `ApprovalsPage` | Yes / route all; list/decisions API restricted to approval-capable users | Filter requests; inspect, approve/reject/request revision. | Approval list/decision APIs; empty/filter state, spinners/inline mutation errors; no role-aware route or navigation. |
| `/billing` → `BillingPage` | Yes / all | View demo plan and billing placeholder; back to landing. | Billing/demo API; loading/error states; not a live payment flow and uses a separate shell. |
| `/settings` → `SettingsPage` | Yes / all | Expand read-only account, plan, runtime and security information; logout. | Auth/account and billing information; no editable settings workflow. |
| `*` → `NotFoundPage` | No / n.a. | 404 and Go to dashboard. | Static; dashboard link may redirect unauthenticated visitors to login. |

No duplicate URL routes were found. `RequirementCard` exists but the routed requirement view uses `RequirementTable`; it is currently unused. Evaluation and the direct model sandbox are developer-facing in character but available in authenticated UI. Billing is expressly a placeholder. Approvals and billing are reachable through contextual links, not the global dock; this makes them low-discoverability rather than unreachable.

## 3. Landing Page

Source: [LandingPage](../client/src/pages/LandingPage.tsx). The full public page is a single long scroll without a conventional sectioned top navigation.

| Order / section | Heading, copy, CTA and visual | User question, accuracy and overlap |
| --- | --- | --- |
| 1. Hero | Eyebrow “Requirement drift control”; “Keep client scope changes visible before they become unpaid work.” Supporting scope-protection copy; Open Workspace → login and Create Account → register. Static example of baseline CSV/monthly report versus a new message, with an `unchanged`/no-material-drift result. | States problem and a rough before/after. The example looks like a result but is not an interactive product view; `unchanged` does not demonstrate a disputed change or next step. “Open Workspace” implies workspace selection yet first leads to login. Two primary-looking CTAs compete. |
| 2. Product shape | Three feature cards and compact counters/claims (“1 requirement”, “Q4_K_M”, “Baseline to approval”). | Explains parts of mechanism; quantization is too technical for a first-time buyer, and feature framing repeats later module cards. |
| 3. Problem and process | Problem narrative plus Capture scope → Freeze baseline → Compare input → Prepare approval. | Most direct account of workflow, but appears after the hero. “Freeze” suggests a formal approval state that baseline creation does not provide. |
| 4. Product modules | Six cards: Requirements, Drift Analysis, Change Requests, Approvals, Evaluation, Local AI Runtime. | Mirrors software modules. Evaluation/runtime are advanced technical concerns and duplicate prior claims. |
| 5. Local AI, privacy and demo plan | Local inference/privacy explanation; “Local Pro $19/month” demo card; View Billing → protected billing and Start Local Demo → registration. | Local-first claim matches architecture, but the original model is not necessarily bundled/loaded; billing is placeholder, which must be read carefully. Pricing is not a working subscription. |
| 6. Footer | Repository and email links. | Offers external trust/contact path, not product workflow. |

Hero five-second test: a visitor can probably infer “client requests may change project scope,” but may not know what to input, what the baseline contains, how a material change is shown, whether the score represents impact, or what action follows. There are two hero CTAs and a static illustrative result rather than a live product screenshot. Landing copy uses baseline, drift and quantization before demonstrating all concepts. See detailed score in §27.

## 4. Authentication

[Auth context](../client/src/contexts/AuthContext.tsx), [forms](../client/src/features/auth), and [layout](../client/src/components/layout/AuthLayout.tsx): registration asks for name, email, password and confirmation; checks name length (at least two), password length (at least eight) and match. Login uses email/password and browser-required fields. Password reveal is available. Both successful paths land on `/dashboard`, not a first-project guide; session bootstrap calls `/auth/me` from a locally stored JWT/user. Protected-route redirects to `/login` and carries the requested location for post-login return. Logout calls API then clears local credentials even on API failure. No recovery, verification or account-repair route is present. Expired/invalid token fails bootstrap and returns to login, but the Axios layer does not uniformly clear/redirect an already mounted view on every later 401. Errors generally appear inline; reveal-icon buttons and errors lack strong accessible announcements.

The split auth layout presents marketing copy on large screens and a form card. This maintains context but adds a second marketing surface. There is no account menu in the authenticated shell; Logout is a dock item and a settings action.

## 5. Onboarding

There is no onboarding wizard or guided first-run checklist. Implemented sequence: register (one form) → default workspace created automatically → dashboard → Projects → New Project (modal) → project → enter requirements manually or extract suggestions from scope → Create Baseline confirmation → Drift tab → paste new input, select baseline, run analysis. A new account normally has one workspace already, so the dashboard's “no workspaces” state does not teach the first step. Users must decide how to partition clients/workspaces, write original scope, choose requirement source/type/status, decide when content is ready to baseline, and understand why a local model must be available. A baseline can snapshot unapproved-looking requirements. Model absence blocks the comparison step but is not explained proactively at that entrypoint. The product does not teach “what was agreed → what changed → what to decide” as one continuous first-run path.

## 6. Navigation

[Dock](../client/src/components/navigation/Dock.tsx), [navigation config](../client/src/components/layout/appNavigation.tsx), [layout](../client/src/components/layout/AppLayout.tsx): the only global authenticated navigation is a fixed bottom icon dock for Dashboard, Workspaces, Projects, Settings and Logout. Labels are hover/focus tooltips rather than persistent text. There is no top navigation, sidebar, account menu or global workspace/project switcher. A `WorkspaceSwitcher` component exists but navigation primarily uses workspace filtering on Projects and per-project context. Billing and Evaluation are contextual, not dock items; Approvals is an icon shortcut in the project detail tab row and links from request history. Project detail has a back link plus five in-page section tabs; the URL parameter records the selected panel. The six-item project navigation can dominate narrow views. “Workspaces” and “Projects” expose object hierarchy; “Approvals” is a user decision goal but is less visible. Logout in primary navigation is a high-salience destination relative to unfinished work.

## 7. Dashboard

Source: [DashboardPage](../client/src/pages/DashboardPage.tsx), [StatCard](../client/src/components/dashboard/StatCard.tsx), [RecentActivity](../client/src/components/dashboard/RecentActivity.tsx).

| Element | Data/action | Priority category and comprehension |
| --- | --- | --- |
| Eyebrow “Command center”, welcome/name, scope-protection headline and paragraph | Auth user, static copy; no state-specific action. | Useful context but marketing-like and occupies the top. |
| Open Projects / Evaluation / Workspaces buttons | Navigation. | Open Projects is essential; Workspaces secondary; Evaluation advanced. Three competing CTAs leave no single next step. |
| Workspaces / Projects / Active / Completed stat cards | Workspace and project queries; count cards. | Project count useful secondary; workspace and status counts repeat list views, not directly actionable; no count of unresolved changes or approvals. |
| One all-empty block | Appears only when workspaces, projects **and** activity are all empty. | Auto-created default workspace normally prevents this first-run message from appearing. Errors can be misread as zero. |
| “Scope protection pipeline” Capture / Baseline / Analyze cards | Static process text, no direct workflow progress or click-through. | Unclear/redundant on returning visits; teaches concepts but not user's actual step. |
| Recent activity card with first ten, Show more | Activity query; timestamp and action wording. | Useful secondary; not linked to objects and omits actor, changes, decision context. |

Dashboard waits on three queries before rendering and shows a single spinner. It does not center latest baseline, pending decision, material drift or a guided next action. Its apparent primary request is ambiguous: Open Projects competes with Evaluation and Workspaces. On data failure, hooks can supply empty arrays while the page does not visibly distinguish query failure from no data. Scores in §26.

## 8. Projects

Sources: [ProjectsPage](../client/src/pages/ProjectsPage.tsx), [ProjectForm](../client/src/features/projects/ProjectForm.tsx), [ProjectDetailsPage](../client/src/pages/ProjectDetailsPage.tsx).

Projects list offers workspace and status filters, New Project and cards with status, priority, client, workspace and deadline; card actions include view/edit/delete. Status reset does not reset workspace filter. No search. Project creation/edit form asks workspace, project name, client name, status (planning/active/paused/completed/archived), priority (low/medium/high/urgent), description, original scope and deadline. Name/client are required. Project details starts with title, badges and back action, then eight metrics (requirements, baselines, drift runs, change requests, client, deadline, updated, AI engine) and original scope/description. Requirements, Drift, History, Documents and Change Requests are in-page panels; Approvals is an icon shortcut. All five project subqueries start regardless of active section. The same counts, statuses and labels recur on project list, header, metrics, tabs and cards. Dependencies are distributed: requirements must exist before baseline; baseline before analysis; saved analysis before change request; submitted request before approval. Those prerequisites are not shown as a single journey. Mutating controls generally remain visible for unauthorized roles until the API rejects them.

Workspaces page lists workspace cards with name, description and slug, and Create/Edit/Delete modals. Registration has already created a default workspace, so the true empty state is uncommon. The create/edit form asks for a name and description; workspace membership and roles are not managed here. Delete uses a browser confirmation and warns about memberships/activity, while the backend reserves this operation to the owner. See [WorkspacesPage](../client/src/pages/WorkspacesPage.tsx) and [CreateWorkspaceModal](../client/src/features/workspaces/CreateWorkspaceModal.tsx).

## 9. Requirements

Sources: [RequirementFormModal](../client/src/features/requirements/RequirementFormModal.tsx), [RequirementTable](../client/src/features/requirements/RequirementTable.tsx), [RequirementExtractionPanel](../client/src/features/requirements/RequirementExtractionPanel.tsx).

Manual creation/editing fields: title and description (required); type (functional, nonfunctional, business, technical, UI/UX, security, performance, integration, other); priority (low, medium, high, critical); status (proposed, approved, in progress, completed, rejected, changed); source (manual, original scope, client message, meeting note, document, AI-extracted); optional source text, acceptance criteria, tags and estimated effort. Acceptance criteria/tags accept separated text and become lists. Requirement table is expandable and initially paged by “show more” groups of ten; it displays badges/details with edit/delete. There is no dedicated search, filter, grouping, bulk selection or explicit selection for baseline: every requirement is snapshotted. Extraction can suggest requirements from project scope or pasted text, then add one or all; “Add all” performs sequential mutations and can leave a partial result if one fails. The user must understand requirement status versus baseline membership, source provenance, type/priority vocabulary and estimated-effort units; the UI does not explain their relation to analysis.

## 10. Baselines

Sources: [BaselineButton](../client/src/features/requirements/BaselineButton.tsx), [RequirementVersionHistory](../client/src/features/requirements/RequirementVersionHistory.tsx), [requirement service](../server-go/internal/modules/requirement). Project requirement content → Create Baseline → browser `confirm` → backend snapshot/version. Empty requirement set is rejected; API requires approval capability. The current version list shows label, version, count and timestamp; it does not provide a full diff viewer, sign-off artifact or restore action. The newest baseline is the default analysis selection. The snapshot is immutable, but the button does not distinguish reviewed/approved requirements from proposed/rejected ones and does not perform a formal approval step. “Freeze baseline” and “approved baseline” wording can imply governance that the single confirm dialog does not deliver. The action appears even to members/viewers who lack backend capability; permission feedback occurs on request. Baseline is a core term but is not defined in plain language at the point of creation.

## 11. Drift Analysis

Sources: [DriftAnalysisPanel](../client/src/features/drift/DriftAnalysisPanel.tsx), [drift components](../client/src/features/drift), [drift service](../server-go/internal/modules/drift). In the Drift tab, select a numbered baseline (latest default), choose input type, paste new/client text and click Run Drift Analysis. An available local model is required for the comparison; if absent, the request fails rather than showing a proactive readiness explanation. During the call the button/loading state indicates work. The returned preview presents a numeric score, risk, summary, class counts, extra-hour estimate, detected-change cards and relevant/ignored requirement results. Cards can expose label, confidence, reasoning, changed elements, impact and effort. User may Save Analysis, separately from running it; only a saved analysis can seed a change request. History allows expansion/deletion of saved results. There is no review/edit/accept/reject per model classification. `unchanged` is a label in the ontology but typically not a detected-change card.

The interface risks overstating authority: numeric confidence and hours look precise, “approved baseline” can be read as governed approval, and “AI drift analysis” may feel conclusive even though labels are model proposals and score/impact/effort use rules/heuristics. A direct “Model sandbox” with prefilled example and raw label/confidence/reasoning/changed-elements is displayed within the project workflow, adding an advanced diagnostic path. There is no automatic change-request approval: a human must generate/edit/save/submit/decide. Backend relevance limits and normalization mean a result is not necessarily a literal classification of every project requirement.

## 12. Change Requests

Sources: [ChangeRequestPreview](../client/src/features/change-requests/ChangeRequestPreview.tsx), [ChangeRequestHistory](../client/src/features/change-requests/ChangeRequestHistory.tsx), [ApprovalsPage](../client/src/pages/ApprovalsPage.tsx). Select a saved drift analysis (latest offered), Generate draft, edit title/client/summary/business reason/timeline impact/cost impact/recommended action/approval note/general status, then Save. The detected changes are represented as `changesRequested` but not directly edited in the preview. Generation is rule-based from analysis, not an additional authoritative model judgment; no detected change means no useful draft. After saving, project history supports edits, general-status changes, submit for approval and deletion. Approval route filters requests, shows summaries/details, and lets authorized decision-makers approve, reject or request revision with decision notes. Decision history records actor, note and time.

There are two statuses: mutable general `status` (`draft`, `sent`, `approved`, `rejected`, `archived`) and separate `approvalStatus` (`draft`, `pending_approval`, `approved`, `rejected`, `needs_revision`). Saving a draft can set general status differently while approval remains draft; a user can therefore see apparently contradictory badges. A reader can find why a request exists by following the associated analysis and narrative, but the UI does not provide one consolidated trace from original baseline requirement through proposed change and requested decision. Timeline/cost impact are editable text, not verified financial estimates.

## 13. Files / Activity / Settings

Files: project Documents tab has upload/list/delete. Upload accepts PDF, DOC, DOCX, TXT, PNG, JPG, JPEG and WEBP with a document type (scope, brief, contract, meeting note, screenshot, other). List shows filename/type/size/time and opens only where a public URL exists. Backend permissions are project-scoped. When storage is disabled by configuration, upload remains visible until the 503 failure; the UI does not explain this dependency beforehand. Files support the project but are not linked to individual requirements or change decisions. Sources: [file panels](../client/src/features/files), [file service](../server-go/internal/modules/file).

Activity: dashboard Recent Activity fetches cross-workspace entries and shows action text/time, initially ten. Entries are not links and do not show actor or before/after values. Project history is split into requirement versions, drift history and change-request/approval history. Approval history is more decision-useful because it has actor, note and time. Activity write failures are best-effort, so this is not complete audit evidence. Sources: [RecentActivity](../client/src/components/dashboard/RecentActivity.tsx), [activity module](../server-go/internal/modules/activity).

Settings: four read-only accordion groups: Account (name/email/auth mode), Plan/Billing (demo plan), Local Model Runtime (provider, model, quantization/model-first guidance) and Security (auth/environment notes); Logout. There is no editable user, workspace, project, model, storage, CORS or secret configuration here. Workspace and project editing live on their own pages. Runtime and security/env content is advanced/developer-oriented; billing is demo/placeholder, not a real subscription control. Evaluation page is another technical diagnostic surface with model health and a ten-case benchmark trigger; it is separate from Settings. Sources: [SettingsPage](../client/src/pages/SettingsPage.tsx), [settings sections](../client/src/features/settings/settingsSections.ts), [EvaluationPage](../client/src/pages/EvaluationPage.tsx), [BillingPage](../client/src/pages/BillingPage.tsx).

## 14. Roles / Permissions

Backend [policy](../server-go/internal/authorization/policy.go) is the authority; frontend route guard only checks authentication. The workspace/project client types and controls do not consistently expose membership role or capability, so role-aware hiding/disabling is largely absent.

| Role | Backend authority | Current visible UI consequence |
| --- | --- | --- |
| Owner | All capabilities, including delete workspace and approval. | All screens/actions visible. |
| Admin | Read/write/manage and approval; not owner-only workspace deletion. | Same visible controls, including Delete Workspace; API may reject. |
| Member | Read/write ordinary content; cannot approve or create baseline. | Baseline/approval affordances may still appear; API 403 on forbidden action. |
| Viewer | Read only. | Create/edit/delete/upload/analyze affordances generally still appear; API 403. |

Approval list/decision endpoints are capability restricted but `/approvals` is simply authenticated; no approval records can look like “nothing to approve” rather than “you lack permission.” Workspace membership management has backend concepts but no corresponding frontend invitation/role UI. Tenant authorization must not be inferred from button visibility.

## 15. Component Inventory

| Pattern | Implementation and variants/current inconsistency |
| --- | --- |
| Buttons and text fields | [Button](../client/src/components/common/Button.tsx) primary/secondary/ghost/danger and sm/md/lg; [Input](../client/src/components/common/Input.tsx). Many domain forms compose these, but some direct native controls/styles remain. |
| Selects/dropdowns | Shared [ThemedSelect](../client/src/components/common/ThemedSelect.tsx); separate local variants in project and requirement forms. Custom trigger/popover lacks full native listbox keyboard semantics. Ellipsis card menus are local. |
| Dialogs/drawers | [Modal](../client/src/components/common/Modal.tsx) md/lg/xl, compact/comfortable; forms/decisions use it. No common drawer. Native `window.confirm`/`alert` persists for destructive/important steps. |
| Cards/metrics | [Card](../client/src/components/common/Card.tsx), [StatCard](../client/src/components/dashboard/StatCard.tsx), project cards, drift score/change cards, approval cards and metric tiles. Many one-off borders/badges. |
| Tables/lists | Expandable [RequirementTable](../client/src/features/requirements/RequirementTable.tsx); evaluation result table; project grid, file list, activity list and approval cards. No shared data-table system. |
| Tabs/badges/alerts | Project detail section tabs and status badges by feature (`RequirementBadges`, `DriftBadges`, change/approval badges). Inline error blocks and empty cards, but no shared alert/toast system. |
| Loaders/skeletons | Shared [Spinner](../client/src/components/common/Spinner.tsx), route Suspense fallback and page/button loading states. No consistent skeleton or progress narrative for long model calls. |
| Icons/charts | Primarily `lucide-react`; icon-only dock/shortcut/actions. No core dashboard chart; numeric cards and badges carry most quantitative information. |
| Shells/navigation | [AppLayout](../client/src/components/layout/AppLayout.tsx), [AuthLayout](../client/src/components/layout/AuthLayout.tsx), fixed [Dock](../client/src/components/navigation/Dock.tsx); billing and 404 use different shells. |
| Empty states | Shared [EmptyState](../client/src/components/common/EmptyState.tsx); callers pass icons but the component does not render the `icon` prop. |

Repeated domain-specific card/badge/form styles are implementation facts, not a recommendation to refactor in this phase.

## 16. Design System

Sources: [index.css](../client/src/index.css), [Tailwind configuration](../client/tailwind.config.js), common and page JSX. The intended current visual system is warm light neutrals: background `#f3f0e7`, surface `#fffdf8`, near-black text, tan border `#d6cdbb`, muted text around `#59564e`, black primary, green success `#166534`, dark red danger `#9f1d1d`, brown warning. Many JSX nodes still carry older black/lime/gray Tailwind classes; a large `@layer utilities` bridge remaps selected classes to the light theme with `!important`. Consequently raw class names alone are not reliable evidence of final appearance, and unremapped variants may remain inconsistent. Rendered visual verification was unavailable (§30).

Typography uses an Inter-first/system sans stack (no guaranteed downloaded Inter font), small uppercase tracked eyebrows around 0.58–0.75rem, 12–14px body/metadata, 16–18px card headings, ~30–36px page headings and larger 48–60px marketing hero. Weight is often 600–700; line heights vary by utility, with body text commonly `leading-5`/`leading-6`. The small uppercase labels and dense metadata may require effort on laptop/mobile. Spacing is Tailwind utility driven: page sections commonly `space-y-5/6`, 4–6-unit gaps, cards ~p-4/5/6, modals ~p-5/6; there is no single documented spacing token scale. Rounded cards/hero blocks range from about 10–24px, controls around 8px, with thin borders and restrained shadows. Motion uses Framer Motion and Dock animation for entrances/hover/lift; CSS includes reduced-motion duration suppression. Icons are mostly Lucide at 16–20px, though size and text association vary. Status is conveyed with badges plus words in many places, but some global icons rely on tooltip labels.

Visual-density ranking from code: (1) project detail header/eight metrics/five tabs plus shortcut; (2) drift result score, counts, changes, requirements and model sandbox; (3) change request history plus dual status and approval surfaces; (4) landing's repeated cards/stat claims; (5) dashboard four counts, three CTAs and static process cards. Dense borders/badges and nested cards compete with the baseline → change → decision story. Large whitespace around marketing sections coexists with cramped data cards and evaluation table. This is a static density assessment, not a pixel-level visual judgment.

## 17. Responsive Behaviour

Tailwind defaults are used (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px); custom CSS adjusts Dock below ~520px and very narrow ~420px. Layouts usually stack on phone and expand to two/three columns at `md`/`lg`; auth marketing side appears only at large widths. Forms move toward single-column; modals have bounded height and internal scroll. The fixed bottom dock has compensating main bottom padding, but labels rely on hover/focus and long screens/soft keyboard can still create occlusion risk. At tablet width, six project navigation choices can crowd; on phone they can become a tall navigation block before content. Eight project metrics amplify scroll. Evaluation's wide multi-column table needs horizontal overflow; no chart is present to resize. Long client names/requirement text use truncation or wrapping inconsistently. These are code-based risks, not confirmed viewport failures; no browser capture was available.

## 18. Accessibility

Static evidence only; no WCAG claim or automated/browser audit. Native form labels are generally present and buttons are used for actions; links for many navigations. Concerns: shared Modal lacks explicit dialog semantics (`role=dialog`, `aria-modal`), focus trap, Escape/return-focus handling; custom ThemedSelect lacks a full keyboard/listbox interaction model; dock and other icon-only actions rely on tooltip or need explicit accessible names; password-reveal buttons lack clear `aria-label`; shared Spinner has no status role or spoken progress; form/API errors are primarily visual without consistent `aria-live` or `aria-describedby`; `EmptyState` ignores icons passed by callers (not itself an accessibility failure but a component contract mismatch). Tiny metadata text and remapped colors warrant actual contrast testing. Headings vary across shell/cards, so hierarchy should be checked in a rendered DOM. Reduced-motion CSS is a positive intent, but library animations should be tested with the preference enabled. No keyboard, screen reader or contrast measurement was run.

## 19. User Journeys

| Journey | Exact current path/actions and decisions | Likely friction |
| --- | --- | --- |
| A. New user → project → baseline | Register → dashboard (default workspace already exists) → Projects → New Project modal (workspace/name/client/status/priority/scope) → project Requirements → manually Add or extract/review suggestions → Create Baseline → browser confirm → version history. | No guided sequence; default workspace can be mistaken for completed setup; requirement readiness/approval not enforced before snapshot. |
| B. Existing project → client input → result | Projects or dashboard → project → Drift tab → choose baseline/input type → paste message → Run Drift Analysis → inspect score/labels/reasoning/affected requirements → optionally Save Analysis. | Baseline and running model are hidden dependencies; output appears decisive without per-label review; saving is a separate step. |
| C. Result → change request → decision | Save analysis → Change Requests tab → select analysis → Generate draft → edit narrative/impact → Save → submit for approval → Approvals page → filter/open → approve/reject/revision. | Multiple manual hops, no single trace, dual statuses, approval link not globally prominent; roles not reflected in controls. |
| D. Return later → current state | Login/restore session → dashboard counts/activity → Projects → project metrics/tabs → inspect baseline history, saved drift, requests and Approvals separately. | No consolidated “last agreement / pending change / next decision”; activity not clickable. |
| E. Model unavailable → continue | Login → workspace/project/requirements/baseline/files still function if their own dependencies do; Drift analysis request fails; return to manual project work. | No proactive model-readiness state at analysis entry, and files may separately fail if storage disabled. |

## 20. Terminology

| Term/copy | Current comprehension issue |
| --- | --- |
| Workspace / “client operating room” | Workspace as tenant/container is not obvious; metaphor adds another name. Automatically created on registration. |
| Project / original scope | Familiar words, but original scope is free text alongside structured requirements; authority of each is unclear. |
| Requirement / acceptance criteria / type / status | Engineering vocabulary and many enums before the user sees a change; `approved` requirement status does not govern baseline creation. |
| Baseline / freeze / approved baseline | Core but jargon; “freeze” correctly implies immutable snapshot, incorrectly implies approval if not separately reviewed. |
| Drift / score / risk / confidence | Not plain-language by itself; numeric values may look factual/precise when model-plus-heuristic derived. |
| Modified vs contradiction vs ambiguous | Class distinctions are central yet not taught next to results; added/removed are easier. |
| Impact / effort / estimated extra hours | UI combines editable effort, text impact and heuristic hours without clear unit, provenance or uncertainty. |
| Change request / `sent` / approval status | Familiar business concept, but two independent status vocabularies are inconsistent. |
| “Open Workspace”, “Run Drift Analysis”, “Generate draft”, “Save Analysis” | The latter three are action-specific, but their dependencies/consequences are not adjacent; “Open Workspace” actually navigates to login. |
| Q4_K_M, GGUF, inference, model sandbox, Evaluation | Internal/advanced terminology on broad-user surfaces. |

## 21. Empty / Error / Loading States

| Surface | Empty / loading / success | Validation, API, permission and dependency failure |
| --- | --- | --- |
| Landing | Static; no asynchronous state. | No API dependency. |
| Auth | Submit busy and dashboard redirect on success. | Required/name/password/match checks and inline API error; expired mid-session handling is not uniform. |
| Dashboard | Whole-page spinner; workspace/project/activity empties and counts. | Query errors can collapse into empty arrays; no distinct offline/service message. |
| Workspaces/projects | Spinner, no-item CTA/filter no-match, modal success updates. | Mutations expose errors, but list-query failure may look empty; 403 after visible action. |
| Project/requirements/baselines | Whole/detail loading; empty requirement/version panels; success refresh. | Combined not-found/no-access project message; empty baseline and capability errors; no explicit conflict explanation before snapshot. |
| Drift | No baseline/input prompts, run busy state, preview/history on success. | Input/API errors inline; model unavailable only on attempted run; no proactive readiness or partial-model state. |
| Change requests/approvals | No analysis/request states, draft/decision busy and history. | Generation prerequisites, 403 and API errors; dual status can make a successful action seem inconsistent. |
| Documents | No files, upload progress/busy, list refresh. | Disabled storage returns failure after affordance shown; type/size/server errors are not a guided setup state. |
| Evaluation/billing/settings | Evaluation loading/model state/results; billing loading/error; settings mostly static/read-only. | Evaluation model failure has messaging, but benchmark is an advanced action; billing is placeholder. |

Across the app, a generic spinner is used without screen-reader status text; there is no consistent toast, retry/offline banner or distinction between permission denial and empty data. The Axios error mapper yields server messages when present, but page-level presentation varies. No evidence warrants claiming all errors say “Something went wrong.”

## 22. Redundancy

Project status/priority recur on list cards, project header, form and badges. Requirement/baseline/drift/request counts recur on dashboard/project metrics, tabs and their panels. “Capture → Baseline → Analyze” is repeated on landing and dashboard, while landing repeats capability descriptions in feature, process and module sections. Baseline label/count/time recur in selector and history without a full-content viewer. Drift score/risk/class counts recur across preview/history/change draft. General request status and approval status can both be shown for one request. Projects/Workspaces/Evaluation are repeated as dashboard CTAs and navigation/contextual links. Activity is split among dashboard feed and per-entity histories. Filters occur on project and approvals lists with different semantics. This is inventory only, not a deletion plan.

## 23. Complexity

**Core:** workspace as container; project/client; original agreement/requirements; baseline version; new client text; six-way proposed change; save result; change request; approval decision.

**Secondary:** project status/priority/deadline; requirement type/status/source/acceptance criteria/tags; extraction suggestions; file categories; activity; version/history; filters; separate general and approval status.

**Advanced:** role capabilities; relevant/ignored requirement matching; confidence/reasoning/changed elements; score/risk; impact/effort/extra hours; benchmark quality/runtime; billing demo.

**Technical:** original local GGUF, Q4_K_M, inference service, model sandbox, runtime readiness, JWT/environment/security internals, storage backend, development-only evaluation. This classification reflects learning burden, not feature-removal authorization.

## 24. Friction

Ranked current-state findings; severity describes the likely effect on a normal user, not a security finding or a proposed solution.

| # / severity | Location; problem → consequence | Implementation evidence |
| --- | --- | --- |
| 1 CRITICAL | Baseline: all requirement statuses are snapshotted with only `confirm` → “approved/frozen” may be interpreted as reviewed agreement when it is not. | [BaselineButton](../client/src/features/requirements/BaselineButton.tsx), [requirement service](../server-go/internal/modules/requirement). |
| 2 HIGH | Role-blind controls across project/workspace/approval UI → users click actions that end in 403, with “empty” approvals misleading. | [policy](../server-go/internal/authorization/policy.go), [ProtectedRoute](../client/src/routes/ProtectedRoute.tsx), [pages](../client/src/pages). |
| 3 HIGH | Dashboard lacks one next action/current scope state → returning users cannot see what needs attention. | [DashboardPage](../client/src/pages/DashboardPage.tsx). |
| 4 HIGH | Drift score/confidence/hours appear precise and authoritative → provisional AI/heuristic output may be over-trusted. | [drift panel](../client/src/features/drift/DriftAnalysisPanel.tsx), [drift service](../server-go/internal/modules/drift). |
| 5 HIGH | General status and approval status are independent → a request can look sent/approved while approval workflow is draft. | [change request UI](../client/src/features/change-requests), [change request module](../server-go/internal/modules/change_request). |
| 6 HIGH | No first-run guidance across project → requirement → baseline → analysis → request → user must discover hidden dependencies. | [DashboardPage](../client/src/pages/DashboardPage.tsx), [ProjectDetailsPage](../client/src/pages/ProjectDetailsPage.tsx). |
| 7 HIGH | Missing model readiness is discovered by failed analysis → core comparison stalls late in journey. | [DriftAnalysisPanel](../client/src/features/drift/DriftAnalysisPanel.tsx). |
| 8 HIGH | Data-query errors can render as empty arrays → service failure mistaken for no projects/activity. | [hooks](../client/src/hooks), [DashboardPage](../client/src/pages/DashboardPage.tsx). |
| 9 HIGH | Change request requires saved analysis and multiple screens → reason/evidence/decision trail is fragmented. | [change request preview](../client/src/features/change-requests/ChangeRequestPreview.tsx), [ApprovalsPage](../client/src/pages/ApprovalsPage.tsx). |
| 10 HIGH | Dialog/select keyboard semantics are incomplete → keyboard/screen-reader users can lose context or be unable to operate controls reliably. | [Modal](../client/src/components/common/Modal.tsx), [ThemedSelect](../client/src/components/common/ThemedSelect.tsx). |
| 11 MEDIUM | Project detail shows eight metrics and six navigation choices before task content → increased scan cost. | [ProjectDetailsPage](../client/src/pages/ProjectDetailsPage.tsx). |
| 12 MEDIUM | Two hero CTAs, technical claims and unchanged example → first-time value/output remain partly abstract. | [LandingPage](../client/src/pages/LandingPage.tsx). |
| 13 MEDIUM | Requirements cannot be searched/filtered/selected for baseline → larger projects are difficult to curate. | [RequirementTable](../client/src/features/requirements/RequirementTable.tsx). |
| 14 MEDIUM | Extraction “Add all” is sequential → partial saves can leave unclear completion state. | [RequirementExtractionPanel](../client/src/features/requirements/RequirementExtractionPanel.tsx). |
| 15 MEDIUM | Storage-disabled deployments still show Upload → user encounters avoidable 503. | [FileUploadPanel](../client/src/features/files/FileUploadPanel.tsx), [file service](../server-go/internal/modules/file). |
| 16 MEDIUM | Activity lacks actor/target link/before-after → history cannot easily answer who changed what. | [RecentActivity](../client/src/components/dashboard/RecentActivity.tsx), [activity module](../server-go/internal/modules/activity). |
| 17 MEDIUM | Icon-only dock and contextual Approvals/Evaluation/Billing → navigation discoverability depends on prior knowledge. | [Dock](../client/src/components/navigation/Dock.tsx), [app navigation](../client/src/components/layout/appNavigation.tsx). |
| 18 MEDIUM | Technical sandbox, evaluation, runtime and demo pricing sit near user workflow → audience and product maturity are ambiguous. | [drift panel](../client/src/features/drift/DriftAnalysisPanel.tsx), [EvaluationPage](../client/src/pages/EvaluationPage.tsx), [SettingsPage](../client/src/pages/SettingsPage.tsx). |
| 19 LOW | Settings is read-only despite its name; workspace/project edits live elsewhere → expectation mismatch. | [SettingsPage](../client/src/pages/SettingsPage.tsx), [settings sections](../client/src/features/settings/settingsSections.ts). |
| 20 LOW | UI styles depend on legacy-class override bridge and duplicate selects → visual/interaction consistency is fragile. | [index.css](../client/src/index.css), [form components](../client/src/features). |

## 25. Existing Strengths

1. The underlying workflow is coherent: agreement → snapshot → compare → request → decision.
2. Immutable numbered baseline snapshots preserve prior scope despite later requirement edits.
3. Analysis is a preview before an explicit Save, allowing a human pause.
4. Change-request drafts are editable rather than directly issuing an AI decision.
5. Approval history captures decision actor, time and note separately from draft editing.
6. Workspace/project separation and backend capability checks protect tenant data regardless of frontend gaps.
7. Manual requirement creation and heuristic extraction offer two entry paths.
8. Project history retains analyses/versions/requests instead of replacing current state silently.
9. Empty project/requirement states often provide a relevant create action.
10. Reusable button/card/modal/select primitives and responsive stacking provide a foundation; reduced-motion intent exists.

These are preservation candidates for later review, not a redesign decision.

## 26. Dashboard Score

Static-source judgment, 1 (poor) to 10 (excellent). No rendered screenshot or user test was available.

| Dimension | /10 | Basis |
| --- | ---: | --- |
| Immediate comprehension | 5 | Scope-protection headline helps; counts do not show actual scope state. |
| Visual hierarchy | 4 | Hero, three CTAs, four metrics and three process cards compete. |
| Action clarity | 3 | No single recommended current action. |
| Information density | 4 | Several panels, little decision information. |
| Terminology | 4 | Command center, baseline and evaluation without context. |
| Cognitive load | 4 | User must map data objects to workflow. |
| Navigation simplicity | 5 | Dock is small, but contextual destinations are hidden. |
| Usefulness | 4 | Counts/activity help orientation, not current decision. |

**Overall dashboard simplicity: 4/10.** The single most important desired action is **unclear**; “Open Projects” is the closest primary route but is not a state-aware instruction.

## 27. Landing Page Score

First viewport/static-source judgment, 1–10; later sections do explain more of the process.

| Dimension | /10 | Basis |
| --- | ---: | --- |
| Explains product | 6 | Scope-change concept visible; baseline/analysis mechanics implicit. |
| Explains problem | 7 | Unpaid work from unnoticed changes is clear. |
| Explains workflow | 4 | Four steps exist lower on page, not fully in hero. |
| Shows output/value | 5 | Static `unchanged` example, not a meaningful change decision. |
| CTA clarity | 5 | Two paths, “Open Workspace” leads to login. |
| Visual hierarchy | 6 | Strong hero headline but competing CTAs/example. |
| Trust | 5 | Local-first claim and repository link; demo billing/model-availability caveats. |
| Simplicity | 4 | Technical/runtime terms and repeated cards. |

**First-viewport comprehension: 5/10.** This is an evidence-limited assessment, not a conversion measurement.

## 28. Product Model vs UI Model

**Partially aligned.** UI modules follow data entities (Workspaces → Projects → Requirements/Drift/History/Documents/Change Requests), and the essential operations exist. The natural user narrative is “what did we agree, what did the client change, what does it affect, what decision is pending?” The UI begins with counts and object navigation, puts baseline under Requirements, splits analysis save from request generation, separates approval into a contextual route, and presents advanced evaluation/runtime concepts at high visibility. “Approved baseline” is not backed by an explicit approval stage; numeric model/heuristic fields can look like settled impact. The backend remains authoritative for permissions, but UI controls do not mirror that authority. This mismatch is about presentation and state visibility, not evidence that the product workflow itself is absent.

Child-simple test (without teaching engineering terms):

| User question | Result | Why |
| --- | --- | --- |
| What was originally agreed? | PARTLY CLEAR | Scope text, requirement list and versions exist; no easily inspected complete current-baseline view. |
| What changed? | PARTLY CLEAR | Detected-change cards/labels exist after analysis, but require baseline/model knowledge. |
| How significant is it? | UNCLEAR | Score/risk/hours are prominent without plain-language provenance or uncertainty. |
| What does it affect? | PARTLY CLEAR | Relevant requirements and changed elements are shown, but trace to original agreement is fragmented. |
| What should I do next? | UNCLEAR | Save, generate, submit and approve are split across views; dashboard does not prioritize the pending step. |

## 29. Screen Hierarchy

```text
AppRoutes
├── Public
│   ├── /                 Landing
│   ├── /login            AuthLayout → Login
│   ├── /register         AuthLayout → Register
│   └── *                 NotFound
└── ProtectedRoute (authentication, not role)
    ├── /billing          Billing (separate shell)
    └── AppLayout → fixed Dock
        ├── /dashboard    Counts + pipeline + recent activity
        ├── /workspaces   Workspace list + create/edit modals
        ├── /projects     Filtered project cards + create/edit modal
        │   └── /projects/:projectId
        │       ├── Overview/header + metrics
        │       ├── ?section=requirements  Requirements + extraction + baseline history
        │       ├── ?section=drift         Analysis preview + model sandbox
        │       ├── ?section=history       Saved drift history
        │       ├── ?section=documents     Upload + file list
        │       ├── ?section=changes       Request draft/history
        │       └── contextual link → /approvals
        ├── /approvals    Approval list + decision dialogs
        ├── /evaluation   Model/benchmark diagnostics
        └── /settings     Read-only accordions + logout
```

## 30. Evidence / Limitations

This is a static audit of the pinned source tree: React routes/pages/features/common components/styles/hooks/API clients and relevant Go models, services and authorization policy. It did not query personal records or modify application data. The existing local model container remained stopped; no GPU, GGUF, inference call, benchmark, training or final-holdout access occurred. A model-free frontend was already available locally, but browser/visual-capture tooling exposed no usable app/browser surface, so no rendered screenshots, viewport test, actual accessibility run or visual-contrast measurement was possible. CSS observations combine variables, override rules and JSX usage; potential layout/contrast issues are explicitly risks, not confirmed screenshots. No user interviews, analytics, production usage, payment verification or local-storage inspection were performed. Source behavior may differ under deployment-specific configuration (notably model and file storage availability). All scores are reasoned audit judgments, not measured usability outcomes. The only deliverable of this phase is this report; no product changes are authorized by it.
