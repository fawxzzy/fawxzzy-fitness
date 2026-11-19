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
      <SignOutButton placement="body" />
    </AppProviders>,
  );
}

test("Settings: Sign out asks the server to revoke this device once, and a second tap while pending is ignored", async () => {
  const { requests, pending } = stubRevoke();
  renderSignOut();

  const button = screen.getByRole("button", { name: "Sign out" });
  assert.equal(button.getAttribute("data-sign-out-state"), "ready");
  fireEvent.click(button);

  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Signing out…" }).hasAttribute("disabled"), true));
  fireEvent.click(screen.getByRole("button", { name: "Signing out…" }));
  assert.deepEqual(requests, [{ url: "/auth/session-sync", method: "DELETE" }]);

  pending[0].resolve(500);
  await screen.findByRole("alert");
});

test("Settings: a failed revoke keeps the person signed in on the screen with an error and a usable button", async () => {
  const { requests, pending } = stubRevoke();
  renderSignOut();

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => assert.equal(requests.length, 1));
  pending[0].resolve(503);

  const alert = await screen.findByRole("alert");
  assert.ok(within(alert).getByText("Could not sign out. Try again."));
  const button = screen.getByRole("button", { name: "Sign out" });
  assert.equal(button.hasAttribute("disabled"), false);
  assert.equal(button.getAttribute("data-sign-out-state"), "failed");

  // Retrying sends a fresh request and clears the old error while it is in flight.
  fireEvent.click(button);
  await waitFor(() => assert.equal(requests.length, 2));
  assert.equal(screen.queryByRole("alert"), null);
});

test("Settings: a network error on revoke is also a failure, never a silent sign-out", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("network down");
  }) as typeof fetch;
  renderSignOut();

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  assert.ok(await screen.findByText("Could not sign out. Try again."));
  assert.equal(screen.getByRole("button", { name: "Sign out" }).hasAttribute("disabled"), false);
});
