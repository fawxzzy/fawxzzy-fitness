# Playbook Checklist (Codex Gate)

Before implementing any change:
1) Read Playbook/ (Playbook submodule) - (https://github.com/ZachariahRedfield/Playbook/tree/5792c9dd41a675090683f719c93860c9ece6df86) relevant sections.
2) If Playbook/ is missing or empty, do not proceed. Initialize submodules first (git submodule update --init --recursive).
3) Confirm change aligns with:
   - Mobile-first UX (fast, simple, consistent)
   - Clean server/client boundary (no client DB writes)
   - RLS safety preserved
   - Minimal tech debt / avoid duplication
4) If request conflicts with Playbook:
   - Call it out
   - Propose compliant alternative
5) Implement with smallest diff that satisfies the request.
6) Update docs/CHANGELOG.md (WHAT + WHY).
7) Run: npm run lint && npm run build
