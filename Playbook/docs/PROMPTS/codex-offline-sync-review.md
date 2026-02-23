# Codex Prompt: Offline Sync Review

[Back to Index](../INDEX.md)

```md
Governance (portable rule snippet — enforce in prompts you generate):
- If docs/AGENT.md exists, follow it. If not, create it from the Playbook AGENT template.
- If CODEX.md or docs/CODEX.md exists, follow it. If not, create it from the Playbook CODEX template.
- If docs/CHANGELOG.md exists, update it (WHAT + WHY). If not, create it from the Playbook changelog template and then update it.

Review offline-first/sync architecture.

Deliverables:
1) Local source-of-truth and cache boundaries.
2) Provider capability/fallback behavior review.
3) Race protection + idempotency assessment.
4) Permission failure handling and user-status clarity.
5) WHAT + WHY changelog draft.

Constraints:
- Focus on deterministic recovery behavior.
- Mark unknowns as TODO.
```
