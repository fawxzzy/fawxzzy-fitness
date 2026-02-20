# Playbook Index

This folder captures the **engineering playbook so far** for this repo, based only on current code/docs/config.

## Table of contents

- [Principles](./PRINCIPLES.md)
- [Decisions](./DECISIONS.md)
- [Conventions](./CONVENTIONS.md)
- Patterns
  - [Auth + RLS with Supabase](./PATTERNS/supabase-auth-rls.md)
  - [Routine day modeling + timezone resolution](./PATTERNS/data-modeling.md)
  - [Exercise catalog loading + fallback cache](./PATTERNS/offline-cache-sync.md)
  - [Server action mutation flow](./PATTERNS/optimistic-logging.md)
- Checklists
  - [PR checklist](./CHECKLISTS/pr-checklist.md)
  - [Schema change checklist](./CHECKLISTS/schema-change-checklist.md)
  - [Release checklist](./CHECKLISTS/release-checklist.md)
- Codex prompts
  - [New feature](./PROMPTS/codex-new-feature.md)
  - [Bugfix](./PROMPTS/codex-bugfix.md)
  - [Schema change](./PROMPTS/codex-schema-change.md)
  - [Release](./PROMPTS/codex-release.md)

## How to use this playbook

### 1) Starting a feature
1. Read [Principles](./PRINCIPLES.md) for product/engineering guardrails.
2. Apply [Conventions](./CONVENTIONS.md) when choosing route/component/lib placement.
3. Reuse a matching pattern doc from [`PATTERNS/`](./PATTERNS/).
4. Use [`PROMPTS/codex-new-feature.md`](./PROMPTS/codex-new-feature.md) for execution consistency.

### 2) Changing schema/auth
1. Read [Decisions](./DECISIONS.md) sections on Supabase + RLS + user-owned rows.
2. Follow [`CHECKLISTS/schema-change-checklist.md`](./CHECKLISTS/schema-change-checklist.md).
3. Reuse [`PATTERNS/supabase-auth-rls.md`](./PATTERNS/supabase-auth-rls.md).
4. Use [`PROMPTS/codex-schema-change.md`](./PROMPTS/codex-schema-change.md).

### 3) Preparing a release
1. Run [`CHECKLISTS/release-checklist.md`](./CHECKLISTS/release-checklist.md).
2. Validate [Decisions](./DECISIONS.md) “Deployment/runtime mode” assumptions still hold.
3. Update `docs/CHANGELOG.md` with WHAT + WHY.
4. Use [`PROMPTS/codex-release.md`](./PROMPTS/codex-release.md).
