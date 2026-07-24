# Fitness Review Queue

Fitness uses [Fitness Review Receipt v1](../../../../docs/contracts/fitness-review-receipt-v1.md) for local review work.

## Current Queue

| Card | State | Scope | Review route | Release state |
| --- | --- | --- | --- | --- |
| FF-SESSION-006 | In progress | Post-close exercise effort feedback | `/dev/mobile-regression?scenario=session-logger-bodyweight-reps&exerciseId=session-ex-4` | local_only |
| FF-SESSION-005 | Review changes requested | Move observed rest into the exercise card baseline | same session regression route | migration_pending |
| FF-RET-001 through FF-RET-004, FF-GAM-001 | Review changes requested | History calendar and retention-surface normalization | `/dev/mobile-regression?scenario=history-sessions-compact` | local_only |
| FF-CORE-001, FF-PROG-001 | Review changes requested | Automatic deterministic progression after session save | `/today` and session completion fixture | local_only |

## Standard Review Output

```text
FITNESS_REVIEW_RECEIPT
card: FF-XXXX-000
state: review_ready
scope: <one user-visible outcome>
review_route: <local route>
checks: <typecheck; focused test; browser route proof>
manual_review: <two to five observable checks>
known_limits: <none or named proof/release gap>
release_state: local_only
```

No entry is `review_ready` until its review route is responsive and the named checks have passed.
