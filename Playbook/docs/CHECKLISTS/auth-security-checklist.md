# Auth + Security Checklist

[Back to Index](../INDEX.md)

- [ ] Auth/session flow is request-aware and uses correct runtime boundary. (Pattern: server-client-boundaries. Source: Dump A `auth flow shape`, `runtime-dynamic auth routes`)
- [ ] Data ownership is explicit and row-level policy enforcement exists. (Pattern: supabase-auth-rls. Source: Dump A `user ownership + RLS mandatory`; Dump B `RLS takeaway`)
- [ ] Client role checks are treated as UX-only, not authority. (Principle: authoritative backend access control. Source: Dump B `local role guards only for UX shaping`)
- [ ] Sensitive keys/privileged clients are server-only. (Pattern: supabase-auth-rls. Source: Dump A `service role key must not be exposed`)
- [ ] Positive and denied-access test paths are included or TODO with rationale. (Pattern: ci-guardrails-and-verification-tiers + supabase-auth-rls. Source: Dump B `verification tiers`; Dump A `RLS policies`)
