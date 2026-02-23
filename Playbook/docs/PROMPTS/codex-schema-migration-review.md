# Codex Prompt: Schema Migration Review

[Back to Index](../INDEX.md)

```md
Governance (portable rule snippet — enforce in prompts you generate):
- If docs/AGENT.md exists, follow it. If not, create it from the Playbook AGENT template.
- If CODEX.md or docs/CODEX.md exists, follow it. If not, create it from the Playbook CODEX template.
- If docs/CHANGELOG.md exists, update it (WHAT + WHY). If not, create it from the Playbook changelog template and then update it.

Review proposed schema/persistence changes for safety.

Deliverables:
1) Versioning and compatibility assessment.
2) Rollout ordering + mixed-version risk analysis.
3) Backfill/verification query checklist.
4) Rollback posture and irreversible-step warnings.
5) WHAT + WHY changelog draft.

Constraints:
- Assume production data exists.
- Prefer additive/reversible rollout.
```
