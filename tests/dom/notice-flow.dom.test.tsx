import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { DOCK_NOTICE_DURATION_MS, useNoticeFlowSlotRef, useToast } from "../../src/components/ui/ToastProvider.tsx";
import { MobileScreenShell } from "../../src/components/shared/mobile-shell/MobileScreenShell.tsx";

// Zac 2026-11-23: a failed-discard notice floated over the first card and hid its title. Error notices now render in a
// slot the screen shell keeps between its header and its scroll area, so content moves down instead of being covered.
// Other tones keep floating (a 2 s "Saved" must not jump the layout). With no slot, errors float as before.

afterEach(() => {
  cleanup();
});

function Harness({ withSlot, tones }: { withSlot: boolean; tones?: "all" }) {
  const slotRef = useNoticeFlowSlotRef();
  const toast = useToast();
  return (
    <div>
      <header>Header</header>
      {withSlot ? <div ref={slotRef} data-testid="slot" data-app-notice-flow-tones={tones} /> : null}
      <main>First card</main>
      <button onClick={() => toast.error("Could not discard the workout. Try again.", { persistent: true })}>fail</button>
      <button onClick={() => toast.success("Saved", { persistent: true })}>ok</button>
    </div>
  );
}

function mount(withSlot: boolean, tones?: "all") {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router}>
      <Harness withSlot={withSlot} tones={tones} />
    </AppProviders>,
  );
}

function floatingStack() {
  const stack = document.querySelector('[data-app-notice-stack="true"]');
  assert.ok(stack, "the floating stack is always mounted");
  return stack;
}

test("with a shell slot, an error notice renders in flow inside the slot, not in the floating stack", async () => {
  mount(true);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
  });

  const alert = await screen.findByRole("alert");
  const slot = screen.getByTestId("slot");
  assert.ok(slot.contains(alert), "the error is inside the in-flow slot");
  assert.equal(floatingStack().contains(alert), false);
  assert.ok(slot.querySelector('[data-app-notice-flow-stack="true"]'));
  assert.equal(floatingStack().textContent, "");
});

test("with a shell slot, non-error notices still float", async () => {
  mount(true);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "ok" }));
  });

  const status = await screen.findByText("Saved");
  assert.ok(floatingStack().contains(status));
  assert.equal(screen.getByTestId("slot").textContent, "");
});

test("a slot that opts into every tone (the workout screen) renders success notices in flow too", async () => {
  mount(true, "all");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "ok" }));
  });

  const status = await screen.findByText("Saved");
  assert.ok(screen.getByTestId("slot").contains(status), "the success notice is in flow, never over a card title");
  assert.equal(floatingStack().textContent, "");
});

test("without a slot (screens outside the shell), errors fall back to the floating stack", async () => {
  mount(false);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
  });

  const alert = await screen.findByRole("alert");
  assert.ok(floatingStack().contains(alert));
  assert.equal(document.querySelector('[data-app-notice-flow-stack="true"]'), null);
});

// Zac 2026-11-24: on the workout screen a notice must not move the cards. The shell opts into an overlay slot pinned
// just above the bottom dock (noticePlacement="above-dock"): every tone, one at a time, about 4 s, errors stay until
// dismissed or the next action.

function DockScreen() {
  const toast = useToast();
  return (
    <ul data-testid="cards">
      <li data-testid="card-1"><h3>Bench Press</h3></li>
      <li data-testid="card-2"><h3>Squat</h3></li>
      <li>
        <button onClick={() => toast.success("Set logged.")}>log</button>
        <button onClick={() => toast.error("Could not remove exercise.")}>fail</button>
        <button onClick={() => toast.info("Applied to current set.")}>apply</button>
        <button>other</button>
      </li>
    </ul>
  );
}

function mountDockScreen() {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router} pathname="/session/s1">
      <MobileScreenShell noticePlacement="above-dock" bottomDock={<div data-testid="dock">Dock</div>}>
        <DockScreen />
      </MobileScreenShell>
    </AppProviders>,
  );
}

function dockSlot() {
  const slot = document.querySelector('[data-app-notice-placement="above-dock"]');
  assert.ok(slot instanceof window.HTMLElement, "the above-dock slot is mounted");
  return slot as HTMLElement;
}

