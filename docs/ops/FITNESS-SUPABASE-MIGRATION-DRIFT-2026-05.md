# Fitness Supabase Migration Drift - 2026-05

## Purpose
This report captures the Discord-era Supabase migration drift that affected Fitness project `lpswxoyfniocuhljgzbc`, what was recovered locally, and how the final ledger repair was completed.

This lane did not change production schema behavior. It repaired history only after schema evidence confirmed the relevant migrations had already taken effect in production.

## Starting problem
The Discord community rollout left local and remote migration history out of sync.

Symptoms:
- `supabase migration list --linked` showed remote-only and local-only versions
- `npm run migration:validate` failed
- Discord-related DB changes increasingly required surgical production application instead of normal linked workflow

## Repair summary
The repair happened in three stages:

1. Recover missing remote-only local migration files.
2. Renumber locally equivalent files to match the versions production actually recorded.
3. Verify schema effects for the remaining `057` through `061` Discord migrations, then mark those exact versions as `applied` in the remote migration ledger.

## Recovered local migration files
These remote-history files were restored locally:
- `20260509113000_051_progression_events.sql`
- `20260510090000_052_routine_core_rls_initplan.sql`
- `20260510110000_053_profile_catalog_rls_initplan.sql`
- `20260511093000_054_follow_up_jobs_rls_initplan.sql`
- `20260513113000_055_routine_schedule_mode.sql`

## Renumbered local files
These local files were renamed to match production-applied remote versions after verifying the remote ledger names and SQL shape:
- `20260515103000_055_discord_member_links.sql` -> `20260515090309_055_discord_member_links.sql`
- `20260515120000_056_compact_public_member_numbers.sql` -> `20260515090322_056_compact_public_member_numbers.sql`
- `20260516110000_062_discord_update_drafts.sql` -> `20260516063128_discord_update_drafts.sql`
- `20260516130000_063_discord_feedback_attachments.sql` -> `20260516174200_discord_feedback_attachments.sql`

## Final ledger repair
After production schema evidence was collected for the remaining gap set, these exact versions were repaired in the remote ledger:
- `20260515130000`
- `20260515140000`
- `20260515150000`
- `20260515160000`
- `20260515170000`

Those map to:
- `057_discord_bug_reports`
- `058_discord_bug_report_forum_tags`
- `059_discord_feedback_reports`
- `060_discord_member_number_sync_queue`
- `061_discord_feedback_feature_report_type`

## Result
The remote and local migration chains are now aligned.

Validation result:
- `npm run migration:validate` -> pass
- `supabase migration list --linked` -> local and remote versions aligned

## Guardrail
This repair should be treated as the correct pattern for future history repair:
- verify the production schema effects first
- repair only the exact missing versions
- do not use migration-history repair to guess or invent schema state

## Related evidence
Detailed proof for the `057` through `061` ledger repair lives in:
- `docs/ops/FITNESS-SUPABASE-MIGRATION-LEDGER-REPAIR-2026-05.md`
