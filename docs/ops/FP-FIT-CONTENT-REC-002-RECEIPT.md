# FP-FIT-CONTENT-REC-002 terminal receipt

Date: 2026-07-17

Repository: `fawxzzy/fawxzzy-fitness`

Base branch: `main`

Exact base: `d50fb86bf9e1ec77af0eb922eb7d99da212f5264`

Packet branch: `codex/fp-fit-content-rec-002`

## Outcome

Unit A's proposed executable replacement did not survive exact-head review. The 303-byte provider-canonical blob assumes `public.exercises.slug` already exists, but the repository's ordered migration chain does not create that column before version `043`. The terminal packet therefore keeps the 376-byte replay-safe repository blob executable because it creates `slug` immediately before the catalog update, and preserves the exact 303 provider-canonical bytes at `docs/registry/migrations/provenance/043_hide_standalone_stretch_catalog_rows.provider-canonical.sql.txt` as committed non-executable historical provenance.

Unit B remains evidence-only. The executable `20260709073000_billing_subscription_receipt_dedupe.sql` source is unchanged at its reachable 4,231-byte Git blob. The provider-canonical representation is bound only by evidence class, byte length, and normalized digest. Raw-byte provenance remains `UNKNOWN`, historical executable replacement remains `PROHIBITED`, and no provider SQL body is stored in this packet.

This is a repository-only receipt. No Supabase project was read, linked, logged into, queried, mutated, pushed, reset, or deployed. No Auth, schema, data, environment, credential, Vercel, Discord, or production action occurred.

## Root cause and preserved contracts

The initial packet treated exact provider bytes as sufficient executable truth. Exact-head review disproved that assumption: migration `008` creates `public.exercises` without `slug`, version `043` reads `slug`, and the next repository migration that adds the column is `20260505065000`, which runs later. Replacing the executable with the provider-canonical blob would therefore break a fresh ordered replay. Provider provenance and executable replay safety are separate contracts; this packet now preserves both without inventing a synthetic historical migration.

Version `20260709073000` has a provider-canonical representation but no reachable raw-identical source. Conflating the normalized provider representation with raw-byte recovery would fabricate provenance and could change historical behavior. Its executable path remains frozen until a later owner receipt, behavior/schema parity proof, faithful disposable Supabase replay, and explicit governance packet.

## Exact path boundary

1. `docs/registry/migrations/FP-FIT-CONTENT-REC-002.v1.json`
2. `docs/registry/migrations/provenance/043_hide_standalone_stretch_catalog_rows.provider-canonical.sql.txt`
3. `scripts/migration/fp-fit-content-rec-002-verify.mjs`
4. `scripts/migration/fp-fit-content-rec-002-verify.test.mjs`
5. `docs/ops/FP-FIT-CONTENT-REC-002-RECEIPT.md`

The original four evidence and verifier paths remain intact; the fifth path is the review-required, non-executable provenance artifact. No migration differs from the admitted base in the terminal diff. No package, product, application, UI, general test, recovered PR-106 source, or `docs/PLAYBOOK_NOTES.md` path is changed by this packet.

## Re-admission and review settlement

ATLAS MAIN re-admitted this packet after the bounded PR-106 review fix. The new base `7389a0762f0d4318844681ecd06744fcc9138e2e` is one clean additive commit over the old base `7a7b21148199d49b3165651e41575b1fb74a1c12`; its three changed paths do not overlap this packet.

The preserved five-path residue was committed on the old base as local checkpoint `5fad1278b06dcd71f6fbd450e927e29d0632cc08`, then rebased without conflict onto the new base as `af4d02a6265123a5f98d148b11d126c4fc2cfe97`. Exact-head review on `b78c4710ade211c69711e4f13da4948181ce54b2` then identified the missing pre-version-043 `slug` precondition. The terminal review settlement restores the replay-safe version-043 executable and limits the stacked diff to the four evidence and verifier paths above.

