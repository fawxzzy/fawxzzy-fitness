# Pattern: Modular Monolith Seams

[Back to Index](../INDEX.md)

## Problem
Fast-moving monoliths degrade when features couple directly and bypass ownership boundaries.

## When to use
- One deployable artifact is preferred.
- Teams need explicit feature ownership and stable integration points.

## When NOT to use
- Independent deployment/runtime isolation is an immediate hard requirement.

## Implementation outline
- Partition by capability with explicit public entry points.
- Keep shared concerns centralized in common layers, not ad-hoc cross-feature imports.
- Document allowed dependency directions and enforce in review.

## Common failure modes
- Shared layer becomes an ungoverned dumping ground.
- “Temporary” cross-module shortcuts become permanent.

## Sources
- Dump B — `Core Principles / Modular monolith with strict seams`.
- Dump B — `Architectural Patterns / Layered module composition`.
