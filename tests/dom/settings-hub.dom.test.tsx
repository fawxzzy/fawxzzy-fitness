import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { BottomActionsProvider } from "../../src/components/layout/bottom-actions.tsx";
import { SettingsScreenStateProvider } from "../../src/components/settings/SettingsScreenState.tsx";
import { SettingsSectionsClient } from "../../src/components/settings/SettingsSectionsClient.tsx";
import { writeStoredAppThemeSelection } from "../../src/lib/app-theme.ts";
import type { ProAccessSnapshot } from "../../src/lib/billing/pro-access-snapshot.ts";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

const PLAN: ProAccessSnapshot = {
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

const ACHIEVEMENTS = [
  { id: "first-workout", title: "First workout", description: "x", unlocked: true },
  { id: "ten-sessions", title: "Ten sessions", description: "x", unlocked: false },
  { id: "three-week-streak", title: "Three-week streak", description: "x", unlocked: true },
  { id: "first-pr", title: "First PR", description: "x", unlocked: false },
] as const;

function renderHub() {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/settings">
      <BottomActionsProvider><SettingsScreenStateProvider>
        <SettingsSectionsClient
          userKind="human"
          userNumber={1}
          canAccessQaVisibilitySetting={false}
          initialExportDateFrom="2026-05-01"
          initialExportDateTo="2026-05-09"
          proAccess={PLAN}
          achievements={[...ACHIEVEMENTS]}
          signedInAs="zac@example.com"
        />
      </SettingsScreenStateProvider></BottomActionsProvider>
    </AppProviders>,
  );
}

function sectionCard(name: string) {
  return screen.getByRole("heading", { level: 2, name }).closest("[data-settings-section-card]") as HTMLElement;
}

test("Hub: each section card carries a live summary chip (plan, achievements earned, theme in use)", async () => {
  writeStoredAppThemeSelection("rose");
  renderHub();

  assert.ok(within(sectionCard("Pro Access")).getByText("Free"));
  assert.ok(within(sectionCard("Achievements")).getByText("2 of 4"));
  await waitFor(() => assert.ok(within(sectionCard("App Theme")).getByText("Rose Circuit")));
});

test("Hub: Sign out names the account that is signed in before anything is sent", () => {
  renderHub();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  const dialog = screen.getByRole("dialog");
  assert.equal(dialog.querySelector("[data-confirm-object-name]")?.textContent, "zac@example.com");
});

test("Hub: going offline shows a plain notice that says what still works, and coming back removes it", async () => {
  renderHub();
  assert.equal(screen.queryByText(/You are offline/), null);

  Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  await screen.findByText(/You are offline\. Theme and saved choices still work/);

  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
  await waitFor(() => assert.equal(screen.queryByText(/You are offline/), null));
});
