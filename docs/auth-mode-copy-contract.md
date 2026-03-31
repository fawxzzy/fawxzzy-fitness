# Auth mode copy contract

This contract keeps helper text specific to the auth surface a user is currently using.

## Modes

- `password-login`
  - Surface: `/login` email + password form.
  - Includes: password login title/subtitle and password-recovery helper guidance.
  - Excludes: magic-link inbox guidance and reset-form instructions.

- `magic-link`
  - Surface: login success/info message states that represent email-link sign-in.
  - Includes: inbox/spam helper copy only.
  - Excludes: password-login helper text and reset-password helper text.

- `reset-password`
  - Surfaces: `/forgot-password` request form and `/reset-password` set-password form.
  - Includes: reset-request and recovery-link helper copy.
  - Excludes: create-account messaging and magic-link inbox messaging.

- `create-account`
  - Surface: `/signup`.
  - Includes: account-creation title/subtitle only.
  - Excludes: password-login and recovery helper messaging.

## Ownership

Authoritative auth mode copy is defined in `src/components/auth/authCopy.ts`. Auth screens should reference this module instead of embedding flow-mixed helper strings inline.
