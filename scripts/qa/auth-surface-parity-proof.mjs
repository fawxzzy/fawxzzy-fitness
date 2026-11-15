#!/usr/bin/env node
// Auth Surface v2 browser proof (Zac 2026-11-15). Updated deliberately from the v1 fixed-centre proof: the page is one
// 100dvh flex column (icon, kicker, title, lead, scrolling body with ONE reserved notice slot, links, legal, dock),
// nothing is position:fixed, and a 320x568 phone gets the compact metrics. Native-editing checks are unchanged.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, webkit } from "playwright";

const baseUrl = String(process.env.FITNESS_AUTH_PARITY_BASE_URL ?? "").trim();
const outputRoot = String(process.env.FITNESS_AUTH_PARITY_OUTPUT ?? "").trim();
const webkitExecutable = String(process.env.FITNESS_AUTH_PARITY_WEBKIT_EXECUTABLE ?? "").trim();
const skipWebkit = process.env.FITNESS_AUTH_PARITY_SKIP_WEBKIT === "1";

if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(baseUrl)) {
  throw new Error("FITNESS_AUTH_PARITY_BASE_URL must be an explicit loopback origin.");
}

if (!outputRoot || !path.isAbsolute(outputRoot)) {
  throw new Error("FITNESS_AUTH_PARITY_OUTPUT must be an absolute task-scoped directory.");
}

// kind: form = editable fields + notice slot + legal + dock; status = icon mark + title (+ slot/dock); install = steps.
const routes = [
  { id: "login", kind: "form" },
  { id: "login-wrong", kind: "form", notice: true },
  { id: "login-remembered", kind: "form" },
  { id: "signup", kind: "form" },
  { id: "signup-taken", kind: "form", notice: true },
  { id: "signup-sent", kind: "form", notice: true },
  { id: "forgot-password", kind: "form" },
  { id: "forgot-password-signed-in", kind: "form" },
  { id: "reset-password", kind: "form" },
  { id: "reset-password-mismatch", kind: "form", notice: true },
  { id: "reset-password-expired", kind: "form", notice: true },
  { id: "entry-handoff-error", kind: "status", notice: true },
  // not-found and app-recovery use the FF-DESIGN-004 card (errorCopy.ts), not this shell; their contract is
  // src/components/error/errorScreens.contract.test.tsx.
  { id: "install-ios-safari", kind: "install" },
  { id: "install-ios-inapp", kind: "install" },
  { id: "install-prompt", kind: "install" },
  { id: "install-manual", kind: "install" },
  { id: "install-unsupported", kind: "install" },
];

