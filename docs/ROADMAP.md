# Roadmap

This is the canonical product roadmap for Fawxzzy Fitness. Use this file as the docs-first source of truth for current state, near-term priorities, and the long-term wellness expansion path.

## Current Product State

- The product is currently a fitness app centered on workouts, routines, sessions, sets, exercises, and history.
- The current shared app shell is stable around four top-level nav slots: Today, Routines, History, and Account.
- The architecture contract remains Next.js + TypeScript + Tailwind + Supabase, with RLS-protected data, explicit server/client boundaries, and server actions for protected writes.
- Fitness remains the reference lane. New product direction should compound from the existing shell, shared components, and deterministic tracking behavior rather than fork them.
- Custom exercise data paths already exist. Near-term custom exercise work should reuse the existing picker seams and confirmation surfaces instead of introducing a new route or a separate creation flow.

## Recently Completed

- Recovered canonical UI and product state back into the main repo, including the shared app shell, auth, Today, Routines, Session, History, Account/Settings, install flow, and shared card/token surfaces.
- Recovered and normalized ambient theme ownership plus deploy/build guardrails.
- Expanded exercise catalog filter coverage and refreshed canonical exercise metadata coverage.
- Added the canonical global exercise upsert migration path.
- Refined top-nav glass treatment and compact history session surfaces.
- Improved the active logger with inline last-set hints, repeat-last-set behavior, and PR feedback.

## Active / In Progress

- Finish the deterministic Supabase baseline lane: checked-in baseline docs, migration chain, and deterministic local/dev seed workflow.
- Correct custom exercise UX so choice and confirmation behavior stays inside the existing picker flow and reuses the shared confirm/discard modal pattern plus existing picker seams.
- Stabilize the current fitness lane before expanding into additional wellness modes.
- Keep the current infra draft focused on baseline hygiene, not new product surface work.

## Near-Term Priorities

1. Finish and merge the deterministic Supabase baseline and seed workflow.
2. Fix custom exercise UX to reuse the shared confirm/discard modal pattern and existing picker seams.
3. Finish custom exercise creation and tagging using the current taxonomy, without custom images in the first pass.
4. Audit current exercise stats and analytics accuracy before they become a stronger product dependency.
5. Stabilize the fitness lane as the reference implementation for future modes.
6. Design the wellness mode selector as a documentation and UX-spec lane before implementation.
7. Start Diet MVP only after the fitness lane pattern is stable.

## Long-Term Wellness Mode Direction

- The app remains one shared product shell, not separate apps.
- Each mode should reuse the same core product primitives where they apply: structured items, cycles, logs, tags, goals/targets, history, analytics, and later cross-domain recommendations.
- The four top-level nav slots stay stable. Do not grow the top nav for every new domain.
- The current Routines slot evolves into the focused mode workspace for mode-specific content.
- The mode workspace is the only top-level area that swaps focused content.
- Today remains a universal view and should eventually summarize workout, diet, cycle, and other enabled wellness updates together.
- History remains universal, should support domain-specific slices, and should later support merged cross-domain analytics once per-mode metrics are trusted.
- Account remains universal, with mode-specific preferences folded into one clean settings surface instead of separate mode shells.
- Initial mode set:
  - Routine / Exercise
  - Diet
  - Cycle
- Later candidates:
  - Sleep
  - Mind
  - Recovery
  - Mobility
  - Hydration
  - Supplements
  - Habits
- The mode-capable nav item should disclose expansion with a small chevron and open a compact tap-first selector such as a dropdown or sheet.
- Long-press is not the primary interaction.
- The selector may be icon-first or icon-only when space is tight, while the selected mode updates the nav item icon and title.
- Shopping list work belongs under Diet as a lightweight extension, not as a separate top-level mode.
- Cross-domain analytics and recommendations come only after each participating mode has reliable, trusted data.

## Deferred / Explicitly Not Now

- No fifth top-nav tab for Diet.
- No permanent top-nav expansion beyond the current stable structure.
- No barcode scanner in Diet V0.
- No food database import in Diet V0 unless it is separately scoped.
- No custom exercise image uploads in the first custom exercise pass.
- No automatic promotion of user-created exercises or foods into global catalogs.
- No medical predictions or diagnosis language in Cycle V0.
- No cross-domain recommendations before per-mode metrics are trusted.

## Open Research / Validation Needed

- Stats and analytics correctness audit for current fitness metrics.
- Which workout metrics are actually useful and trustworthy from existing tracked data.
- Nutrition target model and what remains optional versus required in Diet MVP.
- Food database strategy, including whether any import path is justified later.
- Cycle privacy model, opt-in boundaries, and safe data structure.
- Cross-domain recommendation rules and when they become trustworthy enough to expose.

## Working Product Rules

- Fitness is the first lane to stabilize and remains the reference implementation for future wellness modes.
- Shared shells, shared components, and deterministic product behavior take priority over route-local one-offs.
- User-created exercises and future user-created foods stay user-owned by default; any promotion into global/shared catalogs requires moderation or explicit review.
- Custom exercise choice UX should compose the existing confirm/discard modal surface and current picker seams rather than introducing a new screen.
