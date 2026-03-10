# Command Glossary

Quickly list all available scripts:

```bash
npm run
```

## App lifecycle

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run dev` | Run local development server. | Starts Next.js in dev mode. | Fast iteration with hot reload while building features. |
| `npm run build` | Build production bundle. | Runs Next.js production compilation. | Catch compile/runtime boundary issues before shipping. |
| `npm run start` | Run production server locally. | Boots built Next.js app. | Smoke-test prod behavior after a build. |
| `npm run prebuild` | Refresh generated assets before build. | Runs icon manifest + icon generation. | Keeps build inputs deterministic and complete. |

## Assets/icons

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run dev:assets` | Generate icon artifacts on demand. | Runs icon generation script only. | Quick asset refresh without full build cycle. |
| `npm run sync:exercise-icons` | Sync exercise icon source set. | Executes icon sync script. | Keeps repo icon inventory aligned with source updates. |
| `npm run sync:assets` | Alias for icon sync workflow. | Delegates to `sync:exercise-icons`. | Simpler “asset sync” entrypoint for contributors. |
| `npm run icons:normalize` | Normalize icon file naming/content expectations. | Runs normalization script over icon files. | Prevents drift that breaks icon lookup/generation. |
| `npm run gen:exercise-icons` | Generate exercise icon manifest. | Builds manifest from icon inventory. | Provides stable machine-readable icon mapping. |
| `npm run audit:exercise-icons` | Audit icon coverage/integrity. | Runs icon audit checks. | Detect missing or malformed icon assets early. |

## Validation

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run lint` | Run linting checks. | Uses Next.js ESLint config. | Catch style/quality regressions quickly. |
| `npm run validate:exercise-info-endpoint` | Validate exercise-info API behavior. | Executes endpoint validation script. | Detect API contract regressions before merge. |
| `npm run sanity:quick` | Run fast governance + lint pre-check. | Runs doctor, playbook, status markdown, then lint. | Fast local confidence loop before deeper verification. |
| `npm run sanity` | Run full preflight including build. | Runs notes dedupe report, doctor, playbook, status markdown, lint, build. | End-to-end gate before push/release. |

## Release

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run release:patch` | Cut a patch release. | Runs release automation with `patch`. | Ship backward-compatible fixes with audit trail. |
| `npm run release:minor` | Cut a minor release. | Runs release automation with `minor`. | Ship additive features with SemVer discipline. |
| `npm run release:major` | Cut a major release. | Runs release automation with `major`. | Mark intentional breaking changes clearly. |

## Cleanup/tooling

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run cleanup:repo` | Run baseline repository cleanup. | Executes cleanup script defaults. | Reduce local clutter and stale generated files. |
| `npm run cleanup:repo:archive` | Cleanup with archive behavior. | Runs cleanup script with `--archive`. | Retain history while removing active clutter. |
| `npm run cleanup:repo:full` | Aggressive cleanup including build cache. | Runs cleanup with `--include-build-cache`. | Reset local workspace when state gets noisy. |
| `npm run hooks:install` | Install/refresh git hooks. | Runs githook setup script. | Keep local automation guardrails consistently active. |
| `npm run prepare` | Project prepare lifecycle hook. | Runs githook setup script on install. | Ensures hooks stay installed for contributors. |

## Playbook workflow

| Script | What | How | Why |
| --- | --- | --- | --- |
| `npm run playbook` | Run local Playbook maintenance/reporting. | Executes Playbook command orchestrator. | Keep notes/status/trend pipeline healthy. |
| `npm run playbook:doctor` | Run Playbook diagnostics. | Invokes upstream doctor CLI against repo. | Fast health scan + actionable governance recommendations. |
| `npm run playbook:update` | Promote notes into Playbook updates. | Runs notes-to-playbook updater. | Convert local learnings into doctrine-ready changes. |
| `npm run playbook:update:commit` | Update and commit Playbook changes. | Runs updater in commit mode. | Batch promotion + commit step for workflow speed. |
| `npm run playbook:suggest` | Generate notes suggestions from diffs. | Runs diff-driven suggestion generator. | Speed up note capture with structured stubs. |
| `npm run playbook:guardian` | Generate guardian notes suggestions. | Runs guardian notes generator. | Capture doctrine-worthy learnings consistently. |
| `npm run playbook:guardian:pr` | Guardian generation for PR context. | Runs guardian with PR mode. | Tailor suggestions to pull-request diffs. |
| `npm run playbook:check` | Verify notes were updated when needed. | Runs notes freshness checker. | Enforce learning-loop hygiene in automation. |
| `npm run playbook:test` | Test notes parsing behavior. | Executes parser test harness. | Protect notes tooling correctness over time. |
| `npm run playbook:threshold` | Check notes proposal threshold. | Runs proposed-note threshold script. | Prevent unhealthy backlog growth. |
| `npm run playbook:maintain` | Run guardian + threshold checks. | Chains maintain scripts. | Single command for routine governance upkeep. |
| `npm run playbook:sync` | Sync local Playbook subtree/repo state. | Runs sync script. | Pull latest doctrine changes intentionally. |
| `npm run playbook:sync:commit` | Sync and commit sync results. | Runs sync with commit mode. | Preserve sync as explicit auditable change. |
| `npm run playbook:sync-and-update` | Sync then promote updates. | Chains sync + update scripts. | One-step doctrine refresh + promotion. |
| `npm run playbook:status:ci` | Render CI-friendly status output. | Runs status formatter (supports markdown output). | Provide compact machine/human-readable governance summary. |
| `npm run playbook:trend` | Write playbook trend artifacts. | Runs trend writer script. | Track governance telemetry over time. |
| `npm run playbook:contracts:audit` | Run contracts architecture audit. | Executes contracts audit script. | Detect architecture contract violations. |
| `npm run playbook:contracts:test` | Test contracts audit fixtures. | Runs contracts audit tests. | Prevent audit rule regressions. |
| `npm run playbook:auto` | Run automated Playbook workflow. | Executes auto orchestrator (sync/playbook/update/commit). | Streamline end-to-end doctrine maintenance. |
| `npm run playbook:auto:local` | Local auto run without sync step. | Runs auto with `--skip-sync`. | Faster local upkeep when sync is unnecessary. |
| `npm run playbook:precommit` | Run pre-commit Playbook automation. | Executes precommit helper. | Keep governance artifacts current before commit. |
| `npm run playbook:notes:dedupe` | Report duplicate note blocks by fingerprint. | Runs dedupe script in report mode. | Prevent PLAYBOOK_NOTES bloat from repeated entries. |
| `npm run playbook:notes:dedupe:write` | Remove duplicate note blocks in-place. | Runs dedupe script with `--write` and backup. | Keep hot notes file concise while preserving first occurrence. |
| `npm run playbook:notes:archive` | Archive stale note blocks by age. | Moves older blocks into monthly archive files. | Keep active notes file fast to scan without deleting history. |

## Recommended flows

- **Quick local check:** `npm run sanity:quick`
- **Full preflight:** `npm run sanity`
- **Doctrine upkeep:** `npm run playbook:auto:local`
