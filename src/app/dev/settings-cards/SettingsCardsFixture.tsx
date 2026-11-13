"use client";

import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { SettingsFloatingHeader } from "@/components/settings/SettingsFloatingHeader";
import { SettingsScreenStateProvider, type SettingsSectionKey } from "@/components/settings/SettingsScreenState";
import { SettingsSectionsClient } from "@/components/settings/SettingsSectionsClient";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { appTokens } from "@/components/ui/app/tokens";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import type { HistoryAchievement } from "@/lib/history-achievements";

const SECTION_KEYS = ["account", "achievements", "pro", "data", "discord", "theme"] as const;

const ACHIEVEMENTS: HistoryAchievement[] = [
  { id: "first-workout", title: "First Workout", description: "Complete one workout.", unlocked: true },
  { id: "ten-sessions", title: "Ten Sessions", description: "Complete ten workouts over time.", unlocked: true },
  { id: "three-week-streak", title: "Three Session Streak", description: "Log three consecutive planned workout days.", unlocked: false },
  { id: "first-pr", title: "PR Logged", description: "Record one history-backed PR moment.", unlocked: false },
];

const FREE_PLAN: ProAccessSnapshot = {
  schemaReady: true,
  accessState: "free",
  accessLabel: "Free",
  accessSource: null,
  offerMode: "founding",
  offerLabel: "Monthly Pro",
  checkoutConfigured: true,
  customerPortalAvailable: false,
  grantedAt: null,
  renewsAt: null,
  cancellationScheduledFor: null,
  lastPurchaseStatus: null,
  supportNote: "",
};

const PRO_PLAN: ProAccessSnapshot = {
  ...FREE_PLAN,
  accessState: "pro",
  accessLabel: "Pro",
  accessSource: "subscription",
  customerPortalAvailable: true,
  grantedAt: "2026-10-02T14:00:00.000Z",
  renewsAt: "2026-12-02T14:00:00.000Z",
};

function buildPreview(body: { fileType?: string; scope?: string }) {
  const scope = body.scope === "history" || body.scope === "routines" ? body.scope : "all";
  const scopeLabel = scope === "history" ? "History" : scope === "routines" ? "Routines" : "All";
  return {
    fileType: body.fileType ?? "csv",
    scope,
    scopeLabel,
    scopeSummaryLabel: `${scopeLabel} export.`,
    dateRange: { dateFrom: "2026-05-01", dateTo: "2026-05-09", label: "May 1, 2026 - May 9, 2026" },
    tables: [
      { key: "sessions", name: "Sessions", rowCount: 12, empty: false },
      { key: "sets", name: "Sets", rowCount: 96, empty: false },
      { key: "routines", name: "Routines", rowCount: 1, empty: false },
    ],
    includesProgressionEvents: scope !== "routines",
    progressionSummary: {
      eventCount: 3,
      promotionCount: 2,
      deloadCount: 0,
      manualChangeCount: 1,
      revertCount: 0,
      lockInCount: 0,
      linkedSessionCount: 2,
      distinctExerciseCount: 2,
      firstChangeAt: null,
      latestChangeAt: null,
      lastPromotionAt: null,
    },
    counts: {
      sessions: 13,
      completedSessions: 12,
      visibleCompletedSessions: 12,
      hiddenQaCompletedSessions: 0,
      visibleSessionExercises: 40,
      sessionExercises: 40,
      visibleSets: 96,
      sets: 96,
      routines: 1,
      routineDays: 7,
      routineExercises: 21,
      exercises: 30,
      progressionEvents: 3,
    },
  };
}

// Fixture only: answer the Data section's export preview request locally (this route has no session or API).
if (typeof window !== "undefined" && !(window as unknown as { __settingsFixtureFetch?: boolean }).__settingsFixtureFetch) {
  (window as unknown as { __settingsFixtureFetch?: boolean }).__settingsFixtureFetch = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/api/account/export/preview")) {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      return new Response(JSON.stringify({ ok: true, preview: buildPreview(body) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input, init);
  };
}

export function SettingsCardsFixture({ section, plan }: { section: string | null; plan: "free" | "pro" }) {
  const initialExpandedSection: SettingsSectionKey = SECTION_KEYS.find((key) => key === section) ?? null;

  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <SettingsScreenStateProvider initialExpandedSection={initialExpandedSection}>
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={<SettingsFloatingHeader email="dev-fixture@example.com" username="dev-fixture" />}
        >
          <ContentRail className={appTokens.settingsContentRail}>
            <div className="space-y-3">
              <SettingsSectionsClient
                userKind="human"
                userNumber={null}
                canAccessQaVisibilitySetting={false}
                showQaLlelData={false}
                initialExportDateFrom="2026-05-01"
                initialExportDateTo="2026-05-09"
                proAccess={plan === "pro" ? PRO_PLAN : FREE_PLAN}
                billingNotice={null}
                achievements={ACHIEVEMENTS}
              />
            </div>
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </SettingsScreenStateProvider>
    </MainTabScreen>
  );
}
