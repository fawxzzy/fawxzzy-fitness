# Changelog

User-facing production release rollup for Fawxzzy Fitness.
Canonical machine-readable release truth lives in `docs/releases/RELEASE_LEDGER.jsonl`.

## fitness-2026.05.22-1 - 2026-05-22

- Recovered New and Edit Routine progression settings and routine cycle controls are back in the canonical Fitness repo.
- Recovered login, routine builder, and Settings Discord connector updates are included in the standalone production source.
- Steps distance-unit support and the progression visual proof lane are preserved in the promoted repo.
- Release note: [2026-05-22-fitness-2026.05.22-1.md](docs/releases/fitness/2026/2026-05-22-fitness-2026.05.22-1.md)

## fitness-2026.06.03-1 - 2026-06-03

- Progression V2 now runs more cleanly across Edit Day, Add Exercise, Today, and Current Session with cleaner inline controls, better previews, and more consistent day-adjustment behavior.
- Today, Resume Workout, Routine, Switch Day, and Current Session screens were cleaned up with slimmer cards, rotating context headers, clearer inspect flows, and less disruptive refresh behavior during logging.
- App Theme settings now cover the newer UI roles with direct color inputs, a dedicated yellow utility accent, and a refreshed Rose Circuit preset.
- Account data export now uses cleaner All, History, and Routines scopes with section-based CSV, JSON, and Excel output.
- Release note: [2026-06-03-fitness-2026.06.03-1.md](docs/releases/fitness/2026/2026-06-03-fitness-2026.06.03-1.md)

## fitness-2026.06.13-1 - 2026-06-13

- History now focuses on planned, completed, skipped, PR, promotion, regression, manual, watch, and completion signals instead of filler totals.
- Exercise info now has scoped filters, a larger layered history graph, selected-point stats, skipped-day markers, and cleaner day/set history rows.
- Logged-session and exercise-history cards now use compact default cards, richer detail rows, multi-set target/logged displays, recap rows, and mini trend graphs.
- Routine deletion now removes owned session history so deleted routines do not keep leaking old data into history screens.
- Release note: [2026-06-13-fitness-2026.06.13-1.md](docs/releases/fitness/2026/2026-06-13-fitness-2026.06.13-1.md)

## fitness-2026.06.13-2 - 2026-06-13

- Logged-session exercise dropdown overview panels no longer carry the extra section border.
- Exercise info sheets opened from seeded history cards now show available stats immediately instead of waiting blank on the network refresh.
- Release note: [2026-06-13-fitness-2026.06.13-2.md](docs/releases/fitness/2026/2026-06-13-fitness-2026.06.13-2.md)
