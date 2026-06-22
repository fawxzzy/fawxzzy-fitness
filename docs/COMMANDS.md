# Command Glossary

Quickly list all available scripts:

```bash
npm run
```

## Playbook convergence

| Script | What |
| --- | --- |
| `npm run test:playbook-adoption` | Validate the repo-owned Playbook adoption export against the repo-local schema and the Playbook owner contract ids. |
| `npm run test:playbook-verification` | Validate the repo-owned Playbook verification report against the ATLAS root schema and the declared command surface. |
| `npm run verify` | Run the canonical repo-local verification bridge exposed through the Playbook runtime. |

## ATLAS platform contracts

| Script | What |
| --- | --- |
| `npm run test:atlas-contracts` | Validate the repo-owned ATLAS app-registration, env, health, event, and receipt exports against the pinned root schemas. |

## Fitness governed ecosystem checks

| Script | What |
| --- | --- |
| `npm run test:fitness-event-contracts` | Validate the repo-owned Fitness event and metrics contract packs plus their deterministic fixtures. |
| `npm run test:fitness-shadow-warehouse` | Validate the shadow-only warehouse, funnel, and downstream event-consumer lane. |

## Full gates

| Script | What |
| --- | --- |
| `npm run verify:strict` | Run the stricter repo-local release gate for lint, app contracts, shadow growth checks, mobile-regression checks, and build. |
| `npm run verify` | Run the canonical repo verification bridge used by the Playbook convergence slice. |
