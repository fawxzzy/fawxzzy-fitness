# Codex Bootstrap

Always follow docs/PROJECT_GOVERNANCE.md.

Required reading before implementing changes:

1. docs/PROJECT_GOVERNANCE.md
2. docs/ARCHITECTURE.md (if present)
3. docs/PLAYBOOK_CHECKLIST.md (if present)
4. docs/playbook-status.json

Development loop:

plan -> smallest diff -> implement -> npm run playbook:auto -> update docs/CHANGELOG.md when required

Knowledge capture:

if change introduces reusable principle/guardrail/pattern/failure mode, append to docs/PLAYBOOK_NOTES.md
