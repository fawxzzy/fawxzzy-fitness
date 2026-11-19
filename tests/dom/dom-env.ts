// DOM test environment for node:test. Import this file FIRST in a *.dom.test.tsx file: it installs a jsdom
// window on globalThis before React Testing Library reads `document`. It is a side-effect module on purpose.
//
// Why jsdom and not a browser: these tests check real event behaviour (click, keyboard, focus) on shared card
// primitives without a Supabase session or a dev server. They do not replace a device check.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const { window } = dom;

const copied = [
  "document",
  "navigator",
  "HTMLElement",
  "HTMLButtonElement",
  "HTMLInputElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "StorageEvent",
  "HTMLFormElement",
  "SubmitEvent",
  "KeyboardEvent",
  "MouseEvent",
  "FocusEvent",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
] as const;

Object.defineProperty(globalThis, "window", { value: window, configurable: true, writable: true });
for (const key of copied) {
  // `navigator` is a getter on Node 22, so use defineProperty rather than assignment.
  Object.defineProperty(globalThis, key, { value: (window as unknown as Record<string, unknown>)[key], configurable: true, writable: true });
}
// jsdom has no Performance Timeline entries; the back-navigation hook asks for the navigation entry type.
if (typeof window.performance.getEntriesByType !== "function") {
  (window.performance as unknown as { getEntriesByType: () => unknown[] }).getEntriesByType = () => [];
}
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
