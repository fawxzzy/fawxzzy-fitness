# FP-FIT-USER-NUMBER-SAFETY-001

## Outcome

This source packet retires automatic member-number compaction and defines Fitness human member numbers as immutable, unique, and never reused. It does not update an existing profile, execute a sequence, apply SQL to Supabase, or move allocation to the future shared platform.

Source base: `bab188a51819a6fb2f8aeabe73627d4ed63dcaa4`.

## Preimage

The read-only preparation pass proved the source project still had both of these enabled trigger paths:

- `profiles_assign_real_user_number_before_insert` -> `public.assign_real_user_number_on_profile_insert()`
- `profiles_compact_human_member_numbers_after_delete` -> `public.compact_human_member_numbers_after_profile_delete()` -> `public.compact_human_member_numbers_preserving_zero()`

The delete path rewrote surviving positive human numbers into a dense range and restarted `public.real_user_number_seq` downward. The same pass proved that own-profile insert/update/delete policies are enabled, the exposed profile columns were writable, and client roles held sequence privileges. Removing the delete trigger alone would therefore not satisfy immutable, never-reused identity semantics.

No raw profile identifiers or secret values are part of this receipt.

## Forward Migration Contract

`20260718015422_retire_human_member_number_compaction.sql` is forward-only and transactional. It:

1. Takes an `ACCESS EXCLUSIVE` lock on `public.profiles`.
2. Fails closed unless the assignment trigger and function are exact and enabled; the named sequence resolves to exactly one authoritative catalog row, increments by one, cannot cycle, uses `CACHE 1`, and has an effective-next value above every non-null member number already reserved by any profile; and `profiles_user_number_uq` is the live, ready, valid one-key `user_number` partial unique index on `public.profiles`. `CACHE 1` is required because a larger cache can leave lower preallocated values in another session even when `last_value` appears above the observed high-water mark. Compaction objects must form either the exact legacy set or the fully retired set. For a non-empty profile denominator, exactly one existing profile reserves `#0` as a human with assignment metadata, every numbered profile is human and has assignment metadata, and all profile identity invariants must hold. A pristine zero-profile migration chain is admitted only when every profile/member-number denominator is empty and the integer sequence retains the exact historical state created by migrations `044` and `056`: start/minimum/current/effective-next `1`, maximum `2147483647`, `is_called=false`, increment `1`, `CACHE 1`, and no cycling. Any empty-but-advanced, empty-but-reconfigured, non-empty-without-`#0`, or otherwise partial state fails before DDL.
3. Transactionally reinstalls the immutable historical `public.is_automation_auth_user(uuid)` SQL/STABLE/SECURITY DEFINER definition, `search_path`, postgres ownership, and client execution revokes before the assignment function can use it.
4. Drops the compaction trigger, delete wrapper, and compactor with `IF EXISTS` and `RESTRICT`, never `CASCADE`.
5. Redefines insert assignment so automation profiles are always unnumbered and every new human receives `nextval`, regardless of caller-supplied identity values.
6. Adds `public.enforce_immutable_profile_member_identity()` and `profiles_enforce_immutable_member_identity_before_update`; same-value updates pass, while changes to `user_number`, `user_kind`, or `user_number_assigned_at` fail.
7. Removes sequence mutation/allocation privileges from public client roles and `service_role`; `service_role` retains read-only `SELECT`, while the postgres-owned `SECURITY DEFINER` assignment function remains the allocator.
8. Adds comments that freeze immutable, never-reused semantics.

The migration contains no profile `INSERT` or `UPDATE`, `setval`, sequence restart, sequence reseed, hard-coded next number, historical migration edit, or data backfill. It does not manufacture `#0` for a pristine chain. Deletion remains allowed and creates a permanent gap.

## Source Audit Contract

`scripts/member-number-safety-core.mjs` is the shared deterministic model for the operator audit and Discord community doctor.

