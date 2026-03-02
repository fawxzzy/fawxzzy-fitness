# Offline-First Checklist

[Back to Index](../../INDEX.md)

- [ ] Local source-of-truth and sync boundaries are explicit. (Pattern: offline-first-sync. Source: Dump B `offline-first local persistence stack`)
- [ ] Provider capability detection and fallback behavior are defined. (Pattern: provider-adapters + offline-first-sync. Source: Dump B `capability-based provider selection`)
- [ ] Permission-failure behavior degrades safely with user-visible status. (Pattern: offline-first-sync. Source: Dump B `permission-aware filesystem workflow`, `fallback semantics`)
- [ ] Session/context race protection exists for async transactions. (Pattern: orchestration-vs-execution. Source: Dump B `epoch-based race protection`)
- [ ] If offline support is absent, TODO is recorded with impact. (Gap handling rule. Source: Dump A `no explicit PWA/offline sync implementation found`)
