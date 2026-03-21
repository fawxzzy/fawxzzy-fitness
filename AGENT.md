# Fawxzzy Fitness Agent Guide

## Purpose

Fawxzzy Fitness is a deterministic fitness and workout tracking app. Favor maintainability, consistent UX, and deterministic progression and tracking behavior over clever one-off implementations.

This file is the repo-local product truth layer for agents working in this codebase. It should describe local behavior, UI language, and implementation preferences for Fawxzzy Fitness rather than restating Playbook-wide operating doctrine.

- Rule: Repo-local agent guidance should define product truth and local operating constraints, not restate framework-wide doctrine.
- Pattern: Playbook defines global operating posture; the repo `AGENT.md` defines local product behavior, UI language, and implementation preferences.
- Failure Mode: Copying framework guidance directly into a product repo creates generic agent behavior and weakens repo identity.

## Product and domain language

Use the product's canonical fitness terms consistently:
- routine
- day
- workout
- session
- exercise
- set
- progression
- PR

Do not invent alternate names for existing concepts when the product already has a clear term. If a UI surface already uses one of the canonical terms above, keep that wording aligned across adjacent screens.

## UI system rules

- Preserve the existing app visual language and page-family rhythm.
- Prefer shared components, shared shells, and existing page scaffolds over route-local one-offs.
- Prioritize consistency across Today, Routine, Edit Routine, Edit Day, Session, and related flows.
- Respect the current green-first accent direction. Do not introduce blue as a new primary state or accent unless an existing semantic role already justifies it.
- Preserve safe-area-aware bottom actions and the current bottom action stack conventions.
- Prefer normalization across repeated surfaces over bespoke screen treatments.
- When editing a UI flow, first identify the canonical component or pattern already used elsewhere in the app and start there.

## Architectural rules

- Reuse existing components, utilities, and data flows before adding new abstractions.
- Do not create duplicate page-family shells when an existing scaffold can express the same pattern.
- Preserve deterministic behavior and existing product truth, especially around progression, workout state, and tracking summaries.
- Avoid broad refactors unless the task explicitly requires them.
- Extract a reusable pattern only when it reduces real drift across repeated surfaces, not just to tidy a single file.

## Workflow expectations for edits

- Keep diffs focused, practical, and PR-sized.
- Before changing a screen, look for the shared or canonical implementation used by neighboring flows.
- Align new UI work to the established page family before inventing a local exception.
- If you introduce or materially change a reusable pattern, update supporting docs or changelog notes when that change affects product behavior, workflow, or UI conventions.

## Documentation expectations

Playbook may provide framework-level guidance, but this file is the local product override and local truth layer for Fawxzzy Fitness. When product-specific behavior, naming, or UI expectations are in question, prefer the repo-local guidance here and in the repo's architecture/governance docs.
