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

This change does not enable leaked-password protection, implement a recent-auth
challenge for sign-in, or prove an installed app flow. Current provider
settings must be reconciled through a separately reviewed change after compatible
application releases. The canonical contract is in FawxzzyPlatform's
`contracts/v1/auth/domain-session-contract.json` (FP-MAN-012).

## Changing the password while signed in

Settings > Account > Change password (`changePasswordAction`, `src/app/settings/actions.ts`) uses
the same ten-character rule, requires the current password, and requires the new password to
differ from it. The current password is verified by signing in on a throwaway client, and that
fresh session performs the write: `auth.updateUser` needs a session held by the client, and the
request-bound server client only forwards a bearer header, so `updateUser` on it fails with
"Auth session missing" without sending a request. The throwaway session is revoked with
`scope: "local"`, so the member's own session and other devices are not touched. Other sessions
are not signed out on a password change; that is a separate decision because sessions are shared
with the account portal and Mazer. Every outcome is a fixed message keyed by a code; provider
text never reaches the screen. No provider setting is needed: a fresh sign-in also satisfies the
optional "secure password change" recency rule.

## Verification

`npm run test:auth-ui-contracts` includes shared-policy boundary tests and actual
transpiled signup/reset action tests with substituted Next/Supabase dependencies.
They prove zero calls for rejected inputs and exact password bytes passed on valid
paths. These are synthetic local tests, not live account operations. The existing
auth workflow watches the policy and action tests on pull requests and main.