// Records the delay of every window.setTimeout call while the callback runs, so the auto-dismiss time is checked
// without waiting for it.
async function recordTimeouts(run: () => Promise<void>) {
  const delays: number[] = [];
  const original = window.setTimeout;
  window.setTimeout = ((handler: TimerHandler, timeout?: number, ...rest: unknown[]) => {
    delays.push(timeout ?? 0);
    return original(handler, timeout, ...rest);
  }) as typeof window.setTimeout;
  try {
    await run();
  } finally {
    window.setTimeout = original;
  }
  return delays;
}

async function waitForExit() {
  await new Promise((resolve) => setTimeout(resolve, 350));
}

test("above-dock: the slot is out of flow, after the dock, and a notice adds nothing to the card list", async () => {
  mountDockScreen();
  const slot = dockSlot();
  const cards = screen.getByTestId("cards");
  assert.equal(slot.contains(cards), false);
  assert.ok(slot.classList.contains("absolute"), "absolutely positioned: it takes no space in the column");
  assert.ok(slot.classList.contains("pointer-events-none"), "taps pass through the empty slot");
  assert.match(slot.style.bottom, /--app-mobile-bottom-dock-height/, "pinned just above the dock");
  assert.equal(document.querySelectorAll('[data-app-notice-flow-slot="true"]').length, 1, "no in-flow slot under the header");
  const dock = screen.getByTestId("dock").closest("[data-app-bottom-dock]");
  assert.ok(dock, "the dock renders");
  assert.ok(dock.compareDocumentPosition(slot) & window.Node.DOCUMENT_POSITION_FOLLOWING, "the slot comes after the dock");

  const before = cards.outerHTML;
  const tops = () => [screen.getByTestId("card-1"), screen.getByTestId("card-2")].map((node) => node.offsetTop);
  const topsBefore = tops();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "log" }));
  });
  const status = await screen.findByRole("status");
  assert.ok(slot.contains(status), "the notice renders in the overlay slot");
  assert.equal(cards.outerHTML, before, "mounting a notice changes nothing in the card list");
  assert.deepEqual(tops(), topsBefore, "no card offsetTop changes (jsdom has no layout: the real-browser probe measures it)");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    await waitForExit();
  });
  assert.equal(slot.textContent, "");
  assert.equal(cards.outerHTML, before, "unmounting it changes nothing either");
  assert.deepEqual(tops(), topsBefore);
});

test("above-dock: every tone, one notice at a time, and success notices leave after about 4 s", async () => {
  mountDockScreen();
  const slot = dockSlot();
  const delays = await recordTimeouts(async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "log" }));
    });
  });
  assert.equal(DOCK_NOTICE_DURATION_MS, 4000);
  assert.ok(delays.includes(DOCK_NOTICE_DURATION_MS), "auto-dismiss is scheduled at the dock duration");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "apply" }));
  });
  assert.equal(slot.querySelectorAll("[data-app-notice]").length, 1, "one at a time");
  assert.match(slot.textContent ?? "", /Applied to current set\./);
  assert.equal(floatingStack().textContent, "", "nothing floats over the header");
});

test("above-dock: an error stays (no timer) until the next action, uses role=alert, and a tap on it dismisses", async () => {
  mountDockScreen();
  const slot = dockSlot();
  const delays = await recordTimeouts(async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "fail" }));
    });
  });
  assert.equal(delays.filter((delay) => delay >= 1000).length, 0, "no auto-dismiss for an error");
  const alert = await screen.findByRole("alert");
  assert.ok(slot.contains(alert));

  // The next action: a tap on another control clears it.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "other" }));
    await waitForExit();
  });
  assert.equal(screen.queryByRole("alert"), null);

  // A tap on the notice body dismisses it too.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
  });
  const again = await screen.findByRole("alert");
  await act(async () => {
    fireEvent.click(again.querySelector("p") as HTMLElement);
    await waitForExit();
  });
  assert.equal(screen.queryByRole("alert"), null);

  // And a new notice replaces it.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
  });
  await screen.findByRole("alert");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "log" }));
  });
  assert.equal(screen.queryByRole("alert"), null);
  assert.ok(slot.contains(screen.getByRole("status")));
});
