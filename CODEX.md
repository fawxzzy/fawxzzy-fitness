# Codex Bootstrap

Always follow repository governance.

Required reading before implementing changes:

1. docs/PROJECT_GOVERNANCE.md
2. docs/ARCHITECTURE.md (if present)
3. docs/PLAYBOOK_CHECKLIST.md
4. docs/playbook-status.json

Development loop:

1. Plan implementation.
2. Implement smallest clear diff.
3. Run:

npm run playbook:auto

4. Update docs/CHANGELOG.md if required.

If a change introduces reusable engineering knowledge:

Append an entry to docs/PLAYBOOK_NOTES.md.

Never violate architectural contracts defined in governance documents.
