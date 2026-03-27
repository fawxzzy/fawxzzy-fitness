# Fitness Integration Architecture

## Purpose

Fitness is the first governed ecosystem participant and publishes a deterministic integration contract that can be reused by future apps.

## Contract surfaces

Fitness exposes these contract surfaces in `src/lib/ecosystem`:

- app identity (`fitness` as a `sensor-actuator`)
- supported deterministic signals
- supported deterministic state snapshots
- supported bounded actions
- declared receipt types
- routing and constraint metadata

## Governed loop (required)

**Rule: Every app must participate through the same governed signal -> plan -> action -> receipt loop.**

Fitness follows this governed sequence:

1. Emit deterministic signals to Playbook.
2. Allow planning in Playbook.
3. Execute bounded actions through the Playbook/Lifeline seam.
4. Emit typed receipts for action outcomes.

## Ecosystem participation model

**Pattern: apps are sensors and actuators in the ecosystem, not isolated silos.**

Fitness operates as a sensor (signals + state snapshots) and actuator (bounded actions + receipts) under one contract.

## Failure mode

**Failure Mode: standalone app logic that never feeds Playbook destroys compounding value.**

Any logic that emits local decisions without producing governed ecosystem signals, bounded actions, and receipts violates this architecture.

## Deterministic fixtures and truth pack

The repo includes deterministic fixtures for all signal and state snapshot types and a human-readable truth pack under `truth-pack/fitness/`.

These artifacts are designed to be:

- inspectable
- deterministic
- contract-validatable
- reusable as reference context for future governed app integrations
