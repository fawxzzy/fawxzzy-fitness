# Pattern: UI/Controller Separation

[Back to Index](../INDEX.md)

## Problem
UI rendering gets overloaded with orchestration/state policy, reducing testability and clarity.

## Context
- Used when screens need non-trivial orchestration beyond rendering concerns.
- Assumes UI components should stay focused on presentation and events.
- Requires stable interfaces between controllers and views.

## Solution
- Build controllers/hooks that assemble view models and commands.
- Keep rendering components declarative and style-focused.
- Move infrastructure/data access out of presentational components.
- Use shared resolver contracts for repeated detail surfaces.
- Keep controller outputs deterministic and easy to snapshot-test.

## Tradeoffs
- More files and interfaces per feature surface.
- Poor naming can make controller/view split harder to follow.
- Over-separation can feel heavy for very small components.

## Example
Exercise detail sheet and page both consume one controller/resolver output while UI components only render sections and actions.

## When to use
- Complex screens require composition of data, permissions, and commands.

## When NOT to use
- Trivial static components with no coordination logic.

## Implementation outline
- Build controller/hooks/services that prepare view models.
- Keep rendering components focused on presentation and interaction wiring.
- Keep infrastructure/data access outside presentation components.

## Related guardrails
- [One canonical renderer and resolver for repeated detail surfaces](../GUARDRAILS/guardrails.md#one-canonical-renderer-and-resolver-for-repeated-detail-surfaces)
- [Resolve cached and aggregated stats by canonical entity ID](../GUARDRAILS/guardrails.md#resolve-cached-and-aggregated-stats-by-canonical-entity-id)

## Common failure modes
- Controllers leaking UI concerns (styling/layout decisions).
- Components invoking infrastructure directly.

## Sources
- Dump B — `Architectural Patterns / UI/controller separation pattern`.
- Dump A — `2) Core Principles / strict server/client boundaries`.
