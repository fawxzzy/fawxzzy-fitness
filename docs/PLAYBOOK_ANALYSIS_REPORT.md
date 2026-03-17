# Playbook Product Analysis Report — 2026-03-17

## Scope
This report captures the requested Playbook analysis cycle for Fawxzzy Fitness:

1. Bootstrap (`ai-context`, `ai-contract`)
2. Intelligence build (`context`, `index`, `query modules`, `explain architecture`)
3. Correctness verification (`verify`)
4. Improvement planning (`plan`)
5. Artifact inspection (`.playbook/*`)

## Playbook Run Outcome
All commands executed successfully via the repo-local package runtime, but the current local Playbook CLI is a thin stub that records command metadata/log lines only. It does not emit semantic analysis artifacts such as `findings.json`, `plan.json`, or `repo-graph.json`.

Observed artifacts:
- Present: `.playbook/last-run.json`, `.playbook/runs/*.log`
- Missing: `.playbook/findings.json`, `.playbook/plan.json`, `.playbook/repo-graph.json`

## System Understanding
### What Playbook currently "thinks"
Because the runtime is stubbed, Playbook currently records only command invocations and timestamps, not architecture inference or module graphing.

### Reality check against repo architecture
The documented architecture shows:
- Next.js App Router + TypeScript + Supabase
- Server actions as mutation boundary
- RLS-protected, user-owned tables and Supabase-backed execution model

From migrations and server actions, the actual implementation is aligned with this high-level model:
- Core entities (`sessions`, `session_exercises`, `sets`, `exercises`) with RLS
- Server-only action handlers using `requireUser()` + `supabaseServer()` patterns
- Exercise stats cache table to materialize progression summaries

## Critical Findings (highest impact)
Given missing Playbook findings output, the following were identified by repository inspection during this run:

1. **Playbook analysis is effectively non-operational for product insights**
   - Current CLI implementation writes only timestamped run logs and `last-run.json`.
   - This blocks automated architecture extraction, verification findings, and generated planning.

2. **Expected Playbook outputs are absent**
   - `findings.json`, `plan.json`, and `repo-graph.json` were not generated.
   - Product-level analysis pipeline cannot yet produce machine-consumable insights for this repo.

3. **Potential cross-table ownership drift risk in data model**
   - Schema stores `user_id` in child tables (`session_exercises`, `sets`) but does not enforce relational equality to parent rows via composite foreign keys.
   - RLS mitigates most app-path writes, but service-role scripts/backfills could still create mismatched ownership tuples.

4. **Set append path can fail under concurrent writes without deterministic retry**
   - App computes `nextSetIndex` by reading latest set then inserts; uniqueness constraint exists.
   - Under concurrency, this can throw unique violations unless application retries with refreshed index.

5. **Progression cache correctness depends on explicit recompute call sites**
   - Stats are materialized in `exercise_stats`; correctness relies on actions invoking recompute after mutations.
   - Any missed call path introduces stale progression/PR display risk.

## Architectural Gaps
- **Tooling gap**: Playbook runtime in this repo is integration-valid but analysis-incomplete.
- **Boundary observability gap**: no generated module graph means coupling hotspots cannot be auto-located.
- **Invariant gap**: user ownership consistency across linked rows relies primarily on application discipline + RLS, not full relational constraints.
- **Progression contract gap**: no single documented "source-of-truth" progression invariant spec tying DB constraints + cache refresh + UI rendering checks.

## Recommended Improvements (impact-tiered)
### High
1. Replace stub Playbook package with full analyzer runtime and enforce artifact contract (`findings.json`, `plan.json`, `repo-graph.json`) in CI.
2. Add relational ownership invariants for child rows (or equivalent trigger checks) so `user_id` cannot drift across `sessions` ↔ `session_exercises` ↔ `sets`.
3. Add deterministic retry/upsert strategy for `set_index` collisions in append-set mutation paths.

### Medium
1. Add audit checks that verify every mutation path affecting sets/exercises triggers exercise stats recomputation.
2. Add invariant-focused tests for progression semantics (weight PR vs bodyweight rep PR, cardio best selection, stale-cache scenarios).
3. Emit a machine-readable progression contract doc used by both verify and tests.

### Low
1. Expand `.playbook/last-run.json` to include runtime build/version fingerprint for easier provenance.
2. Add a lightweight command that reports artifact completeness status after each run.
3. Document expected Playbook artifact schema in repo docs for operator clarity.

## Surprising Insights
- The repo has mature migration depth and explicit constraints around many goal/measurement fields, but the current Playbook runtime cannot leverage that richness yet.
- Architecture/governance docs are strong; operational intelligence generation is the missing layer.

## Playbook Limitations Observed
1. No semantic indexing or module-graph outputs from current runtime package.
2. No verification findings emitted despite successful `verify` command status.
3. No planning output emitted despite successful `plan` command status.
4. Logs are invocation-only, so false confidence is possible if command exit code is interpreted as analysis success.

## Top 5 Issues Summary
1. Stub Playbook CLI prevents actual analysis.
2. Missing `findings.json` blocks correctness insight extraction.
3. Missing `plan.json` blocks prioritized implementation planning from tooling.
4. Potential child/parent ownership drift due to non-composite invariants.
5. Concurrency risk on `set_index` append path without retry logic.
