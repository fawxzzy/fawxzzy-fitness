# FP-FIT-REC-001 source recovery receipt

Date: 2026-07-17

Repository: `fawxzzy/fawxzzy-fitness`

Base: `origin/main` at `e1ab7fbea979456380230c5459fdef6ae4c927e9`

Branch: `codex/fp-fit-rec-001-source-recovery`

Supabase project ref: `lpswxoyfniocuhljgzbc`

## Outcome

FP-FIT-REC-001 restored the three migration source files that were absent from `origin/main`. The recovered bytes came only from immutable commit `60e2c1b182b87e5a719d9c32227c1d2ccf7ebeb5`; no stacked application changes were absorbed.

The local source denominator is now 101/101 with the exact complete-tree Git-blob manifest SHA-256 `d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e`. The pre-existing 98 migration sources are unchanged.

This packet does not claim full live content parity. The measured terminal status is:

- `OVERALL_CONTENT_PARITY=FAIL`
- `PARITY_GATE=BLOCKED`
- `RAW_BYTE_PARITY=UNKNOWN`

The next separately admitted owner packet is `FP-FIT-CONTENT-REC-002` for versions `043` and `20260709073000`. Only after that packet is resolved may `FP-PARITY-RATCHET-001` run. Neither successor is started here.

## Exact six-path scope

1. `supabase/migrations/20260713013116_exercise_timer_truth.sql`
2. `supabase/migrations/20260713020801_set_timing_truth.sql`
3. `supabase/migrations/20260716033653_routine_day_optional.sql`
4. `scripts/migration/fp-fit-rec-001-verify.mjs`
5. `scripts/migration/fp-fit-rec-001-verify.test.mjs`
6. `docs/ops/FP-FIT-REC-001-SOURCE-RECOVERY-RECEIPT.md`

`package.json`, application code, UI, Auth, billing, security policy, and every other migration remain outside scope.

## Recovered source provenance

| Source | Git blob | Raw SHA-256 | Provider bundle MD5 | Provider statement units |
|---|---|---|---|---:|
| `20260713013116_exercise_timer_truth.sql` | `e9acdd4b24c17dfc254503254b570a52a79548bf` | `388c4aa3bec9e7dd91d42bfe34fa0e8da2a4cc27652a7e9b9fca5c2bc8dedeb3` | `d2701d47ce960e1058d4e3d73537e01b` | 3 |
| `20260713020801_set_timing_truth.sql` | `5e34f762a255dcf40087e605f8f009e3215f1dff` | `82ce3b62e60c0c729405ae1af487b382de44d8c618c6dd07232223acd0348bd2` | `4ceecc520442c0c798fa1b21781cef8e` | 2 |
| `20260716033653_routine_day_optional.sql` | `f3fa17151024a57f9e62575f6dc4e8f5898fa5af` | `2b8d8b73e03f77b6034030a934a31b299529d852e406d4f74322d80866c45172` | `1988bf82878e3a26b4e065af2f7f6920` | 1 |

The MD5 values are classified as provider-returned statement-bundle digests. They are not raw source-file digests. The six whitespace-normalized local comparison units are frozen by SHA-256 manifest `3c789038ba4d6c41572d1c383844456db762ca9b6832ae95c1ff2f63a100460e`.

Exercise-timer statement 2 retains `RAW_FORMAT=UNKNOWN`; its provider-canonical parity digest is `e4e18ab38d3d33f71bb4c4b3f34f4963460bd503898236d5ad5efb436f566f19`. Provider-returned canonical text is not evidence of historical applied bytes, so no provider-identical raw-byte claim is made for any unit.

## Frozen live catalog evidence

| Evidence unit | Result |
|---|---:|
| Version denominator | 101/101 |
| Exact source/live names | 99/101 |
| Provider statement records | 795 |
| Exact statement counts | 77/101 migrations |
| Provider-canonical parity | 97/101 migrations |
| Whitespace parity | 98/101 migrations |
| Comment-plus-whitespace parity | 99/101 migrations |
| Raw byte parity | UNKNOWN |
| Overall content parity | FAIL / BLOCKED |