const phone = { deviceScaleFactor: 3, hasTouch: true, isMobile: true };
const targets = [
  { id: "desktop-chromium", browserType: chromium, context: { viewport: { width: 1440, height: 900 } } },
  { id: "mobile-chromium", browserType: chromium, context: { viewport: { width: 390, height: 844 }, ...phone } },
  ...(skipWebkit ? [] : [{
    id: "mobile-webkit",
    browserType: webkit,
    launch: webkitExecutable ? { executablePath: webkitExecutable } : {},
    context: { viewport: { width: 390, height: 844 }, ...phone },
  }]),
  { id: "small-phone-chromium", browserType: chromium, compact: true, context: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
  { id: "compact-mobile-chromium", browserType: chromium, compact: true, context: { viewport: { width: 390, height: 500 }, ...phone } },
  { id: "landscape-mobile-chromium", browserType: chromium, compact: true, context: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
];

async function sha256(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function inspectPage(page, route, target) {
  const label = `${target.id}/${route.id}`;
  await page.goto(`${baseUrl}/dev/auth-screen-lab?screen=${encodeURIComponent(route.id)}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.locator("main.fx-auth").waitFor({ state: "visible", timeout: 120_000 });
  // Fields fade their border over 160 ms; read final styles, not a mid-transition frame.
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
  await page.evaluate(frame);

  const metrics = await page.evaluate(() => {
    const shell = document.querySelector("main.fx-auth");
    const q = (selector) => shell?.querySelector(selector) ?? null;
    const rect = (element) => {
      const r = element?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width } : null;
    };
    const icon = q(".fx-appicon");
    const legal = q('[data-testid="auth-legal-row"]');
    const dock = q('[data-testid="auth-dock"]');
    const body = q(".fx-body");
    const inputs = [...(shell?.querySelectorAll("input:not([type=hidden])") ?? [])];
    const fixedInside = [...(shell?.querySelectorAll("*") ?? [])].filter((node) => getComputedStyle(node).position === "fixed").length;
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      visualViewportScale: window.visualViewport?.scale ?? 1,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      shellPosition: shell ? getComputedStyle(shell).position : null,
      shellHeight: rect(shell)?.height ?? null,
      fixedInside,
      iconLoaded: Boolean(icon && icon.complete && icon.naturalWidth > 0),
      icon: rect(icon),
      title: rect(q(".fx-ttl")),
      titleAlign: q(".fx-ttl") ? getComputedStyle(q(".fx-ttl")).textAlign : null,
      leadAlign: q(".fx-lead") ? getComputedStyle(q(".fx-lead")).textAlign : null,
      head: rect(q(".fx-head")),
      body: rect(body),
      bodyScrollable: body ? body.scrollHeight > body.clientHeight + 1 : false,
      slot: rect(q('[data-testid="auth-notice-slot"]')),
      notice: rect(q('[data-testid="auth-notice"]')),
      noticeRole: q('[data-testid="auth-notice"]')?.getAttribute("role") ?? null,
      links: rect(q('[data-testid="auth-secondary-row"]')),
      legal: rect(legal),
      legalLinkCount: legal?.querySelectorAll("a").length ?? 0,
      dock: rect(dock),
      dockHeight: dock ? dock.getBoundingClientRect().height : null,
      steps: rect(q('[data-testid="install-steps"]')),
      inputCount: inputs.length,
      passwordInputCount: inputs.filter((input) => input.getAttribute("name")?.toLowerCase().includes("password")).length,
      revealButtonCount: shell?.querySelectorAll('button[aria-label="Show password"], button[aria-label="Hide password"]').length ?? 0,
      installedMode: Boolean(window.navigator.standalone) || window.matchMedia("(display-mode: standalone)").matches,
      inputStyles: inputs.map((input) => {
        const style = getComputedStyle(input);
        return {
          isPassword: input.getAttribute("name")?.toLowerCase().includes("password") ?? false,
          readOnly: input.readOnly,
          textAlign: style.textAlign,
          fontSize: Number.parseFloat(style.fontSize),
          caretColor: style.caretColor,
          pointerEvents: style.pointerEvents,
          userSelect: style.userSelect || style.webkitUserSelect,
          autoComplete: input.autocomplete,
          paddingLeft: Number.parseFloat(style.paddingLeft),
          paddingRight: Number.parseFloat(style.paddingRight),
        };
      }),
    };
  });

  const vh = metrics.viewportHeight;
  assert.ok(metrics.documentWidth <= metrics.viewportWidth, `${label}: horizontal overflow`);
  assert.equal(metrics.scrollX, 0, `${label}: viewport horizontally offset`);
  assert.equal(metrics.scrollY, 0, `${label}: the page itself scrolls (only the body may)`);
  assert.equal(metrics.installedMode, true, `${label}: installed-shell fixture was not active`);
  assert.equal(metrics.visualViewportScale, 1, `${label}: visual viewport started zoomed`);
  assert.ok(Math.abs(metrics.shellHeight - vh) <= 1, `${label}: shell is not one viewport tall (${metrics.shellHeight} vs ${vh})`);
  assert.equal(metrics.fixedInside, 0, `${label}: something inside the shell is position:fixed`);

  // The real app icon on every screen, inside the viewport.
  assert.equal(metrics.iconLoaded, true, `${label}: app icon missing or not decoded`);
  assert.ok(metrics.icon.top >= -1 && metrics.icon.bottom <= vh + 1, `${label}: app icon outside the viewport`);
  assert.equal(metrics.titleAlign, "center", `${label}: title is not centred`);
  if (metrics.leadAlign) assert.equal(metrics.leadAlign, "center", `${label}: lead is not centred`);

  if (metrics.dock) {
    assert.ok(metrics.dock.top >= 0 && metrics.dock.bottom <= vh + 1, `${label}: dock outside the viewport`);
    assert.ok(metrics.dockHeight >= 44, `${label}: dock smaller than 44px`);
  }
  if (route.kind !== "status") {
    assert.equal(metrics.legalLinkCount, 2, `${label}: legal link count drift`);
    assert.ok(metrics.legal.bottom <= vh + 1, `${label}: legal row below the viewport`);
    if (metrics.dock) assert.ok(metrics.legal.bottom <= metrics.dock.top + 1, `${label}: legal row overlaps the dock`);
  }
  if (route.kind === "form") {
    assert.ok(metrics.body && metrics.head, `${label}: missing head/body`);
    assert.ok(metrics.body.top >= metrics.head.bottom - 1, `${label}: body overlaps the header`);
    const below = metrics.links ?? metrics.legal;
    assert.ok(metrics.body.bottom <= below.top + 1, `${label}: body overlaps the links`);
    assert.ok(metrics.slot, `${label}: reserved notice slot missing`);
    assert.ok(metrics.slot.height >= (target.compact ? 62 : 70) - 0.5, `${label}: notice slot collapsed (${metrics.slot.height})`);
  }
  if (route.notice) {
    assert.ok(metrics.notice, `${label}: expected a notice`);
    assert.equal(metrics.noticeRole, "alert", `${label}: notice is not role=alert`);
  }
  if (route.kind === "install") {
    assert.ok(metrics.steps || route.id === "install-prompt" || route.id === "install-unsupported", `${label}: install steps missing`);
  }

  const editable = metrics.inputStyles.filter((style) => !style.readOnly);
  for (const style of metrics.inputStyles) {
    assert.equal(style.textAlign, "center", `${label}: field text is not centred`);
    assert.ok(style.fontSize >= 16, `${label}: input font permits mobile auto-zoom`);
  }
  for (const style of editable) {
    assert.notEqual(style.caretColor, "rgba(0, 0, 0, 0)");
    assert.notEqual(style.caretColor, "transparent");
    assert.equal(style.pointerEvents, "auto");
    assert.equal(style.userSelect, "text");
    assert.ok(style.autoComplete.length > 0, `${label}: missing autocomplete contract`);
  }
  assert.equal(metrics.revealButtonCount, metrics.passwordInputCount, `${label}: password reveal count drift`);
  for (const style of metrics.inputStyles.filter((inputStyle) => inputStyle.isPassword)) {
    assert.equal(style.paddingLeft, style.paddingRight, `${label}: password text box is not centred`);
  }

  const editableInputs = page.locator("main.fx-auth input:not([type=hidden]):not([readonly])");
  const editableCount = await editableInputs.count();
  if (editableCount > 0) {
    // Every field can be scrolled fully into view inside the body (small phones scroll the body, never the page).
    for (let index = 0; index < editableCount; index += 1) {
      const reach = await editableInputs.nth(index).evaluate((node) => {
        const field = node.closest(".fx-fld");
        field?.scrollIntoView({ block: "center" });
        const r = field?.getBoundingClientRect();
        const body = node.closest(".fx-body")?.getBoundingClientRect();
        return { top: r?.top ?? null, bottom: r?.bottom ?? null, bodyTop: body?.top ?? null, bodyBottom: body?.bottom ?? null };
      });
      assert.ok(reach.top >= reach.bodyTop - 12 && reach.bottom <= reach.bodyBottom + 1, `${label}: field ${index} cannot be scrolled clear inside the body`);
    }
    const firstInput = editableInputs.first();
    const firstField = firstInput.locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' fx-fld ')][1]");
    const boundary = () => firstField.evaluate((field) => {
      const style = getComputedStyle(field);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    // Screens that open with a field already marked invalid (e.g. username taken) start from the neutral state here.
    const initiallyInvalid = await firstField.evaluate((field) => {
      const was = field.getAttribute("data-invalid");
      field.removeAttribute("data-invalid");
      return was;
    });
    const baselineBoundary = await boundary();
    await firstInput.focus();
    await page.evaluate(frame);
    const focusedBoundary = await boundary();
    assert.notDeepEqual(focusedBoundary, baselineBoundary, `${label}: field focus indicator did not change`);
    await firstField.evaluate((field) => field.setAttribute("data-invalid", "true"));
    const invalidBoundary = await boundary();
    assert.notDeepEqual(invalidBoundary, focusedBoundary, `${label}: invalid state did not override focus styling`);
    await firstField.evaluate((field, was) => (was ? field.setAttribute("data-invalid", was) : field.removeAttribute("data-invalid")), initiallyInvalid);

    if (target.browserType === chromium) {
      await page.emulateMedia({ forcedColors: "active" });
      const forced = await firstField.evaluate((field) => {
        const style = getComputedStyle(field);
        return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      assert.notEqual(forced.outlineStyle, "none", `${label}: forced-colors focus outline is absent`);
      assert.notEqual(forced.outlineWidth, "0px", `${label}: forced-colors focus outline has zero width`);
      await page.emulateMedia({ forcedColors: "none" });
    }

    await firstInput.fill("fixture");
    await firstInput.press("ArrowLeft");
    const selection = await firstInput.evaluate((input) => ({ start: input.selectionStart, end: input.selectionEnd }));
    assert.deepEqual(selection, { start: 6, end: 6 }, `${label}: native caret movement failed`);
    await firstInput.blur();

    const passwordInputs = page.locator('main.fx-auth input[name*="password" i]');
    for (let index = 0; index < metrics.passwordInputCount; index += 1) {
      const passwordInput = passwordInputs.nth(index);
      const field = passwordInput.locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' fx-fld ')][1]");
      assert.equal(await passwordInput.getAttribute("type"), "password", `${label}: password field did not start concealed`);
      await field.locator('button[aria-label="Show password"]').click();
      assert.equal(await passwordInput.getAttribute("type"), "text", `${label}: reveal control did not reveal`);
      await field.locator('button[aria-label="Hide password"]').click();
      assert.equal(await passwordInput.getAttribute("type"), "password", `${label}: reveal control did not reconceal`);
    }
  }

  await page.evaluate(() => {
    document.querySelector(".fx-body")?.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
  });
  await page.evaluate(frame);
  const post = await page.evaluate(() => ({ scrollX: window.scrollX, scrollY: window.scrollY, scale: window.visualViewport?.scale ?? 1 }));
  assert.equal(post.scrollX, 0, `${label}: interaction left the viewport horizontally offset`);
  assert.equal(post.scrollY, 0, `${label}: interaction scrolled the page`);
  assert.equal(post.scale, 1, `${label}: interaction triggered mobile auto-zoom`);
  return metrics;
}

await fs.mkdir(outputRoot, { recursive: false });
const results = [];

for (const target of targets) {
  const browser = await target.browserType.launch({ headless: true, ...(target.launch ?? {}) });
  try {
    const context = await browser.newContext(target.context);
    // Fitness gates every app surface behind installed mode, so the dev-only screen lab emulates the installed shell.
    await context.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      Object.defineProperty(window.navigator, "standalone", { configurable: true, get: () => true });
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? new Proxy(originalMatchMedia(query), {
            get(mql, property) {
              if (property === "matches") {
                return true;
              }
              const value = Reflect.get(mql, property, mql);
              return typeof value === "function" ? value.bind(mql) : value;
            },
          })
        : originalMatchMedia(query);
    });

    for (const route of routes) {
      const page = await context.newPage();
      try {
        const metrics = await inspectPage(page, route, target);
        const screenshotPath = path.join(outputRoot, `${target.id}--${route.id}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        results.push({ target: target.id, route: route.id, screenshot: path.basename(screenshotPath), screenshot_sha256: await sha256(screenshotPath), metrics });
      } finally {
        await page.close();
      }
    }
  } finally {
    // Closing the browser is the single lifecycle boundary (a second WebKit context close can deadlock).
    await browser.close();
  }
}

const manifest = {
  schema: "fitness.auth-surface-parity-browser-proof.v2",
  summary: "Fitness auth, status and install screens passed the Surface v2 one-column geometry and native-editing checks.",
  base_url_class: "loopback",
  install_gate_fixture: "standalone",
  screenshot_count: results.length,
  targets: targets.map(({ id }) => id),
  routes: routes.map(({ id }) => id),
  results,
};

await fs.writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ result: "PASS", screenshot_count: results.length, output_root: outputRoot })}\n`);
