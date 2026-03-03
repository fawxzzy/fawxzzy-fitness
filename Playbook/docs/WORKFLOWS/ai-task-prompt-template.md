# AI Task Prompt Template (Route-Aware)

Use this template to run repository tasks through project routing + governance compliance before coding.

## Template

```md
Follow docs/PROJECT_GOVERNANCE.md and docs/PLAYBOOK_CHECKLIST.md.

Target project:
- Project: <name>
- Project router: docs/PROJECTS/index.md
- Project overlay: docs/PROJECTS/<overlay>.md

Change classification:
- Type: UI-only | API | Data/Schema | Refactor | Performance | Release | Docs
- Scope summary: <1-3 bullets>

Verification tier:
- Tier: Static | Build | Contract
- Justification: <why this tier matches risk + change type>

Pre-coding compliance review:
- Relevant Core docs:
  - Principles: <links>
  - Patterns: <links>
  - Guardrails: <links>
  - Workflows/checklists: <links>
- Relevant overlay notes:
  - <project-specific pointers>
- Conflicts identified:
  - <none or list>
- Compliant approach:
  - <small-diff plan>

Expected file touch list:
- <file path 1>
- <file path 2>

Execution plan (small diffs):
1) <step>
2) <step>
3) <step>

Post-implementation steps:
- Run required checks for selected verification tier.
- Update docs/CHANGELOG.md with WHAT + WHY for non-trivial changes.
- Update docs indexes if new canonical docs were added or moved.
```

## Usage notes

- Keep prompts repo-agnostic; project overlays provide project-specific constraints and examples.
- Always cite both the router (`docs/PROJECTS/index.md`) and the selected overlay.
- Choose the smallest verification tier that is compliant with risk and checklist requirements.

