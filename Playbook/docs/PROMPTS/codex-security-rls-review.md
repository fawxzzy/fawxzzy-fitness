# Codex Prompt: Security + RLS Review

[Back to Index](../INDEX.md)

```md
Governance (portable rule snippet — enforce in prompts you generate):
- If docs/AGENT.md exists, follow it. If not, create it from the Playbook AGENT template.
- If CODEX.md or docs/CODEX.md exists, follow it. If not, create it from the Playbook CODEX template.
- If docs/CHANGELOG.md exists, update it (WHAT + WHY). If not, create it from the Playbook changelog template and then update it.

Review authentication, authorization, and row-level access controls.

Deliverables:
1) Auth/session boundary review (server/client correctness).
2) Ownership + RLS policy coverage (positive and denied paths).
3) Privileged key/client exposure audit.
4) UI role-guard vs backend authority gap analysis.
5) WHAT + WHY changelog draft.

Constraints:
- Treat client-side guards as UX-only.
- Do not claim coverage without evidence.
```
