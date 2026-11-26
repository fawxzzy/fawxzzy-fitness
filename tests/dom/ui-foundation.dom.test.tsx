import "./dom-env.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach } from "node:test";
import { useState } from "react";
import { useToast } from "../../src/components/ui/ToastProvider.tsx";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { AppButton } from "../../src/components/ui/AppButton.tsx";
import { getAppButtonClassName, normalizeAppButtonVariant } from "../../src/components/ui/appButtonClasses.ts";
import { Chip } from "../../src/components/ui/Chip.tsx";
import { ConfirmDestructiveModal } from "../../src/components/ui/ConfirmDestructiveModal.tsx";
import { FormField } from "../../src/components/ui/FormField.tsx";
import { Menu, nextEnabledMenuIndex, resolveMenuPlacement } from "../../src/components/ui/Menu.tsx";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl.tsx";
import { Sheet } from "../../src/components/ui/Sheet.tsx";
import { BottomSheet } from "../../src/components/ui/BottomSheet.tsx";

// DOM tests for the design foundation primitives (docs/ui/FOUNDATION.md).
// OOM trap: never assert.equal(element, null). A failure makes node inspect the jsdom element and blows the heap;
// compare booleans (`x === null`) instead, and use queryAll* inside waitFor.

afterEach(() => cleanup());

function withProviders(ui: React.ReactNode) {
  const { router } = createRouterSpy();
  return render(<AppProviders router={router}>{ui}</AppProviders>);
}

test("AppButton: canonical variants and legacy aliases, every size at least 44px, loading is busy and disabled", () => {
  assert.equal(normalizeAppButtonVariant("destructive"), "danger");
  assert.equal(normalizeAppButtonVariant("tertiary"), "quiet");
  assert.equal(normalizeAppButtonVariant("ghost"), "quiet");
  assert.match(getAppButtonClassName({ variant: "promote" }), /promote-shine/);
  // lg 56px, md 48px, sm 44px (2.75rem = --hit-min): no size falls under the 44px touch target.
  const minHeights = { lg: "3.5rem", md: "3rem", sm: "2.75rem" } as const;
  for (const size of ["lg", "md", "sm"] as const) {
    assert.ok(getAppButtonClassName({ variant: "primary", size }).includes(`min-h-[${minHeights[size]}]`), size);
  }

  render(
    <AppButton variant="danger" loading>
      Delete
    </AppButton>,
  );
  const button = screen.getByRole("button");
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.ok(button.hasAttribute("disabled"));
  assert.ok(screen.getByText("Delete..."));
});

