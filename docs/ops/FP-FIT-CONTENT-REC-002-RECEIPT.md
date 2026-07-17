# FP-FIT-CONTENT-REC-002 terminal receipt

Date: 2026-07-17

Repository: `fawxzzy/fawxzzy-fitness`

Base branch: `codex/fp-fit-rec-001-source-recovery`

Exact base: `7a7b21148199d49b3165651e41575b1fb74a1c12`

Packet branch: `codex/fp-fit-content-rec-002`

## Outcome

Unit A reconciles executable migration version `043` to the exact 303-byte immutable Git source accepted as provider-canonical. The previous 376-byte executable blob remains preserved by Git identity and raw SHA-256 in the machine-readable manifest. Its extra statement has no accepted intent evidence; if that statement is intended, it requires a separately governed forward migration.

Unit B remains evidence-only. The executable `20260709073000_billing_subscription_receipt_dedupe.sql` source is unchanged at its reachable 4,231-byte Git blob. The provider-canonical representation is bound only by evidence class, byte length, and normalized digest. Raw-byte provenance remains `UNKNOWN`, historical executable replacement remains `PROHIBITED`, and no provider SQL body is stored in this packet.

This is a repository-only receipt. No Supabase project was read, linked, logged into, queried, mutated, pushed, reset, or deployed. No Auth, schema, data, environment, credential, Vercel, Discord, or production action occurred.

## Root cause and preserved contracts

The executable version-043 source had been edited after live application, adding a statement not present in the accepted historical provider-canonical Git blob. This created substantive source drift. Because the accepted historical blob is reachable and exact for version `043`, the coherent bounded repair is source restoration plus immutable provenance for the displaced bytes—not an executable copy or an assertion that the added statement was intended.

Version `20260709073000` has a provider-canonical representation but no reachable raw-identical source. Conflating the normalized provider representation with raw-byte recovery would fabricate provenance and could change historical behavior. Its executable path is therefore frozen unchanged until a later owner receipt, behavior/schema parity proof, faithful disposable Supabase replay, and explicit governance packet.

## Exact path boundary

1. `supabase/migrations/043_hide_standalone_stretch_catalog_rows.sql`
2. `docs/registry/migrations/FP-FIT-CONTENT-REC-002.v1.json`
3. `scripts/migration/fp-fit-content-rec-002-verify.mjs`
4. `scripts/migration/fp-fit-content-rec-002-verify.test.mjs`
5. `docs/ops/FP-FIT-CONTENT-REC-002-RECEIPT.md`

No package, product, application, UI, general test, other migration, recovered PR-106 source, or `docs/PLAYBOOK_NOTES.md` path is changed by this packet.

## Provenance result

| Evidence | Terminal state |
|---|---|
| Version denominator | `101/101` preserved |
| Prior FP-FIT-REC-001 source manifest | `d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e` |
| Reconciled source manifest | `f6bd16c1f2999fb655958eae0262896a77436bd153f31693d4c464f20eed7fad` |
| Version `043` executable Git blob | `ceb74dae0443e4f5b4ef83ae56e989f9ae6d1395` |
| Version `043` executable raw SHA-256 | `e0aa179c8d32e662ce747d8121bd6fcec893ec592e2daa5675a993358894c534` |
| Displaced version `043` Git blob | `42a8bd9aef05ad8aeb5efd8db644bc70a711a78f` |
| Displaced version `043` raw SHA-256 | `f5231385f72b80ecac0c5f92616e2d1a692ee61b88cdca738386a1ddee077346` |
| Version `20260709073000` executable Git blob | `5d15f5b7232f40e750c696b536d5b08145c64037` unchanged |
| Version `20260709073000` executable raw SHA-256 | `2ba64e3725d014abca605528175f551826f43da433caf8c30c27b96d804569ea` |
| Provider-canonical representation binding | 163 bytes; normalized SHA-256 `db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2` |
| Version `20260709073000` raw-byte provenance | `UNKNOWN` |
| Version `20260709073000` historical replacement | `PROHIBITED` |

The two historical name aliases remain frozen in the machine-readable manifest. No migration version or filename changed.

## Parity and replay gates

The accepted prior evidence was provider-canonical `97/101`, whitespace `98/101`, and comment-plus-whitespace `99/101`, with substantive mismatches exactly at versions `043` and `20260709073000`.

After the exact Unit A replacement, the repository-only projection is provider-canonical `98/101`, whitespace `99/101`, and comment-plus-whitespace `100/101`. Version `20260709073000` remains unresolved, raw-byte parity remains `UNKNOWN`, and `OVERALL_CONTENT_PARITY=BLOCKED`. These projected counts are not a new provider measurement.

`ZERO_TO_HEAD_LOCAL_REPLAY=BLOCKED` because no admitted local Supabase runtime exists. Native PostgreSQL and remote Supabase are prohibited substitutes for this packet.

## Verification

Terminal verification is recorded after the committed packet is checked. Until then, this section is intentionally `PENDING`.

- focused verifier, deterministic run 1: `PENDING`
- focused verifier, deterministic run 2: `PENDING`
- focused tests, deterministic run 1: `PENDING`
- focused tests, deterministic run 2: `PENDING`
- repository-required branch-aware verification: `PENDING`
- exact base/head ancestry and stacked diff: `PENDING`
- exact five-path allowlist and migration denominator: `PENDING`
- committed LF plus JSON parse: `PENDING`
- credential, secret, and machine-path scans: `PENDING`
- clean worktree and upstream parity: `PENDING`
- exact-head Codex review and unresolved-thread reads: `PENDING`

## Successor boundary

The exact next packet remains `FP-PARITY-RATCHET-001`, but it is prohibited until this packet and the faithful replay/governance gates are satisfied. This receipt does not start that packet.
