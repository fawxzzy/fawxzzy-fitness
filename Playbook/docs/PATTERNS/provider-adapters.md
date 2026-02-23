# Pattern: Provider Adapters

[Back to Index](../INDEX.md)

## Problem
Core logic becomes vendor-locked when provider APIs leak across the app.

## When to use
- Multiple providers/modes are possible now or later.
- Runtime capability varies by environment.

## When NOT to use
- Single-provider throwaway implementations with no portability goals.

## Implementation outline
- Define a stable provider interface contract.
- Implement adapters per provider and normalize outputs.
- Resolve active provider via capability checks and fallback rules.

## Common failure modes
- Provider-specific types escaping adapter boundaries.
- Fallback behavior undocumented or inconsistent.

## Sources
- Dump B — `Architectural Patterns / Dependency inversion for providers`.
- Dump B — `Offline & Sync Patterns / capability-based provider selection`.
- Dump A — `4) Data Modeling & Storage / Supabase usage patterns`.
