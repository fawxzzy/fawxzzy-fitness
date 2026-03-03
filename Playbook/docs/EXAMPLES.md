# Examples

Use these short examples as copy/paste starters when adopting Playbook.

## 1) Example AI task prompt (UI-only change)

```md
Follow docs/PROJECT_GOVERNANCE.md and docs/PLAYBOOK_CHECKLIST.md.

Target project:
- Project: Fawxzzy Fitness
- Project router: docs/PROJECTS/index.md
- Project overlay: docs/PROJECTS/fawxzzy-fitness.md

Change classification:
- Type: UI-only
- Scope summary:
  - Update dashboard card spacing and heading hierarchy for readability.
  - Keep behavior, data flow, and API contracts unchanged.

Verification tier:
- Tier: Build
- Justification: UI-only visual/layout updates with existing components; build-level validation is sufficient.

Pre-coding compliance review:
- Relevant Core docs:
  - Principles: docs/PRINCIPLES/_index.md
  - Patterns: docs/PATTERNS/mobile-interactions-and-navigation.md
  - Guardrails: docs/GUARDRAILS/_index.md
  - Workflows/checklists: docs/WORKFLOWS/checklists/pr-quality-checklist.md
- Relevant overlay notes:
  - Mobile-first presentation assumptions from project overlay.
- Conflicts identified:
  - None.
- Compliant approach:
  - Small-diff className/layout adjustments only; no API/data layer edits.

Expected file touch list:
- app/dashboard/page.tsx
- components/dashboard/summary-card.tsx
- docs/CHANGELOG.md

Execution plan (small diffs):
1) Adjust spacing/typography classes in existing dashboard components.
2) Verify no behavior or contracts changed.
3) Update changelog WHAT/WHY.

Post-implementation steps:
- Run required checks for selected verification tier.
- Update docs/CHANGELOG.md with WHAT + WHY for non-trivial changes.
- Update docs indexes if new canonical docs were added or moved.
```

## 2) Example upstreaming pass

### Source note (in consuming repo `docs/PLAYBOOK_NOTES.md`)

```md
## 2026-03-10 — Pattern Candidate: Stable toast placement for mobile sheets
- Type: Pattern
- Summary: Keep transient action toasts anchored above mobile bottom sheets to avoid overlap.
- Suggested Playbook File: docs/PATTERNS/mobile-interactions-and-navigation.md
- Rationale: Repeated UX regressions when toasts render under active sheets.
- Evidence: TODO (link PR/issue)
- Status: Proposed
```

### Promotion in Playbook (destination)

- Add/update relevant guidance in `docs/PATTERNS/mobile-interactions-and-navigation.md`.
- Cross-link related guardrail index entries if applicable.

### Release hygiene after promotion

1. Add Playbook changelog entry in `docs/CHANGELOG.md` (WHAT + WHY).
2. Apply semantic version bump in `docs/VERSIONING.md`.
3. Mark source note as upstreamed:

```md
- Status: Upstreamed (Playbook vX.Y.Z)
```

## 3) Example version bump decision (PATCH vs MINOR vs MAJOR)

| Scenario | Decision | Why |
| --- | --- | --- |
| Added `GETTING_STARTED.md` and templates only | PATCH | Packaging/onboarding clarity; no doctrine semantics changed. |
| Added a new canonical pattern with enforceable scope | MINOR | Introduces new reusable governance scope. |
| Redefined an existing enforced contract in a breaking way | MAJOR | Changes how consumers must comply with governance. |
