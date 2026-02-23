# PR Quality Checklist

[Back to Index](../INDEX.md)

- [ ] Scope/problem statement is explicit and keeps change small. (Principle: clarity + speed. Source: Dump A `Core Principles / speed and clarity`; Dump B `Architecture-first decision making`)
- [ ] Module/server-client boundaries are preserved (no boundary leaks). (Pattern: modular-monolith-seams, server-client-boundaries. Source: Dump A `strict server/client boundaries`; Dump B `modular monolith seams`)
- [ ] Risk and rollback notes are included for behavior-impacting changes. (Principle: reversible rollout. Source: Dump A `schema rollout fallbacks`; Dump B `fallback semantics intentionally`)
- [ ] Verification evidence is provided at appropriate tier. (Pattern: ci-guardrails-and-verification-tiers. Source: Dump A `scripts and checks`; Dump B `verification tiers`)
- [ ] Changelog is updated in WHAT + WHY format. (Decision: changelog discipline. Source: Dump A `changelog discipline`; Dump B `changelog discipline`)
