import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { SignOutButton } from "../../src/components/SignOutButton.tsx";

const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

type Pending = { resolve: (status: number) => void };

// A revoke request the test settles by hand, so the pending state can be observed before the answer arrives.
function stubRevoke() {
  const requests: Array<{ url: string; method: string | undefined }> = [];
  const pending: Pending[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method });
    return new Promise<Response>((resolve) => {
      pending.push({ resolve: (status) => resolve(new Response("{}", { status })) });
    });
  }) as typeof fetch;
  return { requests, pending };
}

function renderSignOut() {
  const { router } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/settings">
      <SignOutButton placement="body" signedInAs="zac@example.com" />
    </AppProviders>,
  );
}

// Signing out is a two-step action: the button opens the confirm sheet, Confirm does the sign-out.
function openConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  return screen.getByRole("dialog");
}

function confirmSignOut() {
  const dialog = openConfirm();
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
}

test("Settings: Sign out asks the server to revoke this device once, and a second tap while pending is ignored", async () => {
  const { requests, pending } = stubRevoke();
  renderSignOut();

  const button = screen.getByRole("button", { name: "Sign out" });
  assert.equal(button.getAttribute("data-sign-out-state"), "ready");
  confirmSignOut();

  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Signing out…" }).hasAttribute("disabled"), true));
  fireEvent.click(screen.getByRole("button", { name: "Signing out…" }));
  assert.deepEqual(requests, [{ url: "/auth/session-sync", method: "DELETE" }]);

  pending[0].resolve(500);
  await screen.findByRole("alert");
});

test("Settings: a failed revoke keeps the person signed in on the screen with an error and a usable button", async () => {
  const { requests, pending } = stubRevoke();
  renderSignOut();

  confirmSignOut();
  await waitFor(() => assert.equal(requests.length, 1));
  pending[0].resolve(503);

  const alert = await screen.findByRole("alert");
  assert.ok(within(alert).getByText("Could not sign out. Try again."));
  const button = screen.getByRole("button", { name: "Sign out" });
  assert.equal(button.hasAttribute("disabled"), false);
  assert.equal(button.getAttribute("data-sign-out-state"), "failed");

  // Retrying sends a fresh request and clears the old error while it is in flight.
  confirmSignOut();
  await waitFor(() => assert.equal(requests.length, 2));
  assert.equal(screen.queryByRole("alert"), null);
});

test("Settings: a network error on revoke is also a failure, never a silent sign-out", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("network down");
  }) as typeof fetch;
  renderSignOut();

  confirmSignOut();

  assert.ok(await screen.findByText("Could not sign out. Try again."));
  assert.equal(screen.getByRole("button", { name: "Sign out" }).hasAttribute("disabled"), false);
});

test("Settings: Sign out opens a confirm sheet that names who is signed in and sends nothing until Confirm", async () => {
  const { requests } = stubRevoke();
  renderSignOut();

  const dialog = openConfirm();
  assert.ok(within(dialog).getByText("Confirm sign out"));
  assert.equal(dialog.querySelector("[data-confirm-object-name]")?.textContent, "zac@example.com");
  assert.ok(within(dialog).getByText(/this device only/i));
  assert.equal(requests.length, 0);
});

test("Settings: Cancel closes the confirm sheet and keeps the person signed in", async () => {
  const { requests } = stubRevoke();
  renderSignOut();

  const dialog = openConfirm();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(requests.length, 0);
  assert.equal(screen.getByRole("button", { name: "Sign out" }).getAttribute("data-sign-out-state"), "ready");
});
