# Pattern: Orchestration Density Control

[Back to Index](../INDEX.md)

## Problem
Large delivery surfaces become fragile when UI rendering, orchestration, and execution logic are mixed in one place.

## Why it matters
- Regression risk rises as one file accumulates unrelated responsibilities.
- Mixed concerns reduce testability because orchestration paths are hard to isolate.
- Review quality drops when behavior and rendering changes are entangled.

## Pattern
Extract orchestration into dedicated modules and keep routes/components focused on composition and presentation.

- Presentation layers should render state and trigger explicit orchestration entry points.
- Orchestration modules should coordinate policy, sequencing, retries, and side-effect ordering.
- Execution units should perform narrow operation steps with explicit inputs/outputs.

## Clarification
This is seam hygiene inside a modular codebase, **not** a microservices mandate.

## Triggers and heuristics
Use this pattern when one or more of these are true:
- A route/component contains both orchestration and rendering logic.
- Coordination logic is reused across multiple surfaces.
- A file has high orchestration density (multiple side-effect branches, retries, or provider-selection branches).
- Behavior tests are difficult because orchestration can only be exercised through rendering tests.

## Common failure modes
- Creating new "god files" by adding orchestration to UI surfaces for short-term speed.
- Extracting too late, after coordination logic is duplicated with slight drift.
- Over-fragmenting early without clear orchestration boundaries.

## Sources
- Cross-repository regression reviews — orchestration density and testability drift findings (2026-02 doctrine patch request).
- Dump B — `Architectural Patterns / Policy-Coordination split`, `UI/controller separation pattern`.
