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
| `npm run validate:exercise-info-endpoint` | Validate exercise-info API behavior. |
| `npm run sanity:quick` | Fast local check (`lint`). |
| `npm run sanity` | Full local check (`lint` + `build`). |
| `npm run verify` | Run the Playbook repo verification workflow. |
| `npm run verify:strict` | Alias for full local check (`lint` + `build`). |
| `npm run test:playbook-adoption` | Validate the repo-local Playbook adoption export against the local schema and owner contract ids. |

## Release

| Script | What |
| --- | --- |
| `npm run release:patch` | Cut a patch release. |
| `npm run release:minor` | Cut a minor release. |
| `npm run release:major` | Cut a major release. |
