# Codex Prompt: Architecture Review

[Back to Index](../INDEX.md)

```md
Governance (portable rule snippet — enforce in prompts you generate):
- If docs/AGENT.md exists, follow it. If not, create it from the Playbook AGENT template.
- If CODEX.md or docs/CODEX.md exists, follow it. If not, create it from the Playbook CODEX template.
- If docs/CHANGELOG.md exists, update it (WHAT + WHY). If not, create it from the Playbook changelog template and then update it.

Review architecture for seams, boundaries, determinism, and operational guardrails.

Deliverables:
1) Boundary map (modules + ownership + allowed dependencies).
2) Violations (server/client leaks, UI/controller mixing, provider leakage).
3) Risk-ranked refactor plan in incremental PRs.
4) Decision updates (What/Why/Tradeoffs).
5) Changelog update recommendation in WHAT + WHY.

Constraints:
- No invented facts.
- Prefer smallest safe refactors first.
```
