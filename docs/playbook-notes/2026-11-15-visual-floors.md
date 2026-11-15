## 2026-11-15 - Visual floors: 11px text, 44px targets, one chip look

- Type: UI (FF-DESIGN-001 floors lane; implements DESIGN-CONTRACT C7, C17 and section 11; the dock button roles half is a separate PR)
- WHAT changed: Every Tailwind `text-[<11px]` in product UI (tokens in `designSystem.ts` and screen components) is now `text-[11px]`. Controls under 44px are raised in the shared token or component (inline stepper, search clear, select pills, session action buttons, toast close and action, legal links, pill buttons, stretch filter chips, Today recovery buttons) using a new `hitArea.ts` helper where the visible shape must stay small. `DetailSectionBadge` now renders the one card chip (`px-2.5 py-1`, tones neutral/success/attention) and the exercise-row progression label is an outlined neutral chip instead of grey text. New `visualFloors.contract.test.ts` guards the 11px floor.
- WHY it changed: The gallery audit found 9-10.5px labels, 26-42px targets, and five chip looks.
- Rule: A size floor lives in the token or shared component, and a contract test scans for regressions; a smaller visible shape gets a padded hit area, not a smaller target.
- Failure Mode: Fixing floors per screen leaves arbitrary `text-[9px]` classes that return in the next PR.
- Decision: Chip label text (PROMO, REG, MANUAL, Not earned) and flow changes are not touched here (copy lane and owner decisions). The shared scaffold's dock reserve (`dock height + 14px`) was measured and left as is: content clears the dock at scroll end on the logger and History.
- Evidence: Playwright 390x844 DPR3 touch standalone against the dev server with the placeholder Supabase URL, before and after DOM measurements and screenshots (local, not committed); typecheck, lint, contract tests.
- Status: Source only; not checked on a real phone. No token pack value changed; Mazer shared-token impact: none.
