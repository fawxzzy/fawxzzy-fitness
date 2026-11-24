import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { HistoryFilterBar, type HistoryFilterGroup } from "../../src/components/history/HistoryFilterBar.tsx";
import { HistoryLoadErrorState, resolveHistoryLoadErrorNotice } from "../../src/components/history/HistoryLoadErrorState.tsx";
import { HistorySessionMissingState } from "../../src/components/history/HistorySessionMissingState.tsx";
import { ProgressionHistoryFilters } from "../../src/components/history/ProgressionHistoryFilters.tsx";

// History redesign 2026-11-23: one Filters button + bottom sheet replaces the sideways chip rails (review items 1, 5,
// 15); picked filters are removable chips; load errors say their words once, in the in-flow notice (items 0b, 7).

afterEach(() => {
  cleanup();
});

const TAGS = ["Push", "Pull", "Legs", "Core", "Cardio", "Mobility", "Upper", "Lower"];

function SessionsHarness() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const toggle = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  const groups: HistoryFilterGroup[] = [
    {
      key: "tags",
      title: "Muscle",
      collapsedLimit: 5,
      options: TAGS.map((tag) => ({ key: tag, label: tag, selected: tags.includes(tag), onSelect: () => toggle(tag) })),
    },
  ];
  return (
    <HistoryFilterBar
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="Search sessions…"
      searchLabel="Search sessions"
      activeFilterCount={tags.length}
      activeChips={tags.map((tag) => ({ key: tag, label: tag, onRemove: () => toggle(tag) }))}
      onClearAll={() => {
        setQuery("");
        setTags([]);
      }}
      groups={groups}
      resultCount={12 - tags.length * 3}
      resultSingularLabel="session"
      resultPluralLabel="sessions"
    />
  );
}

function mount(ui: React.ReactNode, pathname = "/history") {
  const spy = createRouterSpy();
  const view = render(
    <AppProviders router={spy.router} pathname={pathname}>
      {ui}
    </AppProviders>,
  );
  return { ...spy, view };
}

test("filters open in a sheet of wrapped 44px chips, never a sideways rail", () => {
  mount(<SessionsHarness />);
  const filtersButton = screen.getByRole("button", { name: "Filters" });
  assert.match(filtersButton.className, /min-h-11/);
  assert.equal(document.querySelector('[data-history-filter-bar="true"] .overflow-x-auto') === null, true, "no horizontal scroller");

  fireEvent.click(filtersButton);
  const sheet = screen.getByRole("dialog");
  const group = sheet.querySelector('[data-history-filter-group="tags"]');
  assert.ok(group, "the tag group renders in the sheet");
  const chipRow = group.querySelector("div");
  assert.match(chipRow?.className ?? "", /flex-wrap/);

  // Long lists collapse behind "Show all N".
  assert.equal(within(sheet).queryByRole("button", { name: "Mobility" }) === null, true);
  fireEvent.click(within(sheet).getByRole("button", { name: "Show all 8" }));
  const mobility = within(sheet).getByRole("button", { name: "Mobility" });
  assert.match(mobility.className, /min-h-11/);
  assert.equal(mobility.getAttribute("aria-pressed"), "false");
});

