# Fitness Design System Pack

This folder is the owner-truth surface for the Fitness design system.

Boundary rules:

- Fitness owns the canonical token and primitive contracts in this folder.
- Stack-root consumers may point at these files, but they must not restate or fork the truth.
- Live UI code may bridge to these contracts, but the contracts themselves stay repo-owned and machine-readable.

Current contents:

- `tokens.v1.json`: base spacing, typography, color, radius, shadow, and border tokens.
- `primitives.v1.json`: machine-readable contracts for the header, card, tag/badge, and section layout primitives.
- `schemas/tokens.v1.schema.json`: shape validation for the token pack.
- `schemas/primitives.v1.schema.json`: shape validation for the primitive pack.

Usage rules:

- Shared UI primitives consume these contracts, not ad hoc values.
- The contract surface freezes the intended shape of the UI system before broader screen adoption.
- Observation or enforcement layers should point here as the owner truth, not infer a second source of UI truth from live drift.
