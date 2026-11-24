import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { DiscordAccessSettings } from "../../src/components/settings/DiscordAccessSettings.tsx";
import { FITNESS_DISCORD_INVITE_URL } from "../../src/lib/legal-documents.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  Object.defineProperty(window.navigator, "clipboard", { value: undefined, configurable: true });
});

function renderDiscord() {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/settings">
      <DiscordAccessSettings />
    </AppProviders>,
  );
}

function stubToken(reply: "ok" | "fail" | "network") {
  const requests: Array<{ url: string; method: string | undefined }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method });
    if (reply === "network") throw new TypeError("network down");
    if (reply === "fail") return new Response(JSON.stringify({ ok: false, error: "Too many keys. Try again later." }), { status: 429 });
    return new Response(JSON.stringify({ ok: true, token: "ABCD-1234", expiresAt: "2026-12-01T12:00:00.000Z" }), { status: 200 });
  }) as typeof fetch;
  return requests;
}

test("Discord: Join is a 44px link to the invite that opens a new tab", () => {
  renderDiscord();
  const join = screen.getByRole("link", { name: /Join Fawxzzy Fitness Discord/ });
  assert.equal(join.getAttribute("href"), FITNESS_DISCORD_INVITE_URL);
  assert.equal(join.getAttribute("target"), "_blank");
  assert.match(join.getAttribute("rel") ?? "", /noopener/);
  assert.match(join.className, /min-h-11/);
});

test("Discord: Generate and Copy live in the key card, Copy waits for a key", () => {
  renderDiscord();
  const keyCard = screen.getByRole("heading", { name: "One-time key", level: 3 }).closest("[data-card-surface]") as HTMLElement | null;
  assert.ok(keyCard);
  assert.ok(within(keyCard).getByRole("button", { name: "Generate" }));
  assert.equal((within(keyCard).getByRole("button", { name: "Copy" }) as HTMLButtonElement).disabled, true);
});

test("Discord: Generate asks for a key once, shows it, and Copy puts it on the clipboard", async () => {
  const requests = stubToken("ok");
  const written: string[] = [];
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText: async (text: string) => void written.push(text) },
    configurable: true,
  });
  renderDiscord();

  fireEvent.click(screen.getByRole("button", { name: "Generate" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Discord verification token") as HTMLInputElement).value, "ABCD-1234"));
  assert.deepEqual(requests, [{ url: "/api/discord/verification-token", method: "POST" }]);

  const copy = screen.getByRole("button", { name: "Copy" }) as HTMLButtonElement;
  assert.equal(copy.disabled, false);
  fireEvent.click(copy);
  await waitFor(() => assert.deepEqual(written, ["ABCD-1234"]));
  await screen.findByRole("button", { name: "Copied" });
});

test("Discord: a failed key request goes to the notice, leaves no red text in the card, and Generate stays usable", async () => {
  stubToken("fail");
  const { container } = renderDiscord();

  fireEvent.click(screen.getByRole("button", { name: "Generate" }));
  await screen.findByText("Too many keys. Try again later.");
  assert.equal(container.querySelectorAll("[data-card-surface] [role='alert']").length, 0);
  assert.equal(container.querySelectorAll("[data-card-surface] [class*='danger-text']").length, 0);
  assert.equal((screen.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled, false);
  assert.equal((screen.getByLabelText("Discord verification token") as HTMLInputElement).value, "");
});

test("Discord: a network error is reported the same way", async () => {
  stubToken("network");
  renderDiscord();
  fireEvent.click(screen.getByRole("button", { name: "Generate" }));
  await screen.findByText("Unable to generate a Discord token right now.");
});