Live catalog digest under the accepted version/name/statement-count/provider-bundle canonicalization: `7856d247d6f18b7d2c97a18273bc6e235b9db382b4cb5c4868ed6e97bbc80e3`.

Historical live/Git name mappings retained explicitly:

- `20260515090309`: Git `055_discord_member_links`; live `20260515103000_055_discord_member_links`.
- `20260515090322`: Git `056_compact_public_member_numbers`; live `20260515120000_056_compact_public_member_numbers`.

Sanitized evidence manifests:

- provider statements: `cd50d4975a5652175ba56112d82ccf12ec59da0ebd9c283bf8a868d2cd98afd6`
- local source/statements: `3be3957e8314f539784ee20b393c885a7d448f75107070d2c549f83959856b15`
- classification: `86d7597a35d4b5eb84f173f83514ab91c850fa5cd0a6de47049df918714ddb57`
- combined evidence: `9144d6f2dad3ab191f92ff078a2e03fe189db7bc94a1b101e1c339c15309fa02`

## Preserved parity blockers

The following two versions remain substantive mismatches after comment and whitespace normalization. Their files are not edited by this packet because raw applied bytes are unavailable.

| Version | Local canonical SHA-256 | Provider canonical SHA-256 |
|---|---|---|
| `043` | `f032075540bc114053f5d1e7453a87abda7672f0787013990b3a807c6981a902` | `a451fd20688ec48b33b0d05f380c139382029447c4ecbb0d2bc30f419e965242` |
| `20260709073000` | `d9531d9fab4e1c9964df35c420003ea9b7f4758b8c232a849fa7cddbc553f240` | `db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2` |

Representation-only evidence is retained separately:

- `20260610121500`: whitespace-only digest `b5e0b3df17491c9bdca450fa51e43ca1dea20e19680759f7decba1351a5c18e2`.
- `20260709074946`: comment-plus-whitespace digest `c6893448c38ea7be6a184e9fa07887ec9176b24c9153c09c65e254fc0ea1c64f`.

## Replay boundary

`ZERO_TO_HEAD_LOCAL_REPLAY=BLOCKED`.

No installed Supabase CLI, Docker, Podman, or nerdctl command was available, and `supabase/config.toml` is absent. A plain PostgreSQL replay is not equivalent because the migration chain depends on Supabase-managed Auth objects. Current official Supabase local-development guidance requires the CLI, an initialized local project, and a Docker-compatible runtime: <https://supabase.com/docs/guides/local-development/cli/getting-started>.

Exact prerequisites for a future faithful replay are:

1. an owned, version-identified Supabase CLI;
2. an owned, running Docker-compatible container runtime;
3. a disposable unlinked directory with an explicit `supabase/config.toml`;
4. enough local resources for the Supabase stack;
5. zero remote link, push, reset, branch, project, schema, Auth, or data mutation.

No system runtime was installed, no remote Supabase project was created or linked, and no source or target project was touched.

## Verification

- Static verifier: PASS; 101 sources, 101 unique versions, exact first/last versions, exact complete-tree manifest, three raw source digests, three Git blob IDs, and six normalized units.
- Focused test: PASS; 12/12 tests, including missing, extra, renamed, changed-source, false raw-exact, and false full-parity rejection.
- Repository-required `npm run verify`: PASS against base `e1ab7fbea979456380230c5459fdef6ae4c927e9`.
- Existing-source invariance: PASS; the 98 pre-existing migration paths have no diff from the base.
- Dependency bootstrap: `npm ci` completed without lockfile changes. It reported 14 existing dependency advisories (3 moderate, 10 high, 1 critical); dependency remediation is outside this six-path packet.
- Local replay: BLOCKED for the exact prerequisites above; no substitute replay was claimed.

The verifier emits no SQL bodies, credentials, connection strings, secrets, user data, or provider payloads.