PR #106 subsequently merged to `main` as merge commit `d50fb86bf9e1ec77af0eb922eb7d99da212f5264` with the exact reviewed tree. This packet was rebased onto that main commit and retargeted to `main` without changing any migration. The later squash-safety review required the additive fifth path above so the provider-canonical blob remains reachable from this tree and from a future squash merge.

## Provenance result

| Evidence | Terminal state |
|---|---|
| Version denominator | `101/101` preserved |
| Prior FP-FIT-REC-001 source manifest | `d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e` |
| Terminal source manifest | `d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e` |
| Version `043` replay-safe executable Git blob | `42a8bd9aef05ad8aeb5efd8db644bc70a711a78f` |
| Version `043` replay-safe executable raw SHA-256 | `f5231385f72b80ecac0c5f92616e2d1a692ee61b88cdca738386a1ddee077346` |
| Version `043` provider-canonical historical Git blob | `ceb74dae0443e4f5b4ef83ae56e989f9ae6d1395` |
| Version `043` provider-canonical historical raw SHA-256 | `e0aa179c8d32e662ce747d8121bd6fcec893ec592e2daa5675a993358894c534` |
| Version `043` provider-canonical provenance storage | committed non-executable `.sql.txt` path; 303 bytes; blob reachable from the packet tree |
| Version `043` provider blob executable status | `PROHIBITED_UNTIL_TARGET_BOOTSTRAP_PROVES_SLUG_PRECONDITION` |
| Version `20260709073000` executable Git blob | `5d15f5b7232f40e750c696b536d5b08145c64037` unchanged |
| Version `20260709073000` executable raw SHA-256 | `2ba64e3725d014abca605528175f551826f43da433caf8c30c27b96d804569ea` |
| Provider-canonical representation binding | 163 bytes; normalized SHA-256 `db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2` |
| Version `20260709073000` raw-byte provenance | `UNKNOWN` |
| Version `20260709073000` historical replacement | `PROHIBITED` |

The two historical name aliases remain frozen in the machine-readable manifest. No migration version or filename changed.

## Parity and replay gates

The repository-only projection remains provider-canonical `97/101`, whitespace `98/101`, and comment-plus-whitespace `99/101`. Versions `043` and `20260709073000` remain unresolved, raw-byte parity remains `UNKNOWN`, and `OVERALL_CONTENT_PARITY=BLOCKED`. This avoids converting source parity into a false replay claim.

`ZERO_TO_HEAD_LOCAL_REPLAY=BLOCKED` because no admitted local Supabase runtime exists. In addition, adopting the provider-canonical `043` executable remains blocked until a separately governed target-bootstrap packet proves that `slug` exists before version `043` in a faithful disposable replay. Native PostgreSQL, synthetic historical migrations, and remote Supabase are prohibited substitutes for this packet.

## Verification

The committed review-settled packet passed these repository-only gates before publication:

- focused verifier: PASS twice with byte-identical JSON and zero issues;
- focused tests: PASS, including committed-path reachability and path/byte-contract drift rejection;
- repository-required branch-aware `npm run verify`: PASS against merged `origin/main` at `d50fb86bf9e1ec77af0eb922eb7d99da212f5264`;
- exact ancestry, preserved four-path contract, and additive provenance-path allowlist: PASS;
- migration scope: PASS with zero migration changes from the admitted base;
- exact blob and raw SHA-256 checks: PASS for replay-safe executable 043, provider-canonical historical 043 provenance, and executable `20260709073000`;
- source denominator, historical aliases, committed LF, JSON, JavaScript syntax, diff, credential, and machine-path checks: PASS;
- clean worktree and upstream parity: required after the final receipt commit and push.

Local Supabase replay remains blocked by the explicitly preserved no-runtime gate; no substitute may be attempted.

## Successor boundary

The next work is not the parity ratchet. First, a separately admitted target-bootstrap/replay packet must prove the pre-version-043 `slug` contract, and version `20260709073000` still requires owner governance plus behavior/schema parity and raw provenance resolution. `FP-PARITY-RATCHET-001` remains prohibited until those gates are satisfied. This receipt does not start another packet.
