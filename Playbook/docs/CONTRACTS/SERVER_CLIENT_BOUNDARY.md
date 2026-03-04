# SERVER_CLIENT_BOUNDARY

## Contract
Client-facing modules must not directly import server-only APIs or execution concerns.

## Why
Protect determinism, caching semantics, and security boundaries between server and client runtime.

## Machine signal (v1)
- FAIL when a `'use client'` file imports server-only modules/APIs.