test("Menu: opens on tap, arrow keys skip disabled rows, Escape closes and returns focus", async () => {
  const picked: string[] = [];
  render(
    <Menu
      label="Routine actions"
      items={[
        { id: "rename", label: "Rename", onSelect: () => picked.push("rename") },
        { id: "archive", label: "Archive", disabled: true, onSelect: () => picked.push("archive") },
        { id: "delete", label: "Delete", tone: "danger", onSelect: () => picked.push("delete") },
      ]}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Routine actions" });
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  fireEvent.click(trigger);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");

  const rows = screen.getAllByRole("menuitem");
  assert.equal(rows.length, 3);
  await waitFor(() => assert.ok(document.activeElement === rows[0], "focus enters the first enabled row"));
  fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
  assert.ok(document.activeElement === rows[2], "ArrowDown skips the disabled row");

  fireEvent.keyDown(document, { key: "Escape" });
  assert.ok(screen.queryByRole("menu") === null);
  assert.ok(document.activeElement === trigger, "focus returns to the trigger");
  assert.deepEqual(picked, []);
});

test("Menu: an outside tap closes without selecting or activating what is under it; a row tap selects and closes", () => {
  const picked: string[] = [];
  let outsideClicks = 0;
  render(
    <div>
      <button type="button" onClick={() => { outsideClicks += 1; }}>Outside</button>
      <Menu label="More" items={[{ id: "rename", label: "Rename", onSelect: () => picked.push("rename") }]} />
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: "More" }));
  // A real tap is pointerdown then click on the same target: the menu closes and the click is swallowed.
  const outside = screen.getByRole("button", { name: "Outside" });
  fireEvent.pointerDown(outside);
  fireEvent.click(outside);
  assert.ok(screen.queryByRole("menu") === null);
  assert.equal(outsideClicks, 0, "the tap that closes the menu does not reach the control underneath");

  fireEvent.click(screen.getByRole("button", { name: "More" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  assert.ok(screen.queryByRole("menu") === null);
  assert.deepEqual(picked, ["rename"]);
});

test("nextEnabledMenuIndex wraps and skips disabled rows", () => {
  const enabled = [true, false, true, true];
  assert.equal(nextEnabledMenuIndex(enabled, 0, "ArrowDown"), 2);
  assert.equal(nextEnabledMenuIndex(enabled, 3, "ArrowDown"), 0);
  assert.equal(nextEnabledMenuIndex(enabled, 0, "ArrowUp"), 3);
  assert.equal(nextEnabledMenuIndex(enabled, 2, "Home"), 0);
  assert.equal(nextEnabledMenuIndex(enabled, 0, "End"), 3);
  assert.equal(nextEnabledMenuIndex([false, false], -1, "ArrowDown"), -1);
});

test("resolveMenuPlacement: opens below and right-aligned when it fits, flips above near the bottom, and clamps inside the viewport", () => {
  const viewport = { width: 390, height: 844 };
  const panel = { width: 128, height: 58 };
  const roomy = resolveMenuPlacement({ trigger: { top: 100, bottom: 144, left: 291, right: 335 }, viewport, panel });
  assert.deepEqual(roomy, { top: 150, right: 55, placement: "below" });

  const bottom = resolveMenuPlacement({ trigger: { top: 780, bottom: 824, left: 291, right: 335 }, viewport, panel });
  assert.equal(bottom.placement, "above");
  assert.equal(bottom.top, 780 - 6 - 58);

  // No room above or below (tiny viewport): the panel is clamped to the margin, never off screen.
  const cramped = resolveMenuPlacement({ trigger: { top: 20, bottom: 64, left: 291, right: 335 }, viewport: { width: 390, height: 100 }, panel });
  assert.ok(cramped.top >= 8 && cramped.top + panel.height <= 100 - 8, "clamped to the viewport");

  // A trigger near the left edge: the panel's left edge never goes under the 8px margin.
  const leftEdge = resolveMenuPlacement({ trigger: { top: 100, bottom: 144, left: 8, right: 52 }, viewport: { width: 320, height: 568 }, panel: { width: 176, height: 58 } });
  assert.ok(leftEdge.right <= 320 - 8 - 176, "right offset keeps the panel's left edge inside the viewport");
  assert.ok(leftEdge.right >= 8);
});

test("Menu: the card menu is compact so it covers as little of the card as possible", () => {
  const browse = readFileSync(new URL("../../src/components/routines/RoutineBrowseCard.tsx", import.meta.url), "utf8");
  assert.match(browse, /<Menu[^>]*minWidth=\{([5-9][0-9]|1[0-2][0-9])\}/, "routine card Menu passes a compact minWidth (<=129)");
  const menu = readFileSync(new URL("../../src/components/ui/Menu.tsx", import.meta.url), "utf8");
  assert.match(menu, /resolveMenuPlacement/);
  assert.match(menu, /data-menu-placement/);
});

function SheetHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      title="Choose a day"
      onClose={() => {
        onClose();
        setOpen(false);
      }}
    >
      <p>Push Day</p>
    </Sheet>
  );
}

