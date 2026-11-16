## 2026-11-15 - Detail screens on the one ScreenHeader (FF-DESIGN-001, lane H1b)

- Type: Rule / Failure Mode
- WHAT changed: Session, history detail, exercise detail, routine setup, Account, Terms/Privacy and the optional-day preview render `ScreenHeader kind="detail"` with Back top left (the shared `ScreenHeaderBackButton`). Eight legacy header pieces (including the unused `HeaderInfoRail`) were deleted; `tests/screen-header-contract.test.mjs` now fails on a raw `<h1>` outside `ScreenHeader`.
- WHY it changed: every pushed screen had its own header (right-side round Back, eyebrows, pipes, info rails, duplicated identity block). One grammar passes the 3-second test (DESIGN-CONTRACT 15.5).
- Rule: a screen title is the `ScreenHeader` `h1`; anything that still matters from an old header moves into the first body card. New screens add a row to the 15.5 table and a case to the contract test.
- Failure Mode: a name-only check ("no `SharedScreenHeader` import") misses a hand-styled `<h1 className="text-center">`; the contract scans for the element itself and carries a mutation case proving a raw centred h1 fails.
- Evidence: `node --test tests/screen-header-contract.test.mjs` (13 pass); manual mutation (raw centred h1 appended to `HistoryShared.tsx`) failed the guard, then reverted.
- Status: in review (lane H1a moves routines and create flows; `AppHeader` / `SharedScreenHeader` stay until then).
