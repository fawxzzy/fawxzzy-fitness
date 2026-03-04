# Verification Tiers

Glossary-level definitions for selecting validation rigor per task.

- **Static:** Documentation and structural changes; no code execution required.
- **Build:** Changes requiring project build, lint, or test validation.
- **Contract:** Changes affecting schema, APIs, auth boundaries, or cross-repo invariants; requires highest verification rigor.

Tiers are selected per task and may escalate based on impact.
