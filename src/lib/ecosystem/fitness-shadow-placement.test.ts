import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTodayRecoveryShadowPlacementHref,
  buildTodayRecoveryShadowPlacementModel,
} from "./fitness-shadow-placement-model.ts";

test("buildTodayRecoveryShadowPlacementHref carries the frozen attribution keys into the deep link", () => {
  const href = buildTodayRecoveryShadowPlacementHref({
    pathname: "/today",
    params: {
      memberId: "member-shadow-1",
      sourceOutboundId: "out-shadow-1",
      placementId: "recovery_reset_shadow_placement",
      cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
    },
  });

  assert.equal(
    href,
    "/today?memberId=member-shadow-1&sourceOutboundId=out-shadow-1&placementId=recovery_reset_shadow_placement&cohortId=fitness_growth_shadow_recovery_reset_v1%3Atreatment_shadow%3A80&shadowPlacement=recovery_reset_shadow_placement&focus=recovery_reset_shadow",
  );
});

test("buildTodayRecoveryShadowPlacementModel selects the latest shadow-placed candidate for the current member-day", () => {
  const placement = buildTodayRecoveryShadowPlacementModel({
    memberId: "member-shadow-1",
    observedDay: "2026-04-19",
    report: {
      pack_id: "atlas-fitness-growth-pack",
      pack_version: "atlas.fitness.growth-pack.v1",
      consumer_of_pack_versions: ["atlas.fitness.wave-2-metrics-pack.v1"],
      warehouse_receipt_count: 4,
      placement_contract: {
        placement_id: "recovery_reset_shadow_placement",
        label: "Recovery reset follow-up",
        surface_id: "today_recovery_banner",
        mode: "shadow_only",
        success_kpi_ids: ["recovery_guardrail_application_rate"],
      },
      baseline_dashboard: {
        pack_id: "atlas-fitness-funnel-dashboard-pack",
        pack_version: "atlas.fitness.funnel-dashboard-pack.v1",
        recovery_warning_stage_count: 1,
        recovery_guardrail_application_rate: {
          numerator: 0,
          denominator: 1,
          value: 0,
        },
      },
      summary: {
        candidate_count: 2,
        eligible_count: 1,
        suppressed_count: 0,
        control_count: 0,
        placed_count: 1,
        attributed_conversion_count: 0,
      },
      acceptance_checks: [],
      candidates: [
        {
          placement_id: "recovery_reset_shadow_placement",
          member_id: "member-shadow-1",
          source_outbound_id: "out-shadow-older",
          week_start_date: "2026-04-13",
          observed_day: "2026-04-19",
          trigger_occurred_at: "2026-04-19T09:00:00.000Z",
          experiment_arm: "treatment_shadow",
          cohort_id: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:45",
          cohort_bucket: 45,
          eligible_rule_ids_met: ["actionable_recovery_warning", "open_weekly_progress_window"],
          ineligibility_reasons: [],
          suppression_rule_ids: [],
          placement_status: "shadow_placed",
          attribution: {
            sourceOutboundId: "out-shadow-older",
          },
          deep_link: {
            pathname: "/today",
            params: {
              memberId: "member-shadow-1",
              sourceOutboundId: "out-shadow-older",
              placementId: "recovery_reset_shadow_placement",
              cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:45",
            },
          },
          converted_on_primary_receipt: false,
        },
        {
          placement_id: "recovery_reset_shadow_placement",
          member_id: "member-shadow-1",
          source_outbound_id: "out-shadow-latest",
          week_start_date: "2026-04-13",
          observed_day: "2026-04-19",
          trigger_occurred_at: "2026-04-19T10:30:00.000Z",
          experiment_arm: "treatment_shadow",
          cohort_id: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
          cohort_bucket: 80,
          eligible_rule_ids_met: ["actionable_recovery_warning", "open_weekly_progress_window"],
          ineligibility_reasons: [],
          suppression_rule_ids: [],
          placement_status: "shadow_placed",
          attribution: {
            sourceOutboundId: "out-shadow-latest",
          },
          deep_link: {
            pathname: "/today",
            params: {
              memberId: "member-shadow-1",
              sourceOutboundId: "out-shadow-latest",
              placementId: "recovery_reset_shadow_placement",
              cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
            },
          },
          converted_on_primary_receipt: false,
        },
      ],
    },
  });

  assert.equal(placement?.sourceOutboundId, "out-shadow-latest");
  assert.equal(placement?.surfaceId, "today_recovery_banner");
  assert.equal(
    placement?.destinationHref,
    "/today?memberId=member-shadow-1&sourceOutboundId=out-shadow-latest&placementId=recovery_reset_shadow_placement&cohortId=fitness_growth_shadow_recovery_reset_v1%3Atreatment_shadow%3A80&shadowPlacement=recovery_reset_shadow_placement&focus=recovery_reset_shadow",
  );
});
