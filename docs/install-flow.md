# Fitness Install Flow

## Canonical route

- install route: `/install`
- app route: `/entry` with normal auth fallback to `/login`

Trove and other launchers should route users to the Fitness install route instead of pretending they can install Fitness directly.

## iOS behavior

- iOS in-app browser and not standalone:
  - protected app routes are blocked
  - the user sees an `Open Fitness in Safari` gate
  - the gate shows the canonical install URL and a copy action
- iOS Safari and not standalone:
  - protected app routes are blocked
  - the user sees an `Add Fitness to your Home Screen` gate
  - wording uses `Share, then Add to Home Screen`
- iOS standalone:
  - protected routes are allowed
  - `/install` becomes a continue surface instead of a gate

## Non-iOS behavior

- Android and other non-iOS platforms are never hard-blocked
- native install UI is shown only after `beforeinstallprompt` is captured for the current app
- if the browser does not expose installability, the user can continue into the app without fake install UI

## Protected route gate

The root layout uses a client gate that allowlists these browser-usable public surfaces:

- `/install`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/*`
- `/dev/*`

This preserves the repo doctrine that browser auth entry points remain usable even when install acquisition is external.

## Detection notes

- runtime standalone detection uses `display-mode: standalone`, `display-mode: fullscreen`, and `navigator.standalone`
- iPadOS desktop-style Safari is treated as iOS when `platform === "MacIntel"` and `maxTouchPoints > 1`
- in-app browser detection is heuristic and isolated to the install utility
- non-production-only QA overrides are available through `?installContext=...`