test("Sheet: a dialog with a 44px Close, no default eyebrow; Close and Escape close it and the role drops at once", async () => {
  let closes = 0;
  render(<SheetHarness onClose={() => { closes += 1; }} />);
  const dialog = screen.getByRole("dialog", { name: "Choose a day" });
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.ok(screen.queryAllByText(/^sheet$/i).length === 0, "no generic Sheet eyebrow");
  const close = screen.getByRole("button", { name: "Close" });
  assert.match(close.className, /\bh-11\b/);
  assert.match(close.className, /\bw-11\b/);

  fireEvent.click(close);
  assert.equal(closes, 1);
  assert.ok(screen.queryByRole("dialog") === null, "the closing sheet is no longer a dialog");
  await waitFor(() => assert.ok(document.querySelector("[data-sheet-root]") === null));
});

test("Sheet: Escape closes only the top-most of two stacked sheets", () => {
  const closed: string[] = [];
  render(
    <>
      <Sheet open title="Lower" onClose={() => closed.push("lower")} />
      <Sheet open title="Upper" onClose={() => closed.push("upper")} />
    </>,
  );
  fireEvent.keyDown(document, { key: "Escape" });
  assert.deepEqual(closed, ["upper"]);
});

test("BottomSheet keeps working as a wrapper and shows an eyebrow only when given one", () => {
  render(
    <BottomSheet open title="Swap exercise" eyebrow="Workout" onClose={() => {}}>
      <p>Body</p>
    </BottomSheet>,
  );
  assert.ok(screen.getByRole("dialog", { name: "Swap exercise" }));
  assert.ok(screen.getByText("Workout"));
});

test("Confirm names the object, starts focus on Cancel, and confirms or cancels", async () => {
  const events: string[] = [];
  render(
    <ConfirmDestructiveModal
      open
      title="Delete routine"
      objectName="Push Pull Legs"
      consequenceText="Its days are removed."
      confirmLabel="Delete"
      onCancel={() => events.push("cancel")}
      onConfirm={() => events.push("confirm")}
    />,
  );
  assert.ok(screen.getByRole("dialog", { name: "Confirm delete" }));
  const objectName = document.querySelector("[data-confirm-object-name]");
  assert.ok(objectName && objectName.textContent === "Push Pull Legs");
  const cancel = screen.getByRole("button", { name: "Cancel" });
  await waitFor(() => assert.ok(document.activeElement === cancel));
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  fireEvent.click(cancel);
  assert.deepEqual(events, ["confirm", "cancel"]);
});

test("Chip: the remove control is named after the chip and calls onRemove", () => {
  let removed = 0;
  render(
    <Chip variant="label" onRemove={() => { removed += 1; }}>
      Chest
    </Chip>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Remove Chest/i }));
  assert.equal(removed, 1);
});

function SegmentHarness({ count }: { count: number }) {
  const labels = ["One", "Two", "Three", "Four", "Five"].slice(0, count);
  const [value, setValue] = useState("one");
  return (
    <SegmentedControl
      ariaLabel="Options"
      value={value}
      onChange={setValue}
      options={labels.map((label) => ({ label, value: label.toLowerCase() }))}
    />
  );
}

test("SegmentedControl: 2 to 5 options, the selected one is marked and visibly strong", () => {
  for (const count of [2, 3, 4, 5]) {
    const { unmount } = render(<SegmentHarness count={count} />);
    const tabs = screen.getAllByRole("tab");
    assert.equal(tabs.length, count);
    assert.equal(tabs[0].getAttribute("aria-selected"), "true");
    assert.match(tabs[0].className, /segmented-selected-strong/);
    fireEvent.click(tabs[count - 1]);
    const after = screen.getAllByRole("tab");
    assert.equal(after[count - 1].getAttribute("aria-selected"), "true");
    assert.equal(after[0].getAttribute("aria-selected"), "false");
    assert.match(after[count - 1].className, /segmented-selected-strong/);
    assert.doesNotMatch(after[0].className, /segmented-selected-strong/);
    unmount();
  }
});

