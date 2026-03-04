# Project Router

Use this router to select project overlays before applying Playbook governance in a consuming repository.

Core stays authoritative; overlays only scope/route project-specific context.

## How to pick the correct overlay

1. Identify the target repository for the task.
2. Open this router and select the matching project row.
3. Read the project overlay for stack/context assumptions.
4. Apply Core doctrine (`PRINCIPLES`, `PATTERNS`, `GUARDRAILS`, `WORKFLOWS`) as the canonical source.
5. Use overlay notes only as additive routing guidance.

## Core vs Overlay rule

- **Core (authoritative):** Universal doctrine and enforcement model for all consumers.
- **Overlay (additive):** Project routing notes, known stack assumptions, and local expectations.
- **Divergence handling:** Any divergence from Core must be explicit in the consuming repository's local governance docs.

## Project overlays

| Project | Repo | Stack notes (high-level) | Overlay | Default verification tier | Notes |
| --- | --- | --- | --- | --- | --- |
| Fawxzzy Fitness | `ZachariahRedfield/FawxzzyFitness` | Current known: Next.js App Router, mobile-first/PWA posture, Supabase + RLS | [Fawxzzy Fitness Overlay](./fawxzzy-fitness.md) | Build | Active consuming repo; overlay references evidence paths as examples only. |
| FawxzzyFinance | `ZachariahRedfield/FawxzzyFinance` | Current intention: mobile-first; likely PWA/web-first; separate Supabase project | [FawxzzyFinance Overlay](./fawxzzy-finance.md) | Static | Static until consuming repository/governance docs are established and verifiable. |
| Nat-1 Games | `ZachariahRedfield/nat-1-games` | Current known: game-focused app stack details not yet codified in Playbook | [Nat-1 Games Overlay](./nat-1-games.md) | Static | TODO: confirm stack/runtime constraints from repo governance docs. |

Verification tiers are defined in `docs/REFERENCE/verification-tiers.md`.
