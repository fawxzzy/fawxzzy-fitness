import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_HEADER_HEIGHT_VAR,
  APP_HEADER_MENU_BOTTOM_VAR,
  APP_HEADER_MENU_TOGGLE_SELECTOR,
  clearAppHeaderMetrics,
  measureAppHeader,
  syncAppHeaderMetrics,
} from "./appHeaderMetrics";

function fakeHeader(headerBottom: number, toggleBottom: number | null) {
  const queried: string[] = [];
  return {
    queried,
    node: {
      getBoundingClientRect: () => ({ bottom: headerBottom }),
      querySelector: (selector: string) => {
        queried.push(selector);
        return toggleBottom === null ? null : { getBoundingClientRect: () => ({ bottom: toggleBottom }) };
      },
    },
  };
}

function fakeRoot() {
  const values = new Map<string, string>();
  return {
    values,
    root: {
      style: {
        setProperty: (name: string, value: string) => void values.set(name, value),
        removeProperty: (name: string) => void values.delete(name),
      },
    },
  };
}

test("the variable names are the public anchor contract", () => {
  assert.equal(APP_HEADER_HEIGHT_VAR, "--app-header-height");
  assert.equal(APP_HEADER_MENU_BOTTOM_VAR, "--app-header-menu-bottom");
  assert.equal(APP_HEADER_MENU_TOGGLE_SELECTOR, "[data-app-menu-toggle]");
});

test("measures the header block bottom and the menu button bottom, rounded up to whole pixels", () => {
  const { node, queried } = fakeHeader(118.2, 99.01);
  assert.deepEqual(measureAppHeader(node), { headerBottom: 119, menuBottom: 100 });
  assert.deepEqual(queried, ["[data-app-menu-toggle]"]);
});

test("without a menu button the menu anchor falls back to the header bottom; negatives clamp to 0", () => {
  assert.deepEqual(measureAppHeader(fakeHeader(88, null).node), { headerBottom: 88, menuBottom: 88 });
  assert.deepEqual(measureAppHeader(fakeHeader(-20, -40).node), { headerBottom: 0, menuBottom: 0 });
});

test("sync writes both px values on the root and clear removes them", () => {
  const { values, root } = fakeRoot();
  syncAppHeaderMetrics(fakeHeader(140, 96).node, root);
  assert.equal(values.get("--app-header-height"), "140px");
  assert.equal(values.get("--app-header-menu-bottom"), "96px");
  clearAppHeaderMetrics(root);
  assert.equal(values.size, 0);
});

test("sync and clear are no-ops without a document (server render)", () => {
  assert.doesNotThrow(() => syncAppHeaderMetrics(fakeHeader(10, 10).node, null));
  assert.doesNotThrow(() => clearAppHeaderMetrics(null));
});
