import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { AppTabBar, AppTabBarPreview, useHideAppTabBar } from "../../src/components/AppTabBar.tsx";
import { ScreenHeader } from "../../src/components/ui/app/ScreenHeader.tsx";
import { APP_TAB_DESTINATIONS } from "../../src/lib/app-tabs.ts";

afterEach(() => {
  cleanup();
});

function renderBar(pathname: string, extra: React.ReactNode = null) {
  const spy = createRouterSpy();
  render(
    <AppProviders router={spy.router} pathname={pathname}>
      {extra}
      <AppTabBar />
    </AppProviders>,
  );
  return { ...spy, nav: () => screen.queryByRole("navigation", { name: "Sections" }) };
}

test("Tab bar: four labelled tabs in order, the current one marked, each a full-width 56px target", () => {
  const { nav, calls } = renderBar("/today");
  const bar = nav();
  assert.ok(bar, "the bar renders on a tab root");
  assert.ok(bar.hasAttribute("data-app-tab-bar"));
  const links = within(bar).getAllByRole("link");
  assert.deepEqual(
    links.map((link) => ({ href: link.getAttribute("href"), label: link.textContent })),
    APP_TAB_DESTINATIONS.map(({ href, label }) => ({ href, label })),
  );
  assert.equal(within(bar).getByRole("link", { name: "Today" }).getAttribute("aria-current"), "page");
  for (const link of links) {
    assert.match(link.className, /\bh-14\b/, "56px tall (44px floor)");
    assert.ok(link.querySelector("svg[aria-hidden='true']"), "icon is decorative; the label names the tab");
  }
  assert.match(bar.className, /pb-\[env\(safe-area-inset-bottom,0px\)\]/, "the bar carries the home-indicator inset");
  assert.deepEqual([...calls.prefetch].sort(), APP_TAB_DESTINATIONS.map((tab) => tab.href).sort(), "tabs are prefetched");
});

test("Tab bar: read-only children keep the bar and highlight their section; /account highlights Settings", () => {
  for (const [pathname, current] of [
    ["/history/abc", "History"],
    ["/history/exercises", "History"],
    ["/routines/r-1", "Routines"],
    ["/routines/workout-plans", "Routines"],
    ["/account", "Settings"],
  ] as const) {
    const { nav } = renderBar(pathname);
    const bar = nav();
    assert.ok(bar, `${pathname} shows the bar`);
    assert.equal(within(bar).getByRole("link", { name: current }).getAttribute("aria-current"), "page", pathname);
    cleanup();
  }
});

test("Tab bar: hidden in the live workout, editors and pickers, auth, and /dev without a preview", () => {
  for (const pathname of [
    "/session/s-1",
    "/routines/new",
    "/routines/r-1/edit",
    "/routines/r-1/edit/day/d-1",
    "/routines/r-1/edit/day/d-1/add-exercise",
    "/login",
    "/signup",
    "/dev/mobile-regression",
  ]) {
    const { nav } = renderBar(pathname);
    assert.equal(nav(), null, `${pathname} has no bar`);
    assert.equal(document.querySelector("[data-app-tab-bar]"), null, `${pathname} leaves no bar node (body:has stays off)`);
    cleanup();
  }
});

test("Tab bar: a /dev fixture previews its product route; dev never prefetches", () => {
  const shown = renderBar("/dev/mobile-regression", <AppTabBarPreview pathname="/history" />);
  const bar = shown.nav();
  assert.ok(bar, "preview of a tab root shows the bar");
  assert.equal(within(bar).getByRole("link", { name: "History" }).getAttribute("aria-current"), "page");
  assert.deepEqual(shown.calls.prefetch, []);
  cleanup();

  const hidden = renderBar("/dev/mobile-regression", <AppTabBarPreview pathname="/session/fixture" />);
  assert.equal(hidden.nav(), null, "preview of the workout keeps it hidden");
});

function EditingSwitch({ editing }: { editing: boolean }) {
  useHideAppTabBar(editing);
  return null;
}

test("Tab bar: an in-route editor hides it while editing and brings it back after", () => {
  const spy = createRouterSpy();
  const view = render(
    <AppProviders router={spy.router} pathname="/history/abc">
      <EditingSwitch editing={false} />
      <AppTabBar />
    </AppProviders>,
  );
  assert.ok(screen.queryByRole("navigation", { name: "Sections" }));
  view.rerender(
    <AppProviders router={spy.router} pathname="/history/abc">
      <EditingSwitch editing />
      <AppTabBar />
    </AppProviders>,
  );
  assert.equal(screen.queryByRole("navigation", { name: "Sections" }), null);
  view.rerender(
    <AppProviders router={spy.router} pathname="/history/abc">
      <EditingSwitch editing={false} />
      <AppTabBar />
    </AppProviders>,
  );
  assert.ok(screen.queryByRole("navigation", { name: "Sections" }));
});

test("Tab bar: a tap highlights the new tab at once, before the route changes", () => {
  const { nav } = renderBar("/today");
  const routines = within(nav() as HTMLElement).getByRole("link", { name: "Routines" });
  act(() => {
    fireEvent.click(routines);
  });
  const refreshed = within(nav() as HTMLElement).getByRole("link", { name: "Routines" });
  assert.equal(refreshed.getAttribute("data-active"), "true");
  assert.equal(within(nav() as HTMLElement).getByRole("link", { name: "Today" }).getAttribute("data-active"), null);
});

test("ScreenHeader: no navigation in any header (tab or detail) and no header notice anchor", () => {
  const { router } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/today">
      <ScreenHeader kind="tab" title="Today" status={<span>– Offline</span>} />
      <ScreenHeader kind="detail" title="Bench press" back={<button type="button">Back</button>} />
    </AppProviders>,
  );
  for (const header of document.querySelectorAll("[data-screen-header]")) {
    assert.equal(header.querySelector("nav, a"), null);
    assert.equal(header.querySelector("[data-app-notice-anchor]"), null);
  }
  assert.equal(screen.queryByRole("button", { name: /menu$/ }), null);
});
