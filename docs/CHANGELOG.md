# Changelog

## [Unreleased]

### Added
- Routine template system with configurable cycle length, per-user timezone support, active routine selection, and routine/day exercise management so users can run repeatable plans without manual daily setup
- Today now resolves the correct routine day from timezone-aware date math and routine start date so training day selection stays deterministic across locales
- Start Session now seeds session exercises from the active routine day template and stores routine context on sessions so logging flow matches the planned day

- Project documentation (PROJECT.md, AGENT.md, ENGINE.md)
- Initial vertical slice (auth, sessions, sets, history)

### Fixed
- Email verification links now redirect to login with verified state and prefilled email instead of landing on an error page
- Server/client boundary violations causing runtime crash
- Middleware matcher exclusions
- Environment variable handling
