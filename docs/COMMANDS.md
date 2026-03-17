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
| `npm run verify` | Alias for full local check (`lint` + `build`). |
| `npm run verify:strict` | Alias for full local check (`lint` + `build`). |

## Release

| Script | What |
| --- | --- |
| `npm run release:patch` | Cut a patch release. |
| `npm run release:minor` | Cut a minor release. |
| `npm run release:major` | Cut a major release. |
