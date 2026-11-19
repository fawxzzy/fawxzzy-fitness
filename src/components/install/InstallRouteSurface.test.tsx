import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import { renderToStaticMarkup } from "react-dom/server";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { InstallScreen } from "./InstallGateChrome";
import { InstallRouteSurface, resolveInstallScreenKind } from "./InstallRouteSurface";

const router = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test",
};

function renderInitial(userAgent?: string, standalone = false) {
  const descriptors = {
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
  };
  const navigator = userAgent === undefined ? undefined : {
    userAgent, platform: "Win32", maxTouchPoints: 0, standalone,
  };
  try {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigator });
    Object.defineProperty(globalThis, "window", { configurable: true, value: navigator ? {
      navigator,
      matchMedia: () => ({ matches: standalone }),
    } : undefined });
    return renderToString(
      <AppRouterContext.Provider value={router}>
        <SearchParamsContext.Provider value={new URLSearchParams()}>
          <InstallRouteSurface />
        </SearchParamsContext.Provider>
      </AppRouterContext.Provider>,
    );
  } finally {
    for (const name of ["navigator", "window"] as const) {
      const descriptor = descriptors[name];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test("install surface has identical initial markup on server and supported, unsupported, or installed clients", () => {
  const server = renderInitial();
  for (const [label, userAgent, standalone] of [
    ["Chrome", "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", false],
    ["Firefox", "Mozilla/5.0 Firefox/130.0", false],
    ["installed", "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", true],
  ] as const) {
    assert.equal(renderInitial(userAgent, standalone), server, `${label} first render must match server markup`);
  }
});

test("browser-specific guidance and standalone redirect resolve only after the initial render", () => {
  const source = readFileSync(new URL("./InstallRouteSurface.tsx", import.meta.url), "utf8");
  assert.match(source, /useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => \{\s*setHasResolvedClientInstallContext\(true\)/);
  assert.match(source, /if \(!hasResolvedClientInstallContext \|\| context\.isStandalone\)/);
  assert.match(source, /if \(context\.isStandalone\) \{\s*router\.replace\(getInstalledAppHref\(initialReturnTo \?\? "\/login"\)\)/);
  assert.doesNotMatch(source, /suppressHydrationWarning/);
});

test("computers get computer words, never the phone copy (home screen, Tap menu)", () => {
  const phoneOnly = /home screen|Tap|Add to Home/i;
  for (const override of ["desktop", "desktop-windows-edge", "desktop-windows-chrome", "desktop-macos-chrome"] as const) {
    const context = getInstallContext({ override, allowOverride: true });
    const kind = resolveInstallScreenKind(context);
    assert.equal(kind, "desktop", override);
    const html = renderToStaticMarkup(<InstallScreen kind={kind} />);
    assert.match(html, /Click the install icon at the end of the address bar\./, override);
    assert.match(html, /Install it to use it as an app on this computer\./, override);
    assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), phoneOnly, `${override} shows phone copy`);
  }
  const safari = resolveInstallScreenKind(getInstallContext({ override: "desktop-macos-safari", allowOverride: true }));
  assert.equal(safari, "desktop-safari");
  const html = renderToStaticMarkup(<InstallScreen kind={safari} />);
  assert.match(html, /Copy the link and open it in Chrome or Edge\./);
  assert.match(html, /Click the install icon in the address bar\./);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), phoneOnly);
  // A phone without the prompt keeps its menu steps.
  assert.equal(resolveInstallScreenKind(getInstallContext({ override: "android", allowOverride: true })), "manual");
});
