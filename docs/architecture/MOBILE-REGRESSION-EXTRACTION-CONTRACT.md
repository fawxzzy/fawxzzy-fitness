# Mobile Regression Extraction Contract

This file explains how evidence-only mobile routes feed the Pass 2 surface map without becoming first-class product routes.

## Evidence routes

- `/dev/ui-contract`
- `/dev/ui-system`
- `/dev/mobile-regression`
- history preview/live dev routes
- stretch and auth preview routes when they help isolate a shared surface

## What to extract from evidence routes

Use evidence routes to harvest:

- mobile-only spacing and density mismatches
- sticky footer overlap or clipping
- floating-header spacing issues
- row-height and card-radius inconsistencies
- input focus and keyboard-safe-area problems
- cases where shared surfaces render differently on mobile than on desktop

## What not to do

- do not treat evidence routes as new product routes in the ledger
- do not let evidence-only polish redefine the semantic role of a production surface
- do not document dev-only fixture content as product meaning

## Extraction workflow

1. identify the production surface family under test
2. capture the mobile-specific symptom from the evidence route
3. record the symptom against the real production surface family
4. update readiness score or exception list if global mutation would hit that issue

## Typical extraction examples

### Spacing density

- Source evidence: mobile regression board shows picker rows peeking awkwardly
- Production family: exercise chooser / picker tray
- Map update: mark `spacing density` mutation as inspect-manually for picker trays

### Shape mismatch

- Source evidence: shared card radius is correct in one route but clipped in a sticky footer host
- Production family: shared card and bottom dock family
- Map update: record local exception under dock host or floating header host

### State visibility

- Source evidence: disabled or selected state becomes unreadable on mobile
- Production family: segmented control or bottom dock action
- Map update: lower readiness score until state parity is documented

## Mobile-specific fields worth auditing

- `--screen-gutter`
- `--content-max`
- `--card-radius`
- exercise-row shell padding and media sizing vars
- safe-area and bottom-nav vars
- sticky dock spacing

These variables already exist in `globals.css`, which makes them high-leverage for future density mutation, but only if the map records where mobile-only exceptions still exist.

## Output rule

Every mobile-only finding should land in one of:

- the route delta ledger
- the component styling coverage file
- the token map exception list
- the theme mutation test plan

If a mobile regression does not change any of those artifacts, it has not been integrated into the control map yet.
