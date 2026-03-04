# Promoted Notes from FawxzzyFitness

<!-- PLAYBOOK_NOTE_ID:2026-03-04-include-request-correlation-step-metadata-in-api-errors -->
### Include request correlation + step metadata in API errors (from FawxzzyFitness notes, 2026-03-04)
Type: Practice
Summary: API handlers should return structured errors with a request correlation ID and processing step/phase metadata, and mirror those values in response headers.
Rationale: Correlation and phase fields make production failures traceable across client reports, logs, and edge responses without requiring repro.
Evidence (FawxzzyFitness):
- src/app/api/exercise-info/[exerciseId]/route.ts
- src/components/ExerciseInfo.tsx
