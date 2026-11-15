## 2026-11-15 - One design contract for all Fitness screens

- Type: Docs (design-gallery lane phase 4; related cards FF-DESIGN-001, FF-DESIGN-002, FF-DESIGN-004)
- WHAT changed: New `docs/design-system/DESIGN-CONTRACT.md` decides the app-wide conflicts the 2026-11-15 gallery found (one green, one page colour, left-bar meaning, one chip vocabulary, dock and button hierarchy, segmented control vs dock, field recipe and native controls, toast placement, loading/empty/error templates, copy and message rules, flow patterns, accessibility floor) and lists known violations by gallery shot id. `FITNESS-DESIGN-SYSTEM.md` and `CARD-SYSTEM.md` section 4.5 point to it. No source, token pack or test changed.
- WHY it changed: Screens disagreed on the same control (two greens, five chip looks, three dock styles, two header alignments); redesign lanes had no single answer to follow.
- Rule: When two screens disagree, the contract decides and states the reason; redesign PRs name the section 12 rows they close.
- Failure Mode: Fixing each screen locally re-creates the drift; a floor (11px text, 44px target) that is not in one place is re-argued per PR.
- Decision: Emerald `--accent` is the UI green; lime `#c8ed66` stays the brand mark and loader ring only (loader is shared with Mazer and is unchanged).
- Evidence: Gallery notes and inventory (local, not committed); token values read from `src/app/globals.css`, `truth-pack/fitness/design-system/tokens.v1.json`, `cardTokens.ts`, `ToastProvider.tsx`.
- Status: Source only; docs, no runtime or deploy surface. Shared-token impact for Mazer: none.
