# Changelog

## [Unreleased]

### Added
- Project documentation (PROJECT.md, AGENT.md, ENGINE.md)
- Initial vertical slice (auth, sessions, sets, history)

### Fixed
- Email verification links now redirect to login with verified state and prefilled email instead of landing on an error page
- Server/client boundary violations causing runtime crash
- Middleware matcher exclusions
- Environment variable handling
