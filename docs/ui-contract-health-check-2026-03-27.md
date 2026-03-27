# UI Contract Health Check — 2026-03-27

## Scope
- Screen contract + recipe adoption across main screen families.
- Shared header enforcement (`SharedScreenHeader`) for route/sheet headers.
- Stat-label baseline check for shared measurement surfaces.

## Migrated screen families (this pass)
- **Today**:
  - `/today` in-progress panel header now uses `SharedScreenHeader` with `recipe="todayOverview"`.
  - Today selector shell (`AnchoredSelectorPanel`) now routes through `SharedScreenHeader` and recipe metadata.
- **Routines overview**:
  - `ActiveRoutineSummaryCard` now routes through `SharedScreenHeader` and `routinesOverview` recipe metadata.
  - Section cards now read centralized recipe scaffolding via `resolveScreenRecipe`.
- **Shared contract core**:
  - Added `todayOverview` contract.
  - Added centralized `screenRecipes` + `resolveScreenRecipe` and moved `SharedScreenHeader` to consume recipe data.

## Header contract status by target family
- Current Session: **on shared header path** (`SessionHeaderControls`).
- Exercise Log: **on shared header path** (`WorkoutEntryIdentity`).
- Add Exercise: **on shared header path** (session add-exercise route header).
- Edit Day: **on shared header path** (`RoutineEditorShared`).
- View Day: **on shared header path** (routine day detail route).
- Today: **on shared header path** (`today/page.tsx`, `AnchoredSelectorPanel`).
- Routines: **on shared header path** (`ActiveRoutineSummaryCard`).
- History detail: **on shared header path** (`HistoryShared`).
- Exercise detail / detail sheet: **on shared header path** (`DetailHeader`, used by `ExerciseInfoSheet`).

## Remaining bypass files/components
- **No remaining direct `AppHeader` usage outside `SharedScreenHeader`** in `src/app` + `src/components` (verified via search).
- Remaining **section-level local heading patterns** (not route header wrappers):
  - `HistorySection`
  - `DetailSection`
  - `WorkoutEntrySection`
  - `RoutinesSectionCard`

## Remaining true exceptions
- Section-level heading/action layouts listed above remain local by design for intra-screen content blocks; route/sheet top headers are on the shared path.

## Stat-label contract check
- Shared measurement panels (`MeasurementPanelV2` via `MeasurementConfigurator`) render field labels with `StatFieldLabel`, including top `Sets (target)` and standard metric labels.
- No alternate chip/slab label renderer remains on the shared measurement panel path.

## Contract authority assessment
- **Materially more authoritative than prior pass**:
  - Header ownership and top-level spacing moved further into shared header + recipe plumbing.
  - Today and Routines overview now consume shared recipe metadata directly instead of local-only header assembly.
  - Remaining divergence is mostly section-level content composition, not top-header contract ownership.
