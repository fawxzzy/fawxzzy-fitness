# Fitness Design System

The Fitness design-system source of truth lives in `truth-pack/fitness/design-system/`.

The frozen pack provides the token groups, primitive contracts, and schemas that the live app bridge consumes through `src/components/ui/app/designSystem.ts` and `src/components/ui/app/tokens.ts`.

Screen-family adoption should keep route-local behavior unchanged while moving repeated spacing, typography, and surface chrome onto those bridge exports.
