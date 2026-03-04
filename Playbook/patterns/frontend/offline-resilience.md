# Promoted Notes from FawxzzyFitness

<!-- PLAYBOOK_NOTE_ID:2026-02-24-tie-resumable-session-ui-state-to-explicit-local-storage-keys -->
### Tie resumable-session UI state to explicit local storage keys (from FawxzzyFitness notes, 2026-02-24)
Type: Pattern
Summary: For resumable workout flows, persist per-exercise logger state (`sets + form inputs`) under deterministic `sessionId + sessionExerciseId` keys and restore on mount before queue hydration.
Rationale: Users expect “resume workout” continuity to include in-progress interaction state, not just server-fetched records.
Evidence (FawxzzyFitness):
- src/components/SessionTimers.tsx
