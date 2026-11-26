import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import { toPlainProgressionChartSections, toPlainProgressionDashboard } from "./progression-dashboard-copy";

test("Progression summary leads with promotions this month and drops vector/method jargon (DESIGN #7)", () => {
  const model = buildProgressionHistoryDisplayModel({ events: [] });
  const labels = toPlainProgressionDashboard(model.dashboardCards).map((card) => card.label);
  assert.deepEqual(labels.slice(0, 2), ["Promotions this month", "Top progressed"]);
  for (const jargon of ["Total events", "Most active vector", "Most active method"]) {
    assert.equal(labels.includes(jargon), false, `${jargon} is hidden`);
  }
  assert.ok(labels.includes("Promotions in total"));
  const charts = toPlainProgressionChartSections(model.chartSections).map((section) => section.id);
  assert.equal(charts.includes("vector-distribution"), false);
  assert.ok(charts.includes("top-promotions"));
});
