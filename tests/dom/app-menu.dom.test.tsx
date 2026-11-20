import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { AppMenu } from "../../src/components/AppNav.tsx";
import { ScreenHeader } from "../../src/components/ui/app/ScreenHeader.tsx";
import { ScreenHeaderMenuProvider } from "../../src/components/ui/app/ScreenHeaderMenu.tsx";

afterEach(() => {
  cleanup();
});

// The app menu as the tab screens render it: inside the shell's menu provider, on the ScreenHeader title line.
function renderTabHeader(pathname = "/today") {
  const { router } = createRouterSpy();
  render(
    <AppProviders router={router} pathname={pathname}>
      <ScreenHeaderMenuProvider menu={<AppMenu />}>
        <ScreenHeader kind="tab" title="Today" status={<span>– Offline</span>} />
        <button type="button">Body action</button>
      </ScreenHeaderMenuProvider>
    </AppProviders>,
  );
  return {
    toggle: () => screen.getByRole("button", { name: /menu$/ }),
    panel: () => document.querySelector("[data-app-menu-panel]") as HTMLElement,
  };
}

test("App menu: the button sits on the header title line after the title, and the panel starts closed", () => {
  const { toggle, panel } = renderTabHeader();
  const header = document.querySelector('[data-screen-header="tab"]') as HTMLElement;
  const slot = within(header).getByRole("button", { name: "Open menu" }).closest("[data-screen-header-menu]");
  assert.ok(slot, "menu renders in the header menu slot");
  const heading = within(header).getByRole("heading", { level: 1, name: "Today" });
  assert.ok(heading.compareDocumentPosition(slot as Node) & Node.DOCUMENT_POSITION_FOLLOWING, "menu comes after the title");
  assert.equal(heading.nextSibling?.textContent, "– Offline", "inline status follows the title");

  assert.equal(toggle().getAttribute("aria-expanded"), "false");
  assert.equal(toggle().getAttribute("aria-controls"), panel().id);
  assert.equal(panel().getAttribute("data-app-menu-panel"), "closed");
  for (const link of within(panel()).getAllByRole("link", { hidden: true })) {
    assert.equal(link.getAttribute("tabindex"), "-1", "closed rows are out of the tab order");
  }
});

test("App menu: opening moves focus to the current screen; Escape closes and returns focus to the button", () => {
  const { toggle, panel } = renderTabHeader("/history/abc");
  fireEvent.click(toggle());
  assert.equal(toggle().getAttribute("aria-expanded"), "true");
  assert.equal(toggle().getAttribute("aria-label"), "Close menu");
  const current = within(panel()).getByRole("link", { name: "History" });
  assert.equal(current.getAttribute("aria-current"), "page");
  assert.equal(document.activeElement, current);

  fireEvent.keyDown(current, { key: "Escape" });
  assert.equal(toggle().getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, toggle());
});

test("App menu: arrows, Home and End move between rows; Tab and Shift+Tab never leave the open menu", () => {
  const { toggle, panel } = renderTabHeader("/today");
  fireEvent.click(toggle());
  const rows = within(panel()).getAllByRole("link");
  assert.deepEqual(rows.map((row) => row.textContent), ["Today", "Routines", "History", "Settings"]);
  assert.equal(document.activeElement, rows[0]);

  fireEvent.keyDown(rows[0], { key: "ArrowDown" });
  assert.equal(document.activeElement, rows[1]);
  fireEvent.keyDown(rows[1], { key: "End" });
  assert.equal(document.activeElement, rows[3]);
  fireEvent.keyDown(rows[3], { key: "ArrowDown" });
  assert.equal(document.activeElement, rows[0], "wraps");
  fireEvent.keyDown(rows[0], { key: "ArrowUp" });
  assert.equal(document.activeElement, rows[3]);

  // Tab from the last row goes to the X button, not to the body button after the header.
  fireEvent.keyDown(rows[3], { key: "Tab" });
  assert.equal(document.activeElement, toggle());
  fireEvent.keyDown(toggle(), { key: "Tab", shiftKey: true });
  assert.equal(document.activeElement, rows[3]);
  assert.equal(toggle().getAttribute("aria-expanded"), "true");
});

test("App menu: a tap outside closes it; a tap inside does not", () => {
  const { toggle, panel } = renderTabHeader("/routines");
  fireEvent.click(toggle());
  fireEvent.pointerDown(panel());
  assert.equal(toggle().getAttribute("aria-expanded"), "true");
  fireEvent.pointerDown(screen.getByRole("button", { name: "Body action" }));
  assert.equal(toggle().getAttribute("aria-expanded"), "false");
});

test("App menu: Escape with focus outside the menu still closes it", () => {
  const { toggle } = renderTabHeader("/routines");
  fireEvent.click(toggle());
  act(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(toggle().getAttribute("aria-expanded"), "false");
});

test("App menu: ArrowDown on the closed button opens it; picking a row closes it", () => {
  const { toggle, panel } = renderTabHeader("/today");
  fireEvent.keyDown(toggle(), { key: "ArrowDown" });
  assert.equal(toggle().getAttribute("aria-expanded"), "true");
  fireEvent.click(within(panel()).getByRole("link", { name: "Settings" }));
  assert.equal(toggle().getAttribute("aria-expanded"), "false");
});

test("App menu: Settings stays current on the Account screen", () => {
  const { toggle, panel } = renderTabHeader("/account");
  fireEvent.click(toggle());
  assert.equal(within(panel()).getByRole("link", { name: "Settings" }).getAttribute("aria-current"), "page");
});

test("ScreenHeader: no menu slot without the shell provider (detail screens stay Back-only)", () => {
  const { router } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/routines/1">
      <ScreenHeader kind="detail" title="Push day" />
    </AppProviders>,
  );
  assert.equal(document.querySelector("[data-screen-header-menu]"), null);
  assert.equal(screen.queryByRole("button", { name: "Open menu" }), null);
});
