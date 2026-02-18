# Codex Operating Instructions

Before implementing any non-trivial change:

1. Read:
   - docs/PROJECT.md
   - docs/ENGINE.md
   - docs/CHANGELOG.md
   - docs/AGENT.md

2. Respect product priorities:
   - Speed > polish
   - Deterministic logic
   - No feature bloat

3. For merge-worthy changes:
   - Update docs/CHANGELOG.md
   - Summarize WHAT changed and WHY
   - Do not describe implementation details

4. Ensure:
   - npm run build succeeds
   - No server/client boundary violations
   - No static export configuration
