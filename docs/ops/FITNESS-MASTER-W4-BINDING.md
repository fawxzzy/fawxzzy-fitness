# Fitness master generated-types binding

## Scope

Fitness binds every application Supabase client to the `fitness` schema in the
shared master Supabase project. The generated API contract is committed at
`src/lib/supabase/database.types.ts`; `src/lib/supabase/schema.ts` supplies that
`Database` type to both `createClient` and the exported client type.

This source contract does not authorize or perform a database migration,
project setting change, deployment, production cutover, or legacy-project
retirement.

## Provider identity and generation

- Project reference: `bxtcuhkotumitoqtrcej`
- Schema: `fitness`
- Supabase CLI: `2.117.0`
- Generated file SHA-256:
  `3424bbba6f58183e32f5434b0d9673c77f66703d1ce1478865b474075ec0abe6`

Regenerate from a Supabase-authenticated shell using the read-only CLI
introspection command:

```powershell
npx --yes supabase@2.117.0 gen types typescript --project-id bxtcuhkotumitoqtrcej --schema fitness > src/lib/supabase/database.types.ts
```

Review the generated diff before acceptance. A database schema change must
refresh this file and rerun the checks below; do not hand-edit generated table,
view, function, enum, or composite-type declarations.

## Verification

```powershell
npm run test:supabase-schema-binding
npm run typecheck
npm run lint:ci
npm run verify
```

The focused contract test rejects the former `any` bridge and confirms that the
generated master schema includes the durable auth-handoff table and both RPCs.