- Permanent positive gaps are expected information.
- Gap output reports the exact gap count, whether the displayed evidence is capped, and at most 100 example values.
- Duplicate numbers remain failures.
- Negative human numbers remain failures.
- Missing, duplicate, non-human, or assignment-metadata-free `#0` remains a failure.
- Automation profiles with numbers remain failures.
- Legacy `unknown`, null-kind, or future unrecognized profiles with numbers remain failures.
- Every numbered human missing `user_number_assigned_at` remains a failure, not only the profile reserving `#0`.
- Both consumers use one shared complete-profile keyset paginator with an exact unfiltered count, a page size of at most 1,000, stable unique `id` ordering, an exclusive `id > prior final id` cursor, strictly increasing cross-page identities, and an empty after-denominator probe. Missing or changing counts, early short pages, extra rows, repeated/non-monotonic identifiers, provider errors, and bounded-capacity overflow all fail closed.
- The audit is intentionally a bounded non-snapshot read: keyset progression prevents offset shifts from skipping the next row after the prior cursor, while count drift and denominator probes fail closed on observable concurrent change. It does not claim transaction-snapshot consistency; provider apply still requires the separately governed write freeze and action-time database checks.
- Both consumers load `user_number_assigned_at`, and the shared fatal-reason predicate is the sole structural exit authority for the exactly-one-human-`#0` metadata invariant, every numbered-human metadata invariant, and every numbered nonhuman classification.
- Operator output includes only aggregate pagination evidence and sanitized safety facts. It does not emit profile IDs, email addresses, Discord IDs, page bodies, or reusable identifier hashes.

The scripts do not claim to read the live sequence. They report the minimum safe next number from the observed high-water mark; action-time SQL must independently prove the real sequence effective-next value against every non-null profile number, not only rows already classified as human.

## Verification

The packet includes a committed-tree verifier and focused deterministic tests. The verifier pins the accepted base, disables Git replacement objects, reads the requested commit once as an immutable SHA, freezes the exact nine-path denominator, checks immutable historical migration digests, validates migration semantics, and proves this Playbook update is append-only.

Required source gates:

- `node --test scripts/member-number-safety-core.test.mjs scripts/migration/fp-fit-user-number-safety-verify.test.mjs`
- `node scripts/migration/fp-fit-user-number-safety-verify.mjs --ref HEAD`
- `npm run migration:validate`
- branch-aware `npm run verify`
- exact path, LF, migration-diff, credential, secret, and machine-path scans

For the source-only branch, `npm run migration:validate` must identify this file as the sole pending migration and stop without applying it. A clean zero-pending result is only valid after a separately authorized provider apply; it is not a source-PR acceptance condition.

`FULL_CHAIN_REPLAY: BLOCKED`

The repository has no admitted disposable full-chain Supabase harness for this packet. Merge acceptance requires faithful replay of the complete chain, middle-number deletion with survivor mapping proof, concurrent human allocation above the prior high-water mark, automation-null proof, immutable-update proof, idempotent reapply, and denied sequence reset. Native PostgreSQL, remote Supabase, or provider SQL are not substitutes.

`PROVIDER_APPLY: NOT_AUTHORIZED`

Production application is a separate owner/provider packet. It requires an exact project and writer lease, current backup/PITR posture, an API/profile-write freeze, migration-list and dry-run proof, provider-side aggregate/mapping digests, exact object readback, and zero existing-row drift. No live synthetic human signup is required because even a rolled-back sequence allocation creates a permanent gap.

## Rollback And Cutover

Compaction must never be recreated as rollback. Application/source rollback may proceed while this migration remains applied. Any database rollback or temporary identity-trigger disable requires a separate forward migration, exclusive lock, exact disposition manifest, and explicit destructive authority.

The later shared-platform cutover must calculate its floor at freeze time as the maximum of the source maximum plus one, the source sequence effective-next value, and the target global high-water plus one. It must never hard-code the currently observed successor. The target allocator must be admitted and proven before source allocation is disabled, with exactly one allocator active.

## Separate Finding

Profile-only deletion can leave a stale `discord_member_links` snapshot because that relationship follows `auth.users`, while snapshot refresh only joins extant profiles. That predates this migration and belongs to the account-deletion/data-lifecycle lane; this packet does not widen into it.
