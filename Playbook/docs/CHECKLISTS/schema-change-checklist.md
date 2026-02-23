# Schema Change Checklist

[Back to Index](../INDEX.md)

- [ ] Change is versioned/migration-aware with ordering documented. (Pattern: versioned-persistence. Source: Dump A `ordered SQL migrations`; Dump B `versioned persistence contract`)
- [ ] Rollout sequence handles mixed-version windows safely. (Principle: additive/reversible rollout. Source: Dump A `schema rollout risk`; Dump B `fallback semantics`)
- [ ] Backfill/verification queries are defined before rollout. (Pattern: versioned-persistence. Source: Dump A `migration evidence`; Dump B `operational discipline`)
- [ ] Authorization/ownership implications are reviewed with schema changes. (Pattern: supabase-auth-rls. Source: Dump A `RLS enforcement`; Dump B `authoritative backend/RLS enforcement`)
- [ ] Rollback posture is documented for risky steps. (Decision: persistence contract + ops discipline. Source: Dump A `migration rollout TODO`; Dump B `verification tiers`)
