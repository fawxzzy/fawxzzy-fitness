# Pattern: Provider Adapters

[Back to Index](../INDEX.md)

## Problem
Core logic becomes vendor-locked when provider APIs leak across the app.

## Context
- Used when integrations vary by provider or environment capability.
- Assumes core domain logic should not depend on provider-specific SDK details.
- Requires fallback behavior when providers are unavailable.

## Solution
- Define stable provider interfaces around required capabilities.
- Implement adapters per provider with normalized result contracts.
- Resolve active provider at runtime with explicit selection rationale.
- Persist provider metadata required for tracing/recovery.
- Keep provider-specific errors mapped to safe domain-level errors.

## Tradeoffs
- Adapter layer adds code and indirection.
- Capability mismatches may force least-common-denominator features.
- Provider drift requires periodic adapter contract updates.

## Example
Image ingestion uses one adapter interface; cloud provider A and local provider B implement it behind identical domain calls.

## When to use
- Multiple providers/modes are possible now or later.
- Runtime capability varies by environment.

## When NOT to use
- Single-provider throwaway implementations with no portability goals.

## Implementation outline
- Define a stable provider interface contract.
- Implement adapters per provider and normalize outputs.
- Resolve active provider via capability checks and fallback rules.

## Related guardrails
- [Use deterministic sync reports instead of auto-renaming media files](../GUARDRAILS/guardrails.md#use-deterministic-sync-reports-instead-of-auto-renaming-media-files)
- [API errors ship phase and correlation metadata](../GUARDRAILS/guardrails.md#api-errors-ship-phase-and-correlation-metadata)

## Common failure modes
- Provider-specific types escaping adapter boundaries.
- Fallback behavior undocumented or inconsistent.

## Sources
- Dump B — `Architectural Patterns / Dependency inversion for providers`.
- Dump B — `Offline & Sync Patterns / capability-based provider selection`.
- Dump A — `4) Data Modeling & Storage / Supabase usage patterns`.
