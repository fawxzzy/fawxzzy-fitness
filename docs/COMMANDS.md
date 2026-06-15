# Command Glossary

Quickly list all available scripts:

```bash
npm run
```

## App lifecycle

| Script | What |
| --- | --- |
| `npm run dev` | Run local development server. |
| `npm run build` | Build production bundle. |
| `npm run start` | Run production server locally. |
| `npm run prebuild` | Refresh generated assets before build. |
| `npm run qa:screenshot -- <config.json>` | Run one Edge CDP screenshot capture from a config file. |
| `npm run qa:matrix [config.json ...]` | Run the QA screenshot matrix without coupling it to `build`. |
| `npm run qa:fitness:ui-checkpoint` | Run the default Fitness UI proof loop: fresh dev on `3002`, auth bootstrap, and progression LLEL receipt refresh. |
| `npm run cleanup:repo:validation` | Remove paused-workspace validation residue before root stack validation, including `.next`, `node_modules`, and `.playbook`, relocating locked heavy state into `ATLAS/tmp` when needed. |

## Assets/icons

| Script | What |
| --- | --- |
| `npm run dev:assets` | Generate icon artifacts on demand. |
| `npm run sync:exercise-icons` | Sync exercise icon source set. |
| `npm run sync:assets` | Alias for icon sync workflow. |
| `npm run icons:normalize` | Normalize icon files. |
| `npm run gen:exercise-icons` | Generate exercise icon manifest. |
| `npm run audit:exercise-icons` | Audit icon coverage/integrity. |

## Validation

| Script | What |
| --- | --- |
| `npm run lint` | Run linting checks. |
| `npm run typecheck:mobile-regression-harness` | Run the targeted TypeScript parity check for the dev mobile-regression harness. |
| `npm run validate:exercise-info-endpoint` | Validate exercise-info API behavior. |
| `npm run sanity:quick` | Fast local check (`lint`). |
| `npm run sanity` | Full local check (`verify:strict`). |
| `npm run verify:mobile-regression` | Run the mobile-regression parity guard (`typecheck:mobile-regression-harness` + fixture suite). |
| `npm run verify` | Run the Playbook repo verification workflow. |
| `npm run verify:strict` | Full local gate (`lint` + mobile-regression parity guard + `build`). |
| `npm run test:atlas-contracts` | Validate the repo-owned ATLAS v1 exports, health helper, and reusable contract lane wiring. |
| `npm run test:playbook-adoption` | Validate the repo-local Playbook adoption export against the local schema and owner contract ids. |
| `npm run test:playbook-verification` | Validate the repo-local Playbook verification report against the ATLAS root schema and live command surface. |
| `npm run test:fitness-event-contracts` | Validate the Fitness-owned event contract and shadow receipt validators. |
| `npm run test:fitness-shadow-warehouse` | Prove critical shadow-mode event receipt arrival, KPI denominator math, and funnel/dashboard acceptance checks in a temp ATLAS receipt sink. |
| `npm run test:mobile-regression-fixtures` | Validate the deterministic mobile-regression fixture inventory, contracts, and board-generation suite. |

## Release

| Script | What |
| --- | --- |
| `npm run release:patch` | Prepare a patch release version and release metadata. Does not deploy. |
| `npm run release:minor` | Prepare a minor release version and release metadata. Does not deploy. |
| `npm run release:major` | Prepare a major release version and release metadata. Does not deploy. |

Release-authority note:

- repo-local release helpers in this table are release-preparation surfaces, not deploy authority
- preview and production deploy authority lives in `_stack` through `pnpm run fitness:deploy:*`
- direct repo-local `vercel` or `vercel --prod` usage is not an approved default production deploy path
