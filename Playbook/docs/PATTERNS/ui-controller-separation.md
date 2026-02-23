# Pattern: UI/Controller Separation

[Back to Index](../INDEX.md)

## Problem
UI rendering gets overloaded with orchestration/state policy, reducing testability and clarity.

## When to use
- Complex screens require composition of data, permissions, and commands.

## When NOT to use
- Trivial static components with no coordination logic.

## Implementation outline
- Build controller/hooks/services that prepare view models.
- Keep rendering components focused on presentation and interaction wiring.
- Keep infrastructure/data access outside presentation components.

## Common failure modes
- Controllers leaking UI concerns (styling/layout decisions).
- Components invoking infrastructure directly.

## Sources
- Dump B — `Architectural Patterns / UI/controller separation pattern`.
- Dump A — `2) Core Principles / strict server/client boundaries`.
