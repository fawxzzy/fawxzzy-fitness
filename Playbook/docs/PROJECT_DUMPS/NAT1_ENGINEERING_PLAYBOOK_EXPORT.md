# NAT1_ENGINEERING_PLAYBOOK_EXPORT

## Core Principles

- **Modular monolith with strict seams:** feature areas are treated as bounded modules, while shared capabilities are centralized in common layers instead of direct cross-feature coupling.
- **Deterministic, reversible state changes:** state mutations are expected to be explicit, serializable, and compatible with snapshot-based undo/redo.
- **Versioned persistence as a contract:** serialized state is versioned, and changes are expected to be accompanied by migration/backward-compatibility thinking.
- **Architecture-first decision making:** long-term maintainability, explicitness, and traceability are prioritized over ad-hoc convenience.
- **Operational discipline:** verification scripts, CI guardrails, and PR structure enforce quality gates before merge.

## Architectural Patterns

- **Layered module composition via a container/facade pattern:**
  - Top-level app container aggregates feature modules (`auth`, `mapBuilder`, `session`, `assets`, `shared`) and passes them through context.
  - Feature modules expose stable entry points (`index.js`) that hide internal structure.
- **Application-service boundaries around infrastructure:**
  - Save/load operations route through application services and a `StorageManager`, not directly from UI.
  - A storage adapter interface abstracts browser APIs (filesystem, pack import/export, snapshot conversion).
- **Policy/coordination split in storage architecture:**
  - `StorageModeOrchestrator` handles provider policy/selection.
  - `ProjectSessionRegistry` owns active project pointer/epoch.
  - `SnapshotTransactionService` coordinates save/load/import/export transactions.
- **Dependency inversion for providers:**
  - Storage providers implement a common interface (`init`, `save`, `load`, `list`, `import/export`, `delete`).
  - Active provider is resolved dynamically with fallback behavior when preferred mode is unavailable.
- **UI/controller separation pattern:**
  - Screen/controller hooks prepare view-model props.
  - Rendering components stay focused on presentation and interaction wiring.

## Data Modeling Patterns

- **Version-tagged snapshot schema:** serialized project payloads include explicit `version`, and deserialization normalizes legacy/new forms.
- **Separation of metadata from heavy payloads:** IndexedDB stores project metadata and project blob data in separate stores.
- **Normalized identity + location pattern:** records track both logical id (`id`) and storage location key (`locationKey`) plus provider.
- **DTO-like serialization boundaries:** runtime-only fields are stripped from persisted objects during serialization.
- **Naming conventions:**
  - state keys are explicit and descriptive (`providerKey`, `fallbackReason`, `updatedAt`, `locationKey`).
  - constants are centralized for persistence/storage keys.
- **Ownership conventions:**
  - Session/auth state owns account scoping decisions for file handle persistence.
  - Storage metadata DB is source-of-truth for provider/project mapping across providers.

## Auth & Security Patterns

- **Role-aware navigation guardrails:** DM-only routes/screens are centrally declared and enforced in navigation state.
- **Fail-safe logout behavior:** logout clears local session state regardless of upstream sign-out failure to avoid stale authenticated UI.
- **Supabase client bootstrapping with graceful degradation:** environment lookup supports multiple variable prefixes and warns early if missing.
- **Profile-on-auth pattern:** auth identity and profile attributes (e.g., role) are resolved from backend-managed profile table after sign-in.
- **Server-side auth endpoints enforce baseline controls:** request method checks, required-field validation, normalized identifiers, password hashing, and signed tokens.
- **RLS pattern status in this repo:**
  - The codebase shows Supabase auth + profile table access conventions, but repository-level SQL migration/policy files for explicit RLS definitions are not present.
  - Reusable takeaway: keep client role gating as UX only; enforce authoritative role and row access server-side/RLS policy-side.

## Offline & Sync Patterns

- **Offline-first local persistence stack:** IndexedDB + localforage + browser file APIs are used as primary persistence mechanisms.
- **Capability-based provider selection:** provider support is detected at runtime (`isSupported`) and a supported fallback is selected automatically.
- **Permission-aware filesystem workflow:** read/write permission checks gate directory operations; failures degrade safely.
- **Session-pointer continuity across storage modes:** registry tracks current project/provider and republishes pointer after successful transactions.
- **Epoch-based race protection:** session epoch helps avoid stale transaction side effects when session context changes mid-operation.
- **Scoped local persistence for multi-account contexts:** parent directory handles are keyed by normalized account identity to prevent cross-account leakage.
- **Progressive migration of local persisted structures:** handle-store versioning/migration logic upgrades older stored formats instead of hard-breaking them.

## Documentation & Workflow Discipline

- **Architecture contract documents as source of behavioral constraints:** repository-level guidance codifies non-negotiables (module boundaries, snapshot safety, persistence/versioning discipline).
- **Changelog discipline:** behavioral changes are expected to include concise “what changed and why” entries.
- **Verification tiers:** fast local verification and full verification workflows are codified in npm scripts and CI.
- **CI guard script enforces policy heuristics:**
  - docs-only changes can bypass heavier requirements,
  - code changes require changelog updates,
  - behavior changes are expected to include tests or an explicit skip marker convention.
- **PR template standardization:** summaries, change type, testing, verification, and changelog checks are normalized via template.

## Lessons Learned / Guardrails

- Prefer **coordinator classes over growing god-services** when adding new storage/runtime modes.
- Keep **provider interfaces stable** and add behavior behind adapters/orchestrators rather than leaking backend specifics.
- Treat **snapshot/version compatibility** as a product requirement, not a maintenance task.
- Separate **policy decisions** (which provider/mode should run) from **transaction execution** (how save/load/import actually runs).
- Use **local role guards only for UX shaping**; security authority must stay in backend-auth/RLS policy layers.
- Build **fallback semantics intentionally** (unsupported environment, permission loss, not-configured paths) and surface clear user status.
- Encode workflow expectations in automation (CI guards/templates/scripts) so discipline survives team and context changes.
