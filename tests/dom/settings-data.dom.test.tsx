import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { DataSettingsSection } from "../../src/components/settings/DataSettingsSection.tsx";
import { EXPORT_PREFERENCES_STORAGE_KEY } from "../../src/lib/export-preferences.ts";

const realFetch = globalThis.fetch;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

function previewBody(body: { fileType?: string; scope?: string }) {
  const scope = body.scope ?? "all";
  return {
    fileType: body.fileType ?? "csv",
    scope,
    scopeLabel: scope === "history" ? "History" : scope === "routines" ? "Routines" : "All",
    scopeSummaryLabel: "Export.",
    dateRange: { dateFrom: null, dateTo: null, label: "All dates" },
    tables: [{ key: "sessions", name: "Sessions", rowCount: 3, empty: false }],
    includesProgressionEvents: true,
    progressionSummary: {
      eventCount: 0, promotionCount: 0, deloadCount: 0, manualChangeCount: 0, revertCount: 0, lockInCount: 0,
      linkedSessionCount: 0, distinctExerciseCount: 0, firstChangeAt: null, latestChangeAt: null, lastPromotionAt: null,
    },
    counts: {
      sessions: 3, completedSessions: 3, sessionExercises: 9, sets: 27, routines: 1, routineDays: 3, routineExercises: 9,
      exercises: 12, progressionEvents: 0,
    },
  };
}

type Reply = "ok" | "fail" | "network";

function stubPreview(replies: Reply[] = []) {
  const bodies: Array<{ fileType?: string; scope?: string }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "/api/account/export/preview");
    const body = JSON.parse(String(init?.body ?? "{}"));
    bodies.push(body);
    const reply = replies.shift() ?? "ok";
    if (reply === "network") throw new TypeError("network down");
    if (reply === "fail") return new Response(JSON.stringify({ ok: false, error: "Preview is unavailable." }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, preview: previewBody(body) }), { status: 200 });
  }) as typeof fetch;
  return bodies;
}

function renderData(props: Partial<Parameters<typeof DataSettingsSection>[0]> = {}) {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/settings">
      <DataSettingsSection
        canAccessQaLlelUi={false}
        userKind="human"
        showQaLlelData={false}
        initialExportDateFrom="2026-05-01"
        initialExportDateTo="2026-05-09"
        {...props}
      />
    </AppProviders>,
  );
}

test("Data: the export type and scope the person picks persist and come back after a reload", async () => {
  const bodies = stubPreview();
  const first = renderData();
  await screen.findAllByText("Sessions");

  fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
  fireEvent.click(screen.getByRole("radio", { name: "History" }));
  await waitFor(() => assert.deepEqual(JSON.parse(window.localStorage.getItem(EXPORT_PREFERENCES_STORAGE_KEY) ?? "{}"), { fileType: "json", scope: "history" }));
  first.unmount();

  bodies.length = 0;
  renderData();
  await waitFor(() => assert.equal((screen.getByRole("radio", { name: "JSON" }) as HTMLInputElement).checked, true));
  assert.equal((screen.getByRole("radio", { name: "History" }) as HTMLInputElement).checked, true);
  await waitFor(() => assert.ok(bodies.some((body) => body.fileType === "json" && body.scope === "history")));
});

test("Data: a failed snapshot load shows a neutral state with Retry, and the error goes to the notice, never red text", async () => {
  const bodies = stubPreview(["fail", "ok"]);
  const { container } = renderData();

  await screen.findAllByText("Preview is unavailable.");
  assert.equal(container.querySelectorAll("[data-card-surface] [class*='danger-text']").length, 0, "no inline red text in the cards");
  assert.equal(container.querySelectorAll("[data-card-surface] [role='alert']").length, 0, "the error is not an inline alert in a card");
  assert.ok(container.querySelector("[data-settings-load-state='error']"), "each card shows a neutral error state");

  const retry = screen.getAllByRole("button", { name: "Retry" })[0];
  fireEvent.click(retry);
  await screen.findAllByText("Sessions");
  assert.equal(bodies.length, 2);
});

test("Data: a network error reads as a connection problem and offers Retry", async () => {
  stubPreview(["network"]);
  renderData();
  await screen.findAllByText(/Could not reach the server/);
  assert.ok(screen.getAllByRole("button", { name: "Retry" }).length >= 1);
});

test("Data: QA data is an explicit switch that saves through the server action and shows the result", async () => {
  stubPreview();
  const saved: string[] = [];
  renderData({
    canAccessQaLlelUi: true,
    saveQaVisibility: async (formData) => {
      saved.push(String(formData.get("showQaLlelData")));
      return { ok: true };
    },
  });

  const toggle = await screen.findByRole("button", { name: "Show QA data" });
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  fireEvent.click(toggle);

  await waitFor(() => assert.deepEqual(saved, ["1"]));
  await screen.findByText("QA data shown.");
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Show QA data" }) as HTMLButtonElement).disabled, false));
  assert.equal(screen.getByRole("button", { name: "Show QA data" }).getAttribute("aria-pressed"), "true");

  fireEvent.click(screen.getByRole("button", { name: "Show QA data" }));
  await waitFor(() => assert.deepEqual(saved, ["1", "0"]));
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Show QA data" }).getAttribute("aria-pressed"), "false"));
});

test("Data: a failed QA save rolls the switch back and tells the person in the notice", async () => {
  stubPreview();
  renderData({
    canAccessQaLlelUi: true,
    saveQaVisibility: async () => ({ ok: false, error: "Could not save that setting." }),
  });

  fireEvent.click(await screen.findByRole("button", { name: "Show QA data" }));
  await screen.findByText("Could not save that setting.");
  assert.equal(screen.getByRole("button", { name: "Show QA data" }).getAttribute("aria-pressed"), "false");
});

test("Data: there is no QA switch for people without access", async () => {
  stubPreview();
  renderData({ canAccessQaLlelUi: false });
  await screen.findAllByText("Sessions");
  assert.equal(screen.queryByRole("button", { name: "Show QA data" }), null);
});

test("Data: Export is a button inside the Export card, not in the dock", async () => {
  stubPreview();
  renderData();
  await screen.findAllByText("Sessions");

  const exportCard = screen.getByRole("heading", { name: "Export", level: 3 }).closest("[data-card-surface]") as HTMLElement | null;
  assert.ok(exportCard, "the Export card surface exists");
  assert.ok(within(exportCard).getByRole("button", { name: "Export" }));
});
