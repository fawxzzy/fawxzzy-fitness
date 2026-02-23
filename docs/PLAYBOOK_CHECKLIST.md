# Playbook Checklist (Codex Gate)

Before implementing any change:

Read relevant sections in Playbook/ (vendored via git subtree).

Verify Playbook integrity:

Confirm Playbook/README.md exists.

If Playbook/ is missing or empty, STOP and report. Do not proceed.

Confirm the requested change aligns with:

Mobile-first UX (fast, simple, consistent)

Clean server/client boundary (no client DB writes)

RLS safety preserved

Minimal tech debt / avoid duplication

Clear, maintainable architecture

If the request conflicts with Playbook:

Explicitly call out the conflict

Propose a compliant alternative

Wait for confirmation if deviation is required

Implementation discipline:

Prefer the smallest diff that satisfies the request

Avoid unnecessary abstraction

Do not introduce architectural drift

Documentation:

Update docs/CHANGELOG.md

Include:

WHAT changed

WHY it changed

Do not dump implementation details into the changelog

Quality gate:

Run npm run lint

Run npm run build