function FieldHarness() {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <FormField label="Routine name" invalid={Boolean(error)} error={error}>
        {(control) => <input {...control} defaultValue="Push" />}
      </FormField>
      <button type="button" onClick={() => setError("Routine name already exists.")}>Fail</button>
      <button type="button" onClick={() => setError(null)}>Fix</button>
    </>
  );
}

test("FormField: an error goes to the in-flow notice (no red text), and clearing the error dismisses it", async () => {
  withProviders(<FieldHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Fail" }));

  await waitFor(() => assert.ok(document.querySelector('[data-app-notice="error"]') !== null, "the notice shows"));
  const notice = document.querySelector('[data-app-notice="error"]');
  assert.ok(notice?.textContent?.includes("Routine name already exists."));
  const input = screen.getByLabelText(/Routine name/);
  assert.equal(input.getAttribute("aria-invalid"), "true");
  const description = document.querySelector("[data-form-field-error]");
  assert.ok(description && description.className.includes("sr-only"), "the field keeps only an sr-only description");
  assert.ok(document.querySelector('[class*="text-[rgb(var(--danger-rgb))]"]') === null, "no danger-coloured text");

  fireEvent.click(screen.getByRole("button", { name: "Fix" }));
  await waitFor(() => assert.ok(document.querySelector('[data-app-notice="error"]') === null, "the notice is dismissed"));
});

function SheetFieldHarness() {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Sheet open title="New routine" onClose={() => {}}>
        <FormField label="New routine name" invalid={Boolean(error)} error={error}>
          {(control) => <input {...control} defaultValue="Push Day" />}
        </FormField>
        <button type="button" onClick={() => setError("A routine with this name already exists.")}>Save</button>
      </Sheet>
    </>
  );
}

test("Sheet: a notice raised from inside an open sheet renders inside the sheet, not under its layer", async () => {
  withProviders(<SheetFieldHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => assert.ok(document.querySelector('[data-app-notice="error"]') !== null, "the notice shows"));
  const notice = document.querySelector('[data-app-notice="error"]');
  assert.ok(notice?.textContent?.includes("A routine with this name already exists."));
  assert.ok(notice?.closest("[data-sheet]") !== null, "the notice is inside the sheet panel");
  assert.ok(notice?.closest("[data-sheet-notice-slot]") !== null, "in the sheet's notice slot under the title");
});

function ToastAfterCloseHarness() {
  const [open, setOpen] = useState(true);
  const toast = useToast();
  return (
    <>
      <Sheet open={open} title="Choose a day" onClose={() => setOpen(false)}>
        <p>Push Day</p>
      </Sheet>
      <button type="button" onClick={() => toast.success("Saved.")}>Notify</button>
    </>
  );
}

test("Sheet: once the sheet closes, notices go back to the screen (the slot is handed back)", async () => {
  withProviders(<ToastAfterCloseHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => assert.ok(document.querySelector("[data-sheet-root]") === null));
  fireEvent.click(screen.getByRole("button", { name: "Notify" }));
  await waitFor(() => assert.ok(document.querySelector("[data-app-notice]") !== null, "the notice shows"));
  assert.ok(document.querySelector("[data-app-notice]")?.closest("[data-sheet]") === null, "not in a closed sheet");
});

function FocusReturnHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open day picker</button>
      <Sheet open={open} title="Choose a day" onClose={() => setOpen(false)}>
        <p>Push Day</p>
      </Sheet>
    </>
  );
}

test("Sheet: focus returns to the opener after close", async () => {
  render(<FocusReturnHarness />);
  const opener = screen.getByRole("button", { name: "Open day picker" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: "Choose a day" });
  await waitFor(() => assert.ok(dialog.contains(document.activeElement), "focus moves into the sheet"));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => assert.ok(document.activeElement === opener, "focus is back on the opener"));
});

