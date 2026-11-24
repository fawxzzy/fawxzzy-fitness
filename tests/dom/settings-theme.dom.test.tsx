import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { BottomActionsProvider, BottomActionsSlot } from "../../src/components/layout/bottom-actions.tsx";
import { AppThemeSettings } from "../../src/components/settings/AppThemeSettings.tsx";
import {
  DEFAULT_APP_THEME,
  ROSE_APP_THEME,
  readStoredAppThemeLibrary,
  readStoredAppThemeSelection,
  writeStoredAppThemeLibrary,
  writeStoredAppThemeSelection,
} from "../../src/lib/app-theme.ts";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

function renderTheme() {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/settings">
      <BottomActionsProvider>
        <AppThemeSettings />
        <BottomActionsSlot />
      </BottomActionsProvider>
    </AppProviders>,
  );
}

function themeCard(title: string) {
  const heading = screen.getByRole("heading", { name: title, level: 3 });
  return heading.closest("[data-card-surface]") as HTMLElement;
}

function seedCustomTheme(name = "Night Run") {
  writeStoredAppThemeLibrary([{ id: "custom-1", name, theme: { ...ROSE_APP_THEME, preset: "default" } }]);
  writeStoredAppThemeSelection("custom-1");
}

test("Theme: picking a built-in theme selects it, marks it Selected, and persists the choice", async () => {
  renderTheme();
  await waitFor(() => assert.ok(themeCard("Default theme").querySelector("[data-card-chip]")));

  fireEvent.click(within(themeCard("Rose Circuit")).getByRole("button", { pressed: false }));

  await waitFor(() => assert.equal(readStoredAppThemeSelection(), "rose"));
  assert.ok(within(themeCard("Rose Circuit")).getByText("Selected"));
  assert.equal(within(themeCard("Default theme")).queryByText("Selected"), null);
});

test("Theme: every choice card carries a colour swatch that comes from its own theme", async () => {
  seedCustomTheme();
  renderTheme();
  await screen.findByRole("heading", { name: "Night Run", level: 3 });

  for (const title of ["Default theme", "Rose Circuit", "Night Run"]) {
    assert.ok(themeCard(title).querySelector("[data-theme-swatch]"), `${title} has a swatch`);
  }
  const defaultSwatch = themeCard("Default theme").querySelector("[data-theme-swatch]") as HTMLElement;
  const roseSwatch = themeCard("Rose Circuit").querySelector("[data-theme-swatch]") as HTMLElement;
  assert.notEqual(defaultSwatch.getAttribute("data-theme-swatch"), roseSwatch.getAttribute("data-theme-swatch"));
  assert.equal(defaultSwatch.getAttribute("data-theme-swatch")?.includes(DEFAULT_APP_THEME.primaryActionColor.toLowerCase()), true);
});

test("Theme: Delete asks first, names the theme, and Cancel keeps it", async () => {
  seedCustomTheme();
  renderTheme();
  await screen.findByRole("heading", { name: "Night Run", level: 3 });

  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("dialog");
  assert.equal(dialog.querySelector("[data-confirm-object-name]")?.textContent, "Night Run");
  assert.ok(within(dialog).getByText(/this device/i));
  assert.equal(readStoredAppThemeLibrary().length, 1, "nothing is deleted before Confirm");

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(readStoredAppThemeLibrary().length, 1);
});

test("Theme: confirming Delete removes the saved theme from storage and says so in the notice", async () => {
  seedCustomTheme();
  renderTheme();
  await screen.findByRole("heading", { name: "Night Run", level: 3 });

  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));

  await waitFor(() => assert.equal(readStoredAppThemeLibrary().length, 0));
  await screen.findByText("\"Night Run\" deleted.");
  assert.equal(screen.queryByRole("heading", { name: "Night Run", level: 3 }), null);
});

test("Theme: saving without a name reports through the notice, not as red text in the screen", async () => {
  renderTheme();
  await waitFor(() => assert.ok(themeCard("Default theme")));

  fireEvent.click(within(themeCard("New custom theme")).getByRole("button", { pressed: false }));
  fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "20" } });

  const save = await screen.findByRole("button", { name: "Save theme" });
  assert.equal((save as HTMLButtonElement).disabled, true, "nothing to save without a name");
  fireEvent.change(screen.getByLabelText("Theme name"), { target: { value: "Dawn" } });
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Save theme" }) as HTMLButtonElement).disabled, false));
  fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

  await screen.findByText("\"Dawn\" saved.");
  assert.deepEqual(readStoredAppThemeLibrary().map((entry) => entry.name), ["Dawn"]);
  assert.equal(readStoredAppThemeSelection(), "custom-1");
  assert.equal(document.querySelectorAll("[data-card-surface] [role='alert']").length, 0);
});

test("Theme: a theme with unsaved edits says so", async () => {
  seedCustomTheme();
  renderTheme();
  await screen.findByRole("heading", { name: "Night Run", level: 3 });
  assert.equal(screen.queryByText(/Unsaved changes/), null);

  fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "12" } });
  await screen.findByText(/Unsaved changes/);
});
