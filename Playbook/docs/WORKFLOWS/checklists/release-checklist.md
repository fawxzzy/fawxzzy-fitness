# Release Checklist

[Back to Index](../../INDEX.md)

- [ ] Changelog updated with concise WHAT + WHY. (Decision: changelog discipline. Source: Dump A `changelog discipline`; Dump B `changelog discipline`)
- [ ] Verification tier completed and evidence captured. (Pattern: ci-guardrails-and-verification-tiers. Source: Dump A `build + lint + manual flow test`; Dump B `verification tiers`)
- [ ] Risky migrations/rollouts include ordering and rollback plan. (Pattern: versioned-persistence. Source: Dump A `migration rollout TODO`; Dump B `operational discipline`)
- [ ] Auth/access-sensitive changes validated for least privilege and denied paths. (Pattern: supabase-auth-rls. Source: Dump A `RLS enforcement`; Dump B `backend/RLS authority`)
- [ ] Follow-up TODO decisions are captured when evidence shows unresolved governance gaps. (Decision hygiene. Source: Dump A `Gaps/TODOs`; Dump B `architecture contract discipline`)
- [ ] Governance Scope Declaration is present and current. (Principle: Canonical Governance Contract. Source: Cross-repository governance audits, 2026-02 doctrine patch request)
- [ ] Verification tier enforcement is documented as a CI contract. (Pattern: ci-guardrails-and-verification-tiers. Source: Cross-repository governance audits, 2026-02 doctrine patch request)
- [ ] CI guard paths align with declared governance document paths. (Principle: Canonical Governance Contract; Pattern: ci-guardrails-and-verification-tiers. Source: Cross-repository governance audits, 2026-02 doctrine patch request)

## 2026-03-02 — Automate intentional tag-based release ritual
- Date: 2026-03-02
- Type: Workflow
- Summary: Standardize releases behind a SemVer bump command that updates changelog WHAT/WHY, commits, tags, and pushes in one deterministic flow.
- Rationale: Reduces accidental production deploys and keeps deploy intent auditable through explicit version/tag events.
- Evidence: scripts/release.mjs, package.json, docs/PROJECT_GOVERNANCE.md
- Status: Proposed

### Implementation Notes
**Do**
- Use one release command that performs SemVer bump + changelog update + commit + tag + tag push.
- Require verification tiers (lint/build/tests) before tagging.
- Keep changelog entries at WHAT/WHY level only.

**Don't**
- Perform ad-hoc click-deploy release steps without an auditable tag trail.
- Tag releases before verification checks pass.

```bash
npm run release -- patch
# expected flow: bump -> changelog WHAT/WHY -> commit -> tag -> push branch+tag
```

### Verification tiers before tagging
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Test suite or defined contract checks pass.
- [ ] Changelog WHAT/WHY reviewed.
- [ ] Tag points at the release commit.