function StackedSheetsHarness() {
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  return (
    <>
      <Sheet open={lower} title="Lower" onClose={() => setLower(false)} />
      <Sheet open={upper} title="Upper" onClose={() => setUpper(false)} />
    </>
  );
}

test("Sheet: the scroll lock holds while any stacked sheet is open and is released by the last one", async () => {
  document.body.style.overflow = "";
  render(<StackedSheetsHarness />);
  assert.equal(document.body.style.overflow, "hidden");
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => assert.ok(screen.queryAllByRole("dialog", { name: "Upper" }).length === 0));
  assert.equal(document.body.style.overflow, "hidden", "the lower sheet still holds the lock");
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => assert.ok(screen.queryAllByRole("dialog").length === 0));
  await waitFor(() => assert.equal(document.body.style.overflow, "", "the last sheet releases the lock"));
});

test("Sheet: a scrim tap closes the sheet", () => {
  let closes = 0;
  render(<SheetHarness onClose={() => { closes += 1; }} />);
  fireEvent.click(screen.getByRole("button", { name: "Close Choose a day" }));
  assert.equal(closes, 1);
  assert.ok(screen.queryAllByRole("dialog").length === 0, "the sheet is closing");
});

test("Confirm: while isLoading, a double tap on Confirm, Cancel, Escape and a scrim tap do nothing", () => {
  const events: string[] = [];
  render(
    <ConfirmDestructiveModal
      open
      isLoading
      title="Delete routine"
      objectName="Push Pull Legs"
      confirmLabel="Delete"
      onCancel={() => events.push("cancel")}
      onConfirm={() => events.push("confirm")}
    />,
  );
  const confirm = document.querySelector<HTMLButtonElement>("[data-confirm-modal-action='confirm']");
  assert.ok(confirm && confirm.disabled && confirm.getAttribute("aria-busy") === "true");
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  const cancel = document.querySelector<HTMLButtonElement>("[data-confirm-modal-action='cancel']");
  assert.ok(cancel && cancel.disabled);
  fireEvent.click(cancel);
  fireEvent.keyDown(document, { key: "Escape" });
  const scrim = document.querySelector<HTMLButtonElement>("[data-sheet-root] > button");
  assert.ok(scrim);
  fireEvent.click(scrim);
  assert.deepEqual(events, []);
  assert.ok(screen.getByRole("dialog", { name: "Confirm delete" }));
});

function cssRule(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

test("AppButton looks: primary is an accent fill, secondary a grey keyline surface, quiet has no keyline or fill", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
  const primary = cssRule(css, ".action-chrome.app-button-primary");
  assert.match(primary, /--action-chrome-border-color: rgb\(var\(--accent-strong\) \/ 0\.8\d\)/);
  assert.match(primary, /linear-gradient\(rgb\(var\(--accent\) \/ 0\.42\)/);
  const secondary = cssRule(css, ".action-chrome.app-button-secondary");
  assert.match(secondary, /--action-chrome-border-color: rgb\(var\(--text-secondary\) \/ 0\.34\)/);
  assert.match(secondary, /background: rgb\(var\(--surface-3-rgb\)/);
  const quiet = cssRule(css, ".action-chrome.app-button-tertiary");
  assert.match(quiet, /--action-chrome-border-color: transparent;/);
  assert.match(quiet, /background: transparent;/);
  assert.match(quiet, /--action-chrome-text-color: rgb\(var\(--text-secondary\)\);/);
  const pressed = cssRule(css, ".action-chrome.app-button-tertiary:active:not(:disabled)");
  assert.match(pressed, /text-decoration: none;/);
  // The markers the CSS keys on stay on the rendered classes.
  assert.match(getAppButtonClassName({ variant: "primary" }), /\bapp-button-primary\b/);
  assert.match(getAppButtonClassName({ variant: "secondary" }), /\bapp-button-secondary\b/);
  assert.match(getAppButtonClassName({ variant: "quiet" }), /\bapp-button-tertiary\b/);
});
