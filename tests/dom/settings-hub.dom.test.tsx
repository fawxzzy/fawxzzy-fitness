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

type UnitsAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;

function renderHub(unitsAction: UnitsAction = async () => ({ ok: true })) {
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
          signedInAs="zac@example.com"
          units={{ weightUnit: "kg", distanceUnit: "km", timeZone: "Europe/London" }}
          unitsAction={unitsAction}
        />
      </SettingsScreenStateProvider></BottomActionsProvider>
    </AppProviders>,
  );
}

function sectionCard(name: string) {
  return screen.getByRole("heading", { level: 2, name }).closest("[data-settings-section-card]") as HTMLElement;
}

test("Hub: each section card carries a live summary chip (units, plan, theme in use); Achievements live in History", async () => {
  writeStoredAppThemeSelection("rose");
  renderHub();

  assert.ok(within(sectionCard("Pro Access")).getByText("Free"));
  assert.ok(within(sectionCard("Units & time zone")).getByText("kg · km"));
  assert.equal(screen.queryByRole("heading", { level: 2, name: "Achievements" }), null);
  await waitFor(() => assert.ok(within(sectionCard("App Theme")).getByText("Rose Circuit")));
});

test("Units & time zone: change a unit, one Save sends all three values, the result is a notice (not red text)", async () => {
  const sent: Array<Record<string, string>> = [];
  renderHub(async (formData) => {
    sent.push(Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)])));
    return sent.length === 1 ? { ok: false, error: "Could not save units and time zone. Try again." } : { ok: true };
  });

  fireEvent.click(within(sectionCard("Units & time zone")).getByRole("button"));
  const save = await screen.findByRole("button", { name: /^Saved/ });
  assert.equal((save as HTMLButtonElement).disabled, true, "nothing changed yet");

  fireEvent.click(within(screen.getByRole("tablist", { name: "Weight unit" })).getByRole("tab", { name: "lb" }));
  fireEvent.click(screen.getByRole("button", { name: /^Save(?!d)/ }));
  await screen.findByText("Could not save units and time zone. Try again.");
  assert.deepEqual(sent[0], { weightUnit: "lbs", distanceUnit: "km", timeZone: "Europe/London" });

  // The failed save leaves the choice in place and Save ready again once the first request settles.
  await waitFor(() => assert.equal((screen.getByRole("button", { name: /^Save(?!d)/ }) as HTMLButtonElement).disabled, false));
  fireEvent.click(screen.getByRole("button", { name: /^Save(?!d)/ }));
  await screen.findByText("Units and time zone saved.");
  assert.equal(sent.length, 2);
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

test("Hub: the theme chip follows a theme change made while Settings is open", async () => {
  writeStoredAppThemeSelection("default");
  renderHub();
  await waitFor(() => assert.ok(within(sectionCard("App Theme")).getByText("Default theme")));

  act(() => {
    writeStoredAppThemeSelection("rose");
  });
  await waitFor(() => assert.ok(within(sectionCard("App Theme")).getByText("Rose Circuit")));
});
