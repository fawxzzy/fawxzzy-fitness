# FP-FIT-MODERN-SUPABASE-BACKEND-COMPAT-001

## Purpose

Prepare the Fitness server runtime to use an independently revocable Supabase secret API key without reading, creating, installing, or deactivating any credential in this source-only packet.

## Contract

- `SUPABASE_SECRET_KEY` is the preferred server-only admin credential.
- `SUPABASE_SERVICE_ROLE_KEY` remains a temporary rollback fallback while the staged provider and deployment migration is incomplete.
- A blank preferred value does not shadow a valid rollback fallback.
- If neither value is configured, admin-only flows remain unavailable and the resolver fails with a sanitized configuration error.
- Runtime diagnostics expose only whether admin access is configured. They do not expose the selected source, value, shape, length, prefix, suffix, or digest.
- The resolver is owned by the server-only Supabase admin module. No backend credential may use a `NEXT_PUBLIC_` name or enter browser code.

## Scope

This packet migrates only the five production runtime references. The 21 executable operator and QA script consumers remain in the separately gated A2 packet. Browser publishable-key migration, JWT signing-key migration, provider key creation, Vercel environment changes, deployments, and legacy-key deactivation are explicitly excluded.

## Rollback And Deactivation

The legacy fallback must stay configured until a modern key has passed source review, Preview installation, privileged Preview smoke, separately approved Production rollout, and consumer-zero proof. Source compatibility or removal of a direct legacy reference is not evidence that the legacy credential was deactivated or is unused.

Rollback before deactivation removes the modern environment assignment and redeploys against the still-configured legacy fallback. No provider key should be invalidated until every runtime, script, deployment, integration, and retained deployment URL has been reconciled.

## Verification

- deterministic modern-only, legacy-only, modern-precedence, blank-fallback, and missing-input tests;
- stable sanitized failure text and zero logging or serialization of credential values;
- static server-only and no-`NEXT_PUBLIC_` backend-secret checks;
- affected Atlas health and Discord claim-store contract tests;
- full repository verification, typecheck, and production build;
- exact nine-path scope, credential-pattern, machine-path, and PR #108 invariance checks.