test("picking filters updates the count, shows removable chips, and Clear all resets", async () => {
  mount(<SessionsHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  const sheet = screen.getByRole("dialog");
  fireEvent.click(within(sheet).getByRole("button", { name: "Push" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Pull" }));
  assert.equal(within(sheet).getByRole("button", { name: /Push/ }).getAttribute("aria-pressed"), "true");

  // The footer closes the sheet with the live count.
  fireEvent.click(within(sheet).getByRole("button", { name: "Show 6 sessions" }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog") === null, true, "the sheet closes"));

  assert.ok(screen.getByRole("button", { name: "Filters, 2 on" }));
  const onList = screen.getByRole("list", { name: "Filters on" });
  fireEvent.click(within(onList).getByRole("button", { name: "Remove filter Push" }));
  assert.ok(screen.getByRole("button", { name: "Filters, 1 on" }));
  assert.equal(within(screen.getByRole("list", { name: "Filters on" })).queryByRole("button", { name: "Clear all" }) === null, true, "Clear all only with 2+ chips");

  fireEvent.change(screen.getByLabelText("Search sessions"), { target: { value: "bench" } });
  fireEvent.click(screen.getByRole("button", { name: "Clear search sessions" }));
  assert.equal((screen.getByLabelText("Search sessions") as HTMLInputElement).value, "");
});

test("progression filters live in the URL and clear back to the bare route", () => {
  const { calls } = mount(
    <ProgressionHistoryFilters
      filters={{ eventType: "deload_applied", routineId: null, exerciseId: null, dateFrom: "2026-11-01", dateTo: null }}
      filterOptions={{
        eventTypes: [
          { value: "promotion_applied", label: "Promotion applied" },
          { value: "deload_applied", label: "Deload applied" },
        ],
        routines: [{ value: "r1", label: "Upper / Lower" }],
        exercises: [{ value: "e1", label: "Bench Press" }],
      }}
      filteredEventCount={3}
    />,
    "/history/progression",
  );
  assert.ok(screen.getByRole("button", { name: "Filters, 2 on" }));
  assert.ok(screen.getByRole("button", { name: "Remove filter Deload applied" }));
  assert.ok(screen.getByRole("button", { name: "Remove filter From Nov 1, 2026" }));

  fireEvent.click(screen.getByRole("button", { name: "Filters, 2 on" }));
  const sheet = screen.getByRole("dialog");
  fireEvent.click(within(sheet).getByRole("button", { name: "Bench Press" }));
  assert.match(calls.replace.at(-1) ?? "", /^\/history\/progression\?/);
  assert.match(calls.replace.at(-1) ?? "", /e1/);

  fireEvent.click(within(sheet).getByRole("button", { name: "Clear all" }));
  assert.equal(calls.replace.at(-1), "/history/progression");
  assert.equal(document.querySelector("select") === null, true, "no native select");
});

test("a load error names what failed in the card and says why once, in the in-flow notice", async () => {
  const { calls } = mount(<HistoryLoadErrorState title="Could not load sessions" />);
  await act(async () => {});
  assert.ok(screen.getByRole("heading", { name: "Could not load sessions" }));
  const card = document.querySelector('[data-history-load-error="true"]');
  assert.ok(card);
  assert.equal(card.textContent?.includes("Something went wrong"), false, "the reason is not repeated inline");
  assert.equal(screen.getAllByText("Something went wrong loading history. Try again.").length, 1);
  assert.equal(screen.queryByText(/Check your connection/), null, "an online failure does not blame the connection");
  assert.equal(within(card as HTMLElement).getByRole("link", { name: "Go to Today" }).getAttribute("href"), "/today");

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await act(async () => {});
  assert.equal(calls.refresh, 1);
});

test("the load-error notice only mentions the connection when the browser is offline", async () => {
  assert.equal(resolveHistoryLoadErrorNotice(false), "You look offline. Check your connection and try again.");
  assert.equal(resolveHistoryLoadErrorNotice(true), "Something went wrong loading history. Try again.");
  assert.equal(resolveHistoryLoadErrorNotice(undefined), "Something went wrong loading history. Try again.");

  const onLine = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
  Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
  try {
    mount(<HistoryLoadErrorState title="Could not load sessions" />);
    await act(async () => {});
    assert.equal(screen.getAllByText("You look offline. Check your connection and try again.").length, 1);
  } finally {
    if (onLine) Object.defineProperty(window.navigator, "onLine", onLine);
    else delete (window.navigator as { onLine?: boolean }).onLine;
  }
});

test("a deleted session (stale Open session link) shows a calm card with a way back, not a blank screen", () => {
  render(<HistorySessionMissingState />);
  assert.ok(screen.getByRole("heading", { name: "This session is no longer here" }));
  assert.equal(screen.getByRole("link", { name: "Back to History" }).getAttribute("href"), "/history");
  assert.equal(document.querySelector('[role="alert"]'), null, "no red error text for a missing session");
});
