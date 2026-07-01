import { AppNav } from "@/components/AppNav";
import { cookies } from "next/headers";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { SettingsAccordionClient } from "@/components/settings/SettingsAccordionClient";
import { SettingsFloatingHeader } from "@/components/settings/SettingsFloatingHeader";
import { SettingsScreenStateProvider } from "@/components/settings/SettingsScreenState";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { appTokens } from "@/components/ui/app/tokens";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getAccountWorkoutExportSuggestedDateRange } from "@/lib/account-workout-export";
import { requireUser } from "@/lib/auth";
import { optionalEnv } from "@/lib/env";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import { loadProAccessSnapshot } from "@/lib/billing/pro-access";
import {
  QA_LLEL_VISIBILITY_COOKIE,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function resolveSettingsSection(value: string | string[] | undefined) {
  const section = Array.isArray(value) ? value[0] : value;
  return section === "account" || section === "pro" || section === "data" || section === "legacy" || section === "discord" || section === "theme"
    ? section
    : null;
}

function resolveBillingNotice(value: string | string[] | undefined): "success" | "cancel" | null {
  const notice = Array.isArray(value) ? value[0] : value;
  return notice === "success" || notice === "cancel" ? notice : null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const diagnostics = new LoadingDiagnosticsCollector("/settings");
  const user = await requireUser({
    gate: "settings.auth.session",
    route: "/settings",
    blockingReason: "Waiting for authenticated session before opening Settings.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("settings.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for Settings profile bootstrap.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
  const rawMetadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata as Record<string, unknown>
    : {};
  const username = typeof rawMetadata.username === "string"
    ? rawMetadata.username.trim()
    : typeof rawMetadata.display_name === "string"
      ? rawMetadata.display_name.trim()
      : "";
  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  const zacEmail = optionalEnv("FITNESS_ZAC_EMAIL")?.trim().toLowerCase() ?? null;
  const legacyBridgeConfigured = Boolean(
    optionalEnv("LEGACY_SUPABASE_URL") && optionalEnv("LEGACY_SUPABASE_ANON_KEY"),
  );
  const canAccessQaVisibilitySetting =
    profile.user_number === 0
    || (Boolean(zacEmail) && normalizedEmail === zacEmail)
    || (!zacEmail && process.env.NODE_ENV !== "production");
  const qaVisibilityOverride = resolveQaLlelVisibilityOverride(
    cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value,
  );
  const showQaLlelData = resolveShowQaLlelDataPreferenceWithOverride(profile, qaVisibilityOverride);
  const exportDateRange = await diagnostics.measure("settings.export.date-range", () => getAccountWorkoutExportSuggestedDateRange({
    supabase: supabaseServer(),
    userId: user.id,
  }), {
    blockingReason: "Loading default export date range.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
  const initialExpandedSection = resolveSettingsSection(searchParams?.section);
  const billingNotice = resolveBillingNotice(searchParams?.billing);
  const proAccess = await diagnostics.measure("settings.pro-access.snapshot", () => loadProAccessSnapshot(user.id), {
    blockingReason: "Loading Pro access status.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });

  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <SettingsScreenStateProvider initialExpandedSection={initialExpandedSection}>
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={<SettingsFloatingHeader email={user.email ?? ""} username={username} />}
        >
          <ContentRail className={appTokens.settingsContentRail}>
            <SurfaceCard className="!border-transparent !bg-transparent !shadow-none !backdrop-blur-0">
              <SettingsAccordionClient
                email={user.email ?? ""}
                username={username}
                legacyBridgeConfigured={legacyBridgeConfigured}
                userKind={profile.user_kind}
                userNumber={profile.user_number}
                canAccessQaVisibilitySetting={canAccessQaVisibilitySetting}
                showQaLlelData={showQaLlelData}
                initialExportDateFrom={exportDateRange.dateFrom}
                initialExportDateTo={exportDateRange.dateTo}
                proAccess={proAccess}
                billingNotice={billingNotice}
              />
            </SurfaceCard>
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </SettingsScreenStateProvider>
    </MainTabScreen>
  );
}
