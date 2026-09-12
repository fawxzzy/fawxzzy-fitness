# Fitness master Auth handoff-store installation contract

## Status

This is a source-proven installation contract, not an applied migration or runtime activation. Fitness must leave `FITNESS_AUTH_HANDOFF_ENABLED` unset until the Supabase migration owner has installed and verified this contract against the active master project.

## Purpose

The account portal starts a short-lived, browser-bound, one-time handoff before it submits a validated session pair to Fitness. Fitness stores only SHA-256 base64url digests of the opaque handoff identifier and browser binding. It never stores access tokens, refresh tokens, session cookies, or user profile data.

## Master-schema requirements

- Install the table and two RPCs in the `fitness` schema of the master project only.
- Enable RLS on the table and create no browser-role policy for it.
- Grant RPC execution only to the server-side service role. Revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Keep the RPCs as normal invoker functions; do not use `SECURITY DEFINER`.
- Expose the `fitness` schema through the master Data API only after its separate cutover/postimage proof.

The table must retain only `handoff_digest`, `binding_digest`, `audience`, `issuer`, `return_to`, and `expires_at`. The `(handoff_digest)` primary key supplies duplicate-begin rejection. An expiry index may support bounded cleanup, but cleanup itself is separately governed.

## Required RPC semantics

`fitness.begin_fitness_auth_handoff` accepts the hashed handoff id, hashed binding, fixed `fitness` audience, fixed master issuer, allowed local return path, and expiry. It performs one insert with `ON CONFLICT DO NOTHING`; success means exactly one row was inserted.

`fitness.consume_fitness_auth_handoff` accepts the same hashed id and binding plus audience, issuer, and current timestamp. It performs one `DELETE ... WHERE handoff_digest = ... AND binding_digest = ... AND audience = ... AND issuer = ... AND expires_at > now RETURNING return_to`. This one statement is the atomic one-time-consume boundary: concurrent consumers may yield only one return path.

RPC failures must be converted by Fitness to fixed non-echoing `unavailable` or `invalid handoff` responses. Neither endpoint may return raw database details or input token values.

## Runtime binding and rollback

Fitness creates the store only when `FITNESS_AUTH_HANDOFF_ENABLED=1`, a server-only service-role key, and the exact master Supabase URL are all present. Runtime readiness additionally requires `FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256`: the lowercase 64-character SHA-256 hex digest of the exact `NEXT_PUBLIC_SUPABASE_ANON_KEY` installed for the master project. The migration owner must derive that digest in a private, non-echoing process from the provider-verified master anon key, persist only the digest in evidence, and install it as a server-only value separately from the public key. Fitness compares the two in constant time and still validates the key's JWT structure, master project reference, `anon` role, and validity window. A missing, malformed, mismatched, expired, or legacy-project key keeps both cross-origin handlers unavailable.

The adapter calls the named RPCs through the shared `fitness` schema client, while the submitted session pair is still independently validated against the same master audience before Fitness writes its HttpOnly session cookies. That validation rotates the refresh token, so the success response returns the validated pair only to the initiating origin-checked caller. The Fitness browser client and portal producer must persist that returned pair before continuing; a caller must never retain the submitted parent refresh token.

Anon-key rotation is fail-closed: seal the new provider-verified digest privately, update the public key and server-only fingerprint as one bounded runtime change, and require the readiness endpoint to return the expected fixed contract before enabling portal traffic. A partial rotation must remain unavailable. Rollback is immediate: remove the enable flag or restore the exact prior public-key/fingerprint pair. New cross-origin handoffs receive the existing categorical unavailable response; no browser session cookie is created by the handoff path.

## Acceptance evidence required before activation

- Master project identity, custom-schema exposure, table/RPC hashes, role grants, RLS, and zero browser-role execution are current and exact.
- Fitness production deployment is bound to the same master issuer/audience and has the service-only runtime binding.
- A private action-time check proves the configured master anon key hashes to the exact sealed `FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256` value without emitting either value; readiness reports available only for that matched pair.
- The portal producer and Fitness consumer share the exact 60-second, 8 KiB body, 4 KiB token, origin, audience, issuer, and allowed-return-path contract.
- A disposable QA account proves successful portal-to-Fitness handoff, one-time replay rejection, expired/invalid binding rejection, refresh, desktop/PWA behavior, and no login loop without exposing session values.
- A retained healthy deployment and automatic rollback on failed acceptance are available.

## Local integration fixture

`scripts/qa/fitness-auth-handoff-loopback.ts` provides an explicit loopback-only PGlite fixture for portal integration. Its health endpoint returns only the contract name and safe synthetic/durability booleans. It accepts only synthetic fixture token names and never reads environment values or contacts a provider.

Run it only through the repository's TypeScript alias loader:

```text
node --import ./scripts/register-test-aliases.mjs scripts/qa/fitness-auth-handoff-loopback.ts
```

Stop the explicit fixture with `Ctrl+C`; the CLI closes the loopback listener, PGlite handle, and its temporary directory before it exits.
