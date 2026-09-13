#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, webkit } from "playwright";

const baseUrl = String(process.env.FITNESS_ACCOUNT_PROOF_BASE_URL ?? "").trim();
const outputRoot = String(process.env.FITNESS_ACCOUNT_PROOF_OUTPUT ?? "").trim();

if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(baseUrl)) {
  throw new Error("FITNESS_ACCOUNT_PROOF_BASE_URL must be an explicit loopback origin.");
}

if (!outputRoot || !path.isAbsolute(outputRoot)) {
  throw new Error("FITNESS_ACCOUNT_PROOF_OUTPUT must be an absolute task-scoped directory.");
}

const targets = [
  { id: "mobile-chromium", browserType: chromium },
  { id: "mobile-webkit", browserType: webkit },
];

await fs.mkdir(outputRoot, { recursive: false });
const results = [];

async function sha256(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

for (const target of targets) {
  const browser = await target.browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true,
      isMobile: true,
    });
    await context.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      Object.defineProperty(window.navigator, "standalone", { configurable: true, get: () => true });
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? new Proxy(originalMatchMedia(query), {
            get(value, property) {
              if (property === "matches") return true;
              const entry = Reflect.get(value, property, value);
              return typeof entry === "function" ? entry.bind(value) : entry;
            },
          })
        : originalMatchMedia(query);
    });

    const page = await context.newPage();
    await page.goto(`${baseUrl}/dev/auth-screen-lab?screen=account`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await page.locator('[data-testid="account-screen"]').waitFor({ state: "visible", timeout: 120_000 });

    const metrics = await page.evaluate((expectedOrigin) => {
      const account = document.querySelector('[data-testid="account-screen"]');
      const shell = document.querySelector('[data-mobile-screen-shell="true"]');
      const back = document.querySelector('button[aria-label="Back to Settings"]');
      const save = [...document.querySelectorAll("button")].find((entry) => entry.textContent?.trim() === "Save");
      const signOut = [...document.querySelectorAll("button")].find((entry) => entry.textContent?.trim() === "Sign out");
      const email = document.querySelector('input[name="email"]');
      const username = document.querySelector('input[name="username"]');
      const title = [...document.querySelectorAll("h1, h2")].find((entry) => entry.textContent?.trim() === "Account");
      const activeTab = document.querySelector('nav[aria-label="App tabs"] [aria-current="page"]');
      const anchors = [...document.querySelectorAll("a[href]")].map((anchor) => new URL(anchor.getAttribute("href") ?? "", location.href));
      const rect = (entry) => entry?.getBoundingClientRect() ?? null;
      const backRect = rect(back);
      const saveRect = rect(save);
      const signOutRect = rect(signOut);
      const accountRect = rect(account);

      return {
        origin: location.origin,
        expectedOrigin,
        shellPresent: Boolean(shell),
        accountPresent: Boolean(account),
        title: title?.textContent?.trim() ?? null,
        activeTab: activeTab?.textContent?.trim() ?? null,
        backWidth: backRect?.width ?? 0,
        backHeight: backRect?.height ?? 0,
        saveHeight: saveRect?.height ?? 0,
        signOutHeight: signOutRect?.height ?? 0,
        emailValue: email?.value ?? null,
        usernameValue: username?.value ?? null,
        documentScrollX: window.scrollX,
        documentScrollY: window.scrollY,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        accountRight: accountRect?.right ?? null,
        externalAnchorCount: anchors.filter((url) => url.origin !== expectedOrigin).length,
        installedMode: Boolean(window.navigator.standalone) || window.matchMedia("(display-mode: standalone)").matches,
      };
    }, new URL(baseUrl).origin);

    assert.equal(metrics.origin, metrics.expectedOrigin, `${target.id}: account fixture left the Fitness origin`);
    assert.equal(metrics.shellPresent, true, `${target.id}: measured mobile shell missing`);
    assert.equal(metrics.accountPresent, true, `${target.id}: account content missing`);
    assert.equal(metrics.title, "Account", `${target.id}: account title missing`);
    assert.equal(metrics.activeTab, "Account", `${target.id}: Account app tab is not active`);
    assert.ok(metrics.backWidth >= 44 && metrics.backHeight >= 44, `${target.id}: back control is smaller than 44px`);
    assert.ok(metrics.saveHeight >= 44 && metrics.signOutHeight >= 44, `${target.id}: bottom actions are smaller than 44px`);
    assert.equal(metrics.emailValue, "atlas.qa@example.com", `${target.id}: email identity drift`);
    assert.equal(metrics.usernameValue, "Atlas QA", `${target.id}: username identity drift`);
    assert.equal(metrics.documentScrollX, 0, `${target.id}: document scrolled horizontally`);
    assert.equal(metrics.documentScrollY, 0, `${target.id}: document scrolled vertically instead of the owned content region`);
    assert.ok(metrics.documentWidth <= metrics.viewportWidth, `${target.id}: horizontal overflow`);
    assert.ok(metrics.accountRight === null || metrics.accountRight <= metrics.viewportWidth + 1, `${target.id}: account escaped the viewport`);
    assert.equal(metrics.externalAnchorCount, 0, `${target.id}: account surface exposed an external navigation`);
    assert.equal(metrics.installedMode, true, `${target.id}: installed-shell fixture was not active`);

    const screenshotPath = path.join(outputRoot, `${target.id}--account.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    results.push({
      target: target.id,
      screenshot: path.basename(screenshotPath),
      screenshot_sha256: await sha256(screenshotPath),
      metrics,
    });
  } finally {
    await browser.close();
  }
}

const manifest = {
  schema: "fitness.account-same-origin-browser-proof.v1",
  summary: "The Fitness account surface remained on the app origin and retained the measured mobile-shell, safe back, account fields, and reachable bottom actions in mobile Chromium and WebKit.",
  base_url_class: "loopback",
  install_gate_fixture: "standalone",
  screenshot_count: results.length,
  results,
};
await fs.writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ result: "PASS", screenshot_count: results.length, output_root: outputRoot })}\n`);
