## 2026-11-15 - Dock button roles: amber retired as a button colour

- Type: UI (FF-DESIGN-001 floors lane, dock roles half; implements DESIGN-CONTRACT C3, C9, C11)
- WHAT changed: `.bottom-action--secondary` and the `toggleActive`/`toggleInactive` dock intents, and the `.action-chrome` info/toggle intents, no longer use the amber `--secondary-action-rgb`. Secondary is a neutral outline, an active toggle is green, an inactive toggle is muted. The session dock Add is `intent="info"` (secondary) beside the primary Finish; Discard and Delete stay destructive. Attached-action dividers and focus rings use `--border-strong` instead of amber. New `dockRoles.contract.test.ts` guards all of it.
- WHY it changed: The gallery audit showed amber buttons on the same screen as green primaries, and the logger dock offered two primary-looking buttons (Add and Finish).
- Rule: A dock has at most one primary; amber is a status colour (attention), never a button colour.
- Failure Mode: Colouring a secondary action with the attention colour makes it read as a warning and competes with the primary.
- Decision: The shared scaffold's dock reserve (`dock height + 14px`) was measured on the logger and History and clears the dock at scroll end, so it is unchanged. Dock label text and flow changes are out of scope here (copy lane and owner decisions).
- Evidence: Playwright 390x844 DPR3 touch standalone against the dev server with the placeholder Supabase URL, before and after screenshots (local, not committed); typecheck, lint, contract tests.
- Status: Source only; not checked on a real phone. No token pack value changed.
