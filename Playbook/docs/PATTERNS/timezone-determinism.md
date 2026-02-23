# Pattern: Timezone Determinism

[Back to Index](../INDEX.md)

## Problem
Date-sensitive features break when "today" is computed inconsistently across locales/timezones.

## When to use
- Daily schedule, streak, or day-window behavior depends on user locale.

## When NOT to use
- Features that are explicitly timezone-agnostic.

## Implementation outline
- Persist user timezone context.
- Compute day index and day-window boundaries with shared helpers.
- Query and aggregate data using timezone-aligned windows.

## Common failure modes
- UTC-only assumptions for local-day features.
- Multiple inconsistent day-window implementations.

## Sources
- Dump A — `2) Core Principles / timezone-aware routine resolution deterministic`.
- Dump A — `3) Architectural Patterns / Timezone-safe day-window and day-index helpers`.
