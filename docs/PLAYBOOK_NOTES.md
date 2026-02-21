# Playbook Notes (Local Inbox)

This file is a project-local inbox for suggestions that should be upstreamed into the central Playbook repository.

## YYYY-MM-DD — <short title>
- Type: Principle | Pattern | Checklist | Prompt | Template | Decision
- Summary: <1–2 sentences>
- Suggested Playbook File: <path in playbook repo, if known>
- Rationale: <why this matters / what it prevents>
- Evidence: <file paths in this repo that triggered the note>
- Status: Proposed | Upstreamed | Rejected

## 2026-02-21 — Prefetch primary tab destinations for dynamic mobile shells
- Type: Pattern
- Summary: In dynamic App Router screens, prefetch sibling tab routes from the active nav shell and provide a route-level loading boundary to reduce perceived latency on tab switches.
- Suggested Playbook File: patterns/frontend/navigation-performance.md
- Rationale: Dynamic server-rendered routes can feel sluggish if navigation waits on fresh payloads; explicit prefetch and immediate loading affordance improve responsiveness without architectural complexity.
- Evidence: src/components/AppNav.tsx, src/app/loading.tsx
- Status: Proposed
