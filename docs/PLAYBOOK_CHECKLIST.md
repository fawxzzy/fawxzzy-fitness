# Playbook Checklist (Codex Gate)

Before implementing any change:
1) Read Playbook/ (Playbook submodule) - (https://github.com/ZachariahRedfield/Playbook/tree/5792c9dd41a675090683f719c93860c9ece6df86) relevant sections.
2) Confirm change aligns with:
   - Mobile-first UX (fast, simple, consistent)
   - Clean server/client boundary (no client DB writes)
   - RLS safety preserved
   - Minimal tech debt / avoid duplication
3) If request conflicts with Playbook:
   - Call it out
   - Propose compliant alternative
4) Implement with smallest diff that satisfies the request.
5) Update docs/CHANGELOG.md (WHAT + WHY).
6) Run: npm run lint && npm run build
