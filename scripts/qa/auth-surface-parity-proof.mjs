#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, webkit } from "playwright";

const baseUrl = String(process.env.FITNESS_AUTH_PARITY_BASE_URL ?? "").trim();
const outputRoot = String(process.env.FITNESS_AUTH_PARITY_OUTPUT ?? "").trim();
const webkitExecutable = String(process.env.FITNESS_AUTH_PARITY_WEBKIT_EXECUTABLE ?? "").trim();

if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(baseUrl)) {
  throw new Error("FITNESS_AUTH_PARITY_BASE_URL must be an explicit loopback origin.");
}

if (!outputRoot || !path.isAbsolute(outputRoot)) {
  throw new Error("FITNESS_AUTH_PARITY_OUTPUT must be an absolute task-scoped directory.");
}

const routes = [
  { id: "login", needsFields: true, needsLegal: true },
  { id: "login-remembered", needsFields: true, needsLegal: true },
  { id: "signup", needsFields: true, needsLegal: true },
  { id: "forgot-password", needsFields: true, needsLegal: true },
  { id: "reset-password", needsFields: true, needsLegal: true },
  { id: "reset-password-expired", needsFields: false, needsLegal: true },
  { id: "entry-handoff-error", needsFields: false, needsLegal: false },
];

const targets = [
  {
    id: "desktop-chromium",
    browserType: chromium,
    context: { viewport: { width: 1440, height: 900 } },
  },
  {
    id: "mobile-chromium",
    browserType: chromium,
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  },
  {
    id: "mobile-webkit",
    browserType: webkit,
    launch: webkitExecutable ? { executablePath: webkitExecutable } : {},
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  },
  {
    id: "compact-mobile-chromium",
    browserType: chromium,
    compact: true,
    context: { viewport: { width: 390, height: 500 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  },
  {
    id: "landscape-mobile-chromium",
    browserType: chromium,
    compact: true,
    context: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  },
  {
    id: "standalone-pwa-chromium",
    browserType: chromium,
    standalone: true,
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  },
];

async function sha256(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function inspectPage(page, route, target) {
  await page.goto(`${baseUrl}/dev/auth-screen-lab?screen=${encodeURIComponent(route.id)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.locator('[data-testid="auth-shell"]').waitFor({ state: "visible", timeout: 120_000 });

  const metrics = await page.evaluate(({ needsFields, needsLegal }) => {
    const shell = document.querySelector('[data-testid="auth-shell"]');
    const intro = document.querySelector('[data-testid="auth-intro"]');
    const fields = document.querySelector('[data-testid="auth-form-fields"]');
    const footer = document.querySelector('[data-testid="auth-footer"]');
    const dock = document.querySelector('[data-testid="auth-dock"]');
    const inputs = [...document.querySelectorAll("input:not([type=hidden])")];
    const passwordInputs = inputs.filter((input) => input.getAttribute("name")?.toLowerCase().includes("password"));
    const revealButtons = [...document.querySelectorAll('button[aria-label="Show password"], button[aria-label="Hide password"]')];
    const legal = document.querySelector('[data-testid="auth-legal-row"]');
    const secondary = document.querySelector('[data-testid="auth-secondary-row"]');
    const centerlineSeparators = [
      secondary?.children.item(1) ?? null,
      legal?.querySelector(":scope > span > span:nth-child(2)") ?? null,
    ].filter(Boolean);

    const rect = (element) => element?.getBoundingClientRect() ?? null;
    const viewportCenter = window.innerWidth / 2;
    const fieldRect = rect(fields);
    const dockRect = rect(dock);
    const introRect = rect(intro);
    const footerRect = rect(footer);
    const shellRect = rect(shell);
    const dockTargets = [...(dock?.querySelectorAll("a, button") ?? [])];
    const separatorCenters = centerlineSeparators.map((separator) => {
      const separatorRect = separator.getBoundingClientRect();
      return separatorRect.left + separatorRect.width / 2;
    });

    return {
      shellVisible: Boolean(shell),
      needsFields,
      needsLegal,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      visualViewportScale: window.visualViewport?.scale ?? 1,
      scrollX: window.scrollX,
      shellScrollLeft: shell?.scrollLeft ?? 0,
      shellScrollTop: shell?.scrollTop ?? 0,
      shellLeft: shellRect?.left ?? null,
      shellRight: shellRect?.right ?? null,
      introTop: introRect?.top ?? null,
      introBottom: introRect?.bottom ?? null,
      fieldTop: fieldRect?.top ?? null,
      fieldBottom: fieldRect?.bottom ?? null,
      fieldCenterY: fieldRect ? fieldRect.top + fieldRect.height / 2 : null,
      dockBottom: dockRect?.bottom ?? null,
      dockTop: dockRect?.top ?? null,
      footerTop: footerRect?.top ?? null,
      footerPosition: footer ? getComputedStyle(footer).position : null,
      footerRows: footer?.children.length ?? 0,
      legalLinkCount: legal?.querySelectorAll("a").length ?? 0,
      separatorCenterDelta: separatorCenters.map((center) => Math.abs(center - viewportCenter)),
      inputCount: inputs.length,
      passwordInputCount: passwordInputs.length,
      revealButtonCount: revealButtons.length,
      dockTargetHeights: dockTargets.map((target) => target.getBoundingClientRect().height),
      installedMode: Boolean(window.navigator.standalone) || window.matchMedia("(display-mode: standalone)").matches,
      inputStyles: inputs.map((input) => {
        const style = getComputedStyle(input);
        return {
          isPassword: input.getAttribute("name")?.toLowerCase().includes("password") ?? false,
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
  }, { needsFields: route.needsFields, needsLegal: route.needsLegal });

  assert.equal(metrics.shellVisible, true);
  assert.ok(metrics.documentWidth <= metrics.viewportWidth, `${target.id}/${route.id}: horizontal overflow`);
  assert.equal(metrics.scrollX, 0, `${target.id}/${route.id}: viewport was horizontally offset before interaction`);
  assert.equal(metrics.shellScrollLeft, 0, `${target.id}/${route.id}: auth shell was horizontally offset before interaction`);
  assert.equal(metrics.shellScrollTop, 0, `${target.id}/${route.id}: auth shell did not start at its top anchor`);
  assert.ok(metrics.shellLeft === null || metrics.shellLeft >= -1, `${target.id}/${route.id}: shell escaped the left edge`);
  assert.ok(metrics.shellRight === null || metrics.shellRight <= metrics.viewportWidth + 1, `${target.id}/${route.id}: shell escaped the right edge`);
  assert.equal(metrics.installedMode, true, `${target.id}/${route.id}: installed-shell fixture was not active`);
  assert.equal(metrics.visualViewportScale, 1, `${target.id}/${route.id}: visual viewport started zoomed`);
  assert.ok(metrics.introTop === null || metrics.introTop >= -1, `${target.id}/${route.id}: intro escaped the top`);
  assert.ok(metrics.dockBottom === null || metrics.dockBottom <= metrics.viewportHeight + 1, `${target.id}/${route.id}: dock escaped the bottom`);
  assert.ok(metrics.dockTop === null || metrics.dockTop >= 0, `${target.id}/${route.id}: dock escaped the viewport`);

  if (route.needsFields) {
    assert.ok(metrics.inputCount > 0, `${target.id}/${route.id}: expected editable fields`);
    if (!target.compact) {
      assert.ok(metrics.fieldCenterY !== null && Math.abs(metrics.fieldCenterY - metrics.viewportHeight / 2) <= 2, `${target.id}/${route.id}: field group is not viewport centered`);
      assert.ok(metrics.footerTop === null || metrics.fieldBottom === null || metrics.fieldBottom <= metrics.footerTop - 8, `${target.id}/${route.id}: fields overlap the footer`);
    }
    assert.ok(metrics.introBottom === null || metrics.fieldTop === null || metrics.fieldTop >= metrics.introBottom + 8, `${target.id}/${route.id}: fields overlap the intro`);
    for (const style of metrics.inputStyles) {
      assert.equal(style.textAlign, "center");
      assert.ok(style.fontSize >= 16, `${target.id}/${route.id}: input font permits mobile auto-zoom`);
      assert.notEqual(style.caretColor, "rgba(0, 0, 0, 0)");
      assert.notEqual(style.caretColor, "transparent");
      assert.equal(style.pointerEvents, "auto");
      assert.equal(style.userSelect, "text");
      assert.ok(style.autoComplete.length > 0, `${target.id}/${route.id}: missing autocomplete contract`);
    }
    assert.equal(metrics.revealButtonCount, metrics.passwordInputCount, `${target.id}/${route.id}: password reveal count drift`);
    for (const style of metrics.inputStyles.filter((inputStyle) => inputStyle.isPassword)) {
      assert.equal(style.paddingLeft, style.paddingRight, `${target.id}/${route.id}: password text content box is not centered`);
    }
  }

  if (route.needsLegal) {
    assert.equal(metrics.footerRows, 2, `${target.id}/${route.id}: footer slot count drift`);
    assert.equal(metrics.legalLinkCount, 2, `${target.id}/${route.id}: legal link count drift`);
    if (target.compact) {
      assert.equal(metrics.footerPosition, "static", `${target.id}/${route.id}: compact footer still overlays the form`);
      assert.ok(metrics.fieldBottom === null || metrics.footerTop === null || metrics.fieldBottom <= metrics.footerTop - 8, `${target.id}/${route.id}: compact footer overlaps the field group`);
      assert.ok(metrics.fieldBottom === null || metrics.dockTop === null || metrics.fieldBottom <= metrics.dockTop - 8, `${target.id}/${route.id}: compact field group starts behind the primary dock`);
    } else {
      assert.equal(metrics.footerPosition, "fixed", `${target.id}/${route.id}: normal-height footer lost its viewport anchor`);
      assert.ok(metrics.footerTop !== null && metrics.dockTop !== null && metrics.footerTop < metrics.dockTop, `${target.id}/${route.id}: footer is not above the dock`);
    }
    for (const delta of metrics.separatorCenterDelta) {
      assert.ok(delta <= 1, `${target.id}/${route.id}: divider is not on the viewport centerline`);
    }
  }

  for (const height of metrics.dockTargetHeights) {
    assert.ok(height >= 44, `${target.id}/${route.id}: dock action is smaller than 44px`);
  }

  if (metrics.inputCount > 0) {
    const firstInput = page.locator("input:not([type=hidden])").first();
    const firstField = firstInput.locator("xpath=ancestor::fieldset[1]");
    const baselineBoundary = await firstField.evaluate((field) => {
      const style = getComputedStyle(field);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    await firstInput.focus();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const focusedBoundary = await firstField.evaluate((field) => {
      const style = getComputedStyle(field);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    assert.notDeepEqual(focusedBoundary, baselineBoundary, `${target.id}/${route.id}: fieldset focus indicator did not change`);

    await firstInput.evaluate((input) => input.setAttribute("aria-invalid", "true"));
    const invalidBoundary = await firstField.evaluate((field) => {
      const style = getComputedStyle(field);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    assert.notDeepEqual(invalidBoundary, focusedBoundary, `${target.id}/${route.id}: invalid state did not override focus styling`);
    await firstInput.evaluate((input) => input.removeAttribute("aria-invalid"));

    if (target.browserType === chromium) {
      await page.emulateMedia({ forcedColors: "active" });
      const forcedColorsBoundary = await firstField.evaluate((field) => {
        const style = getComputedStyle(field);
        return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      assert.notEqual(forcedColorsBoundary.outlineStyle, "none", `${target.id}/${route.id}: forced-colors focus outline is absent`);
      assert.notEqual(forcedColorsBoundary.outlineWidth, "0px", `${target.id}/${route.id}: forced-colors focus outline has zero width`);
      await page.emulateMedia({ forcedColors: "none" });
    }

    await firstInput.fill("fixture");
    await firstInput.press("ArrowLeft");
    const selection = await firstInput.evaluate((input) => ({
      start: input.selectionStart,
      end: input.selectionEnd,
    }));
    assert.deepEqual(selection, { start: 6, end: 6 }, `${target.id}/${route.id}: native caret movement failed`);
    await firstInput.blur();

    if (target.compact) {
      const editableInputs = page.locator("input:not([type=hidden])");
      for (let index = 0; index < metrics.inputCount; index += 1) {
        const input = editableInputs.nth(index);
        await input.evaluate((node) => node.closest("fieldset")?.scrollIntoView({ block: "center" }));
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const reachability = await input.evaluate((node) => {
          const field = node.closest("fieldset");
          const footer = document.querySelector('[data-testid="auth-footer"]');
          const dock = document.querySelector('[data-testid="auth-dock"]');
          const fieldRect = field?.getBoundingClientRect();
          const obstructionTop = Math.min(
            footer?.getBoundingClientRect().top ?? window.innerHeight,
            dock?.getBoundingClientRect().top ?? window.innerHeight,
          );
          return {
            fieldTop: fieldRect?.top ?? null,
            fieldBottom: fieldRect?.bottom ?? null,
            obstructionTop,
          };
        });
        assert.ok(reachability.fieldTop !== null && reachability.fieldTop >= 0, `${target.id}/${route.id}: field ${index} is not reachable above the viewport`);
        assert.ok(reachability.fieldBottom !== null && reachability.fieldBottom <= reachability.obstructionTop - 8, `${target.id}/${route.id}: field ${index} cannot scroll clear of the fixed action rails`);
      }
    }

    const passwordInputs = page.locator('input[name*="password" i]');
    for (let index = 0; index < metrics.passwordInputCount; index += 1) {
      const passwordInput = passwordInputs.nth(index);
      const revealButton = passwordInput.locator('xpath=ancestor::fieldset[1]//button[@aria-label="Show password"]');
      assert.equal(await passwordInput.getAttribute("type"), "password", `${target.id}/${route.id}: password field did not start concealed`);
      await revealButton.click();
      assert.equal(await passwordInput.getAttribute("type"), "text", `${target.id}/${route.id}: product reveal control did not reveal the password`);
      const hideButton = passwordInput.locator('xpath=ancestor::fieldset[1]//button[@aria-label="Hide password"]');
      await hideButton.click();
      assert.equal(await passwordInput.getAttribute("type"), "password", `${target.id}/${route.id}: product reveal control did not reconceal the password`);
    }
  }


  await page.evaluate(() => {
    document.querySelector('[data-testid="auth-shell"]')?.scrollTo({ left: 0, top: 0, behavior: "instant" });
    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const postInteraction = await page.evaluate(() => ({
    scrollX: window.scrollX,
    shellScrollLeft: document.querySelector('[data-testid="auth-shell"]')?.scrollLeft ?? 0,
    shellScrollTop: document.querySelector('[data-testid="auth-shell"]')?.scrollTop ?? 0,
    visualViewportScale: window.visualViewport?.scale ?? 1,
  }));
  assert.equal(postInteraction.scrollX, 0, `${target.id}/${route.id}: interaction left the viewport horizontally offset`);
  assert.equal(postInteraction.shellScrollLeft, 0, `${target.id}/${route.id}: interaction left the auth shell horizontally offset`);
  assert.equal(postInteraction.shellScrollTop, 0, `${target.id}/${route.id}: screenshot did not restore the top anchor`);
  assert.equal(postInteraction.visualViewportScale, 1, `${target.id}/${route.id}: interaction triggered mobile auto-zoom`);

  return {
    ...metrics,
    postInteractionScrollX: postInteraction.scrollX,
    postInteractionShellScrollLeft: postInteraction.shellScrollLeft,
    postInteractionShellScrollTop: postInteraction.shellScrollTop,
    postInteractionVisualViewportScale: postInteraction.visualViewportScale,
  };
}

await fs.mkdir(outputRoot, { recursive: false });
const results = [];

for (const target of targets) {
  const browser = await target.browserType.launch({ headless: true, ...(target.launch ?? {}) });
  try {
    const context = await browser.newContext(target.context);
    // Fitness intentionally gates every app surface behind installed mode. The
    // dev-only screen lab therefore emulates the installed shell for every
    // engine/viewport target while still testing their distinct rendering.
    await context.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      Object.defineProperty(window.navigator, "standalone", { configurable: true, get: () => true });
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? new Proxy(originalMatchMedia(query), {
            get(target, property) {
              if (property === "matches") {
                return true;
              }
              const value = Reflect.get(target, property, target);
              return typeof value === "function" ? value.bind(target) : value;
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
        results.push({
          target: target.id,
          route: route.id,
          screenshot: path.basename(screenshotPath),
          screenshot_sha256: await sha256(screenshotPath),
          metrics,
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    // Closing the browser is the single lifecycle boundary; Playwright closes
    // every owned context with it. A second explicit WebKit context close can
    // deadlock after the final page has already detached its network process.
    await browser.close();
  }
}

const manifest = {
  schema: "fitness.auth-surface-parity-browser-proof.v1",
  summary: "Fitness account surfaces passed route-aware geometry and native-editing checks across desktop, mobile Chromium, mobile WebKit, and standalone-PWA emulation.",
  base_url_class: "loopback",
  install_gate_fixture: "standalone",
  screenshot_count: results.length,
  targets: targets.map(({ id }) => id),
  routes: routes.map(({ id }) => id),
  results,
};

await fs.writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ result: "PASS", screenshot_count: results.length, output_root: outputRoot })}\n`);
