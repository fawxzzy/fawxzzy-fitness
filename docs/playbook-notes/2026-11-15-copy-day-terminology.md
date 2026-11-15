## 2026-11-15 - Copy lane: "day" terminology and plain user copy

- Type: Decision / Rule
- WHAT changed: User-visible "Workout Plan(s)" strings became "day(s)" (DESIGN-CONTRACT C18); dock labels shortened (Resume, Discard, Detailed, Compact) per C12; developer/raw copy replaced (progression history description, raw network error in export settings, "app-shell" in the soft error boundary). String-only: routes, identifiers, DB values and persisted names (including the fallback template name) are unchanged. Terms/Privacy legal copy untouched (Zac-only).
- WHY it changed: FF-DESIGN-002 contract copy rules 9.1 to 9.3.
- Rule: new user-facing text uses canonical terms (routine, day, workout, session); network failures show a fixed sentence, never the browser's error text.
- Failure Mode: renaming a persisted string or route would break stored data and links; only display strings change.
- Evidence: typecheck, lint, card-system, mobile-regression, integrity and billing test groups pass.
- Status: review
