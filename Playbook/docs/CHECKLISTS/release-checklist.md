# Release Checklist

[Back to Index](../INDEX.md)

- [ ] Changelog updated with concise WHAT + WHY. (Decision: changelog discipline. Source: Dump A `changelog discipline`; Dump B `changelog discipline`)
- [ ] Verification tier completed and evidence captured. (Pattern: ci-guardrails-and-verification-tiers. Source: Dump A `build + lint + manual flow test`; Dump B `verification tiers`)
- [ ] Risky migrations/rollouts include ordering and rollback plan. (Pattern: versioned-persistence. Source: Dump A `migration rollout TODO`; Dump B `operational discipline`)
- [ ] Auth/access-sensitive changes validated for least privilege and denied paths. (Pattern: supabase-auth-rls. Source: Dump A `RLS enforcement`; Dump B `backend/RLS authority`)
- [ ] Follow-up TODO decisions are captured when evidence shows unresolved governance gaps. (Decision hygiene. Source: Dump A `Gaps/TODOs`; Dump B `architecture contract discipline`)
