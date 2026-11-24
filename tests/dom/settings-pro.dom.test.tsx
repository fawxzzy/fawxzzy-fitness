import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { ProAccessSettings } from "../../src/components/settings/ProAccessSettings.tsx";
import type { ProAccessSnapshot } from "../../src/lib/billing/pro-access-snapshot.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

const FREE: ProAccessSnapshot = {
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

const PRO: ProAccessSnapshot = {
  ...FREE,
  accessState: "pro",
  accessLabel: "Pro",
  accessSource: "subscription",
  customerPortalAvailable: true,
  grantedAt: "2026-10-02T14:00:00.000Z",
  renewsAt: "2026-12-02T14:00:00.000Z",
};

function renderPro(snapshot: ProAccessSnapshot, billingNotice: "success" | "cancel" | null = null) {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/settings">
      <ProAccessSettings snapshot={snapshot} billingNotice={billingNotice} />
    </AppProviders>,
  );
}

function stubBilling(reply: "fail" | "network") {
  const requests: Array<{ url: string; method: string | undefined }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method });
    if (reply === "network") throw new TypeError("network down");
    return new Response(JSON.stringify({ ok: false, error: "Checkout is unavailable right now." }), { status: 502 });
  }) as typeof fetch;
  return requests;
}

function heroCard() {
  return screen.getByRole("heading", { level: 3, name: /Monthly Pro available|Monthly subscription active/ }).closest("[data-card-surface]") as HTMLElement;
}

test("Pro: Upgrade to Pro is the primary button inside the plan card, not in the dock", () => {
  renderPro(FREE);
  const upgrade = within(heroCard()).getByRole("button", { name: "Upgrade to Pro" }) as HTMLButtonElement;
  assert.equal(upgrade.disabled, false);
  assert.equal(upgrade.getAttribute("data-action-chrome-intent"), "positive", "primary variant resolves to the positive action intent");
});

test("Pro: a subscriber gets Manage Billing in the plan card", () => {
  renderPro(PRO);
  assert.ok(within(heroCard()).getByRole("button", { name: "Manage Billing" }));
});

test("Pro: Upgrade asks the checkout endpoint once and a failure goes to the notice, not red text in a card", async () => {
  const requests = stubBilling("fail");
  const { container } = renderPro(FREE);

  fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));
  await screen.findByText("Checkout is unavailable right now.");
  assert.deepEqual(requests, [{ url: "/api/billing/checkout", method: "POST" }]);
  assert.equal(container.querySelectorAll("[data-card-surface] [role='alert']").length, 0);
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Upgrade to Pro" }) as HTMLButtonElement).disabled, false));
});

test("Pro: a network error is reported and the button comes back", async () => {
  stubBilling("network");
  renderPro(FREE);
  fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));
  await screen.findByText(/Unable to start the Monthly Pro checkout|network down/);
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Upgrade to Pro" }) as HTMLButtonElement).disabled, false));
});

test("Pro: without checkout set up the button is disabled and says why", () => {
  renderPro({ ...FREE, checkoutConfigured: false });
  const button = within(screen.getByRole("heading", { level: 3, name: "Checkout not ready" }).closest("[data-card-surface]") as HTMLElement)
    .getByRole("button", { name: "Upgrade to Pro" }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
});

test("Pro: billing results from the checkout redirect show as notices", () => {
  renderPro(FREE, "cancel");
  assert.ok(screen.getByText(/Checkout was cancelled/));
});
