import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { useNoticeFlowSlotRef, useToast } from "../../src/components/ui/ToastProvider.tsx";

// Zac 2026-11-23: a failed-discard notice floated over the first card and hid its title. Error notices now render in a
// slot the screen shell keeps between its header and its scroll area, so content moves down instead of being covered.
// Other tones keep floating (a 2 s "Saved" must not jump the layout). With no slot, errors float as before.

afterEach(() => {
  cleanup();
});

function Harness({ withSlot }: { withSlot: boolean }) {
  const slotRef = useNoticeFlowSlotRef();
  const toast = useToast();
  return (
    <div>
      <header>Header</header>
      {withSlot ? <div ref={slotRef} data-testid="slot" /> : null}
      <main>First card</main>
      <button onClick={() => toast.error("Could not discard the workout. Try again.", { persistent: true })}>fail</button>
      <button onClick={() => toast.success("Saved", { persistent: true })}>ok</button>
    </div>
  );
}

function mount(withSlot: boolean) {
  const { router } = createRouterSpy();
  return render(
    <AppProviders router={router}>
      <Harness withSlot={withSlot} />
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

test("without a slot (screens outside the shell), errors fall back to the floating stack", async () => {
  mount(false);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
  });

  const alert = await screen.findByRole("alert");
  assert.ok(floatingStack().contains(alert));
  assert.equal(document.querySelector('[data-app-notice-flow-stack="true"]'), null);
});
