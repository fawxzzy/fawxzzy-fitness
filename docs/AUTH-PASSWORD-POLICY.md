# New-password policy

Fitness signup and password reset follow the shared account contract FP-MAN-012:
new passwords require at least 10 characters. The shared validator is used by
both forms and server actions, including the directly callable reset action.
Existing-password login keeps its compatibility behavior; the new-password
minimum is not a reason to reject an existing account at login.

Passwords are opaque strings. Preserve spaces and Unicode exactly, never coerce
non-string form entries, and do not trim, normalize, truncate or add a restrictive
application maximum. The minimum check follows the existing account portal's
JavaScript string-length rule. Provider policy remains a separate authoritative
check; no provider setting is changed by these source files.

This change does not enable leaked-password protection, implement recent-auth or
current-password challenges, or prove an installed app flow. Current provider
settings must be reconciled through a separately reviewed change after compatible
application releases. The canonical contract is in FawxzzyPlatform's
`contracts/v1/auth/domain-session-contract.json` (FP-MAN-012).

## Verification

`npm run test:auth-ui-contracts` includes shared-policy boundary tests and actual
transpiled signup/reset action tests with substituted Next/Supabase dependencies.
They prove zero calls for rejected inputs and exact password bytes passed on valid
paths. These are synthetic local tests, not live account operations. The existing
auth workflow watches the policy and action tests on pull requests and main.
