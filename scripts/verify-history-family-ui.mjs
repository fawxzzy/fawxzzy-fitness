import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const STACK_ROOT = path.resolve(REPO_ROOT, "..", "..");
const QA_UI_PASS_SCRIPT = path.resolve(REPO_ROOT, "scripts", "qa-ui-pass.mjs");
const OUTPUT_DIR = path.resolve(STACK_ROOT, "tmp", "history-family-ui-pass");
const HISTORY_DETAIL_SESSION_ID = "history-preview-session-2";
const BASE_URL = (process.env.HISTORY_QA_BASE_URL ?? process.env.QA_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/+$/, "");

function buildPreviewUrl(target) {
  return `${BASE_URL}/dev/history-preview/enable?target=${encodeURIComponent(target)}`;
}

function buildHeaderFirstCardRhythmExpression(cardSelector) {
  return `(() => {
    const header = document.querySelector("[data-shared-screen-header='true']");
    const card = document.querySelector(${JSON.stringify(cardSelector)});
    if (!(header instanceof HTMLElement) || !(card instanceof HTMLElement)) return false;

    const headerRect = header.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const headerIsVisible = headerRect.width > 0 && headerRect.height >= 32 && headerRect.top >= -1;
    const headerToCardGap = cardRect.top - headerRect.bottom;
    const cardFollowsHeader = cardRect.top >= headerRect.top
      && cardRect.top < Math.max(360, window.innerHeight * 0.58)
      && headerToCardGap >= -24
      && headerToCardGap <= 112;
    return headerIsVisible && cardFollowsHeader;
  })()`;
}

function buildNoCardTextClipExpression(cardSelector) {
  return `(() => {
    const cards = Array.from(document.querySelectorAll(${JSON.stringify(cardSelector)})).slice(0, 5);
    if (cards.length === 0) return false;

    return cards.every((card) => {
      if (!(card instanceof HTMLElement)) return false;
      const cardRect = card.getBoundingClientRect();
      const measured = Array.from(card.querySelectorAll([
        "[data-exercise-card-title='true']",
        "[data-exercise-card-summary='true']",
        "[data-exercise-card-supporting='true']",
        "[data-history-card-metadata='true']",
      ].join(",")));

      return measured.length > 0 && measured.every((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0
          && rect.height > 0
          && rect.left >= cardRect.left - 1
          && rect.right <= cardRect.right + 1
          && rect.top >= cardRect.top - 1
          && rect.bottom <= cardRect.bottom + 1;
      });
    });
  })()`;
}

function buildCompactTopRhythmExpression(cardSelector) {
  return `(() => {
    const card = document.querySelector(${JSON.stringify(cardSelector)});
    if (!(card instanceof HTMLElement)) return false;
    const body = card.querySelector("[data-exercise-card-density='compact']");
    const title = card.querySelector("[data-exercise-card-title='true']");
    const summary = card.querySelector("[data-exercise-card-summary='true']");
    const metadata = card.querySelector("[data-history-card-metadata='true']");
    if (!(body instanceof HTMLElement) || !(title instanceof HTMLElement) || !(summary instanceof HTMLElement)) return false;

    const bodyRect = body.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    const titleInset = titleRect.top - bodyRect.top;
    const metadataGap = metadata instanceof HTMLElement
      ? metadata.getBoundingClientRect().top - summaryRect.bottom
      : 0;

    return titleInset >= 4
      && titleInset <= 24
      && metadataGap >= -1
      && metadataGap <= 8;
  })()`;
}

async function writeCaptureConfig(directoryPath, name, captureConfig) {
  const filePath = path.join(directoryPath, `${name}.capture.json`);
  await fs.writeFile(filePath, `${JSON.stringify(captureConfig, null, 2)}\n`, "utf8");
}

async function main() {
  const inputDir = await fs.mkdtemp(path.join(os.tmpdir(), "history-family-ui-pass-"));

  try {
    await writeCaptureConfig(inputDir, "history-sessions", {
      url: buildPreviewUrl("/history"),
      width: 430,
      height: 932,
      mobile: true,
      deviceScaleFactor: 1,
      initialWaitMs: 1200,
      actions: [
        { type: "navigate", url: `${BASE_URL}/history` },
        { type: "waitForSelector", selector: `a[href='/history/${HISTORY_DETAIL_SESSION_ID}?returnTab=sessions']`, timeoutMs: 10000 },
        { type: "waitForSelector", selector: "[data-shared-screen-header='true']", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History sessions must render compact explicit session cards on the shared no-media card shell.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='session']"));
            return cards.length > 0 && cards.every((card) => (
              card.getAttribute("data-history-density") === "compact"
              && Boolean(card.querySelector("[data-exercise-card-density='compact'][data-exercise-card-media='none']"))
            ));
          })()`,
        },
        {
          type: "assertExpression",
          message: "History sessions must keep the floating header and first card in the recovered top rhythm.",
          expression: buildHeaderFirstCardRhythmExpression("[data-history-card='session']"),
        },
        {
          type: "assertExpression",
          message: "History session card text must stay inside the shared card shell without clipping.",
          expression: buildNoCardTextClipExpression("[data-history-card='session']"),
        },
        {
          type: "assertExpression",
          message: "History compact session cards must not push the title down with badge-only top padding.",
          expression: buildCompactTopRhythmExpression("[data-history-card='session']"),
        },
      ],
      finalWaitMs: 900,
      outPath: path.join(OUTPUT_DIR, "history-sessions.png"),
    });

    await writeCaptureConfig(inputDir, "history-exercises", {
      url: buildPreviewUrl("/history/exercises"),
      width: 430,
      height: 932,
      mobile: true,
      deviceScaleFactor: 1,
      initialWaitMs: 1200,
      actions: [
        { type: "navigate", url: `${BASE_URL}/history/exercises` },
        { type: "waitForSelector", selector: "input[placeholder='Search exercises']", timeoutMs: 10000 },
        { type: "waitForText", text: "Back Squat", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History exercises must render compact explicit exercise cards on the recovered history-browser media shell.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='exercise'][data-history-surface='history-browser']"));
            return cards.length > 0 && cards.every((card) => (
              card.getAttribute("data-history-density") === "compact"
              && Boolean(card.querySelector("[data-exercise-card-density='compact'][data-exercise-card-media='rail']"))
            ));
          })()`,
        },
        {
          type: "assertExpression",
          message: "History exercise media rails must stay visible at recovered compact-card width without horizontal page overflow.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='exercise'][data-history-surface='history-browser']"));
            const documentFits = document.documentElement.scrollWidth <= window.innerWidth + 1;
            return documentFits && cards.every((card) => {
              const body = card.querySelector("[data-exercise-card-density='compact'][data-exercise-card-media='rail']");
              if (!(body instanceof HTMLElement)) return false;
              const mediaGrid = body.querySelector("div[style*='grid-template-columns']");
              if (!(mediaGrid instanceof HTMLElement)) return false;
              const firstColumn = mediaGrid.firstElementChild;
              if (!(firstColumn instanceof HTMLElement)) return false;
              const width = firstColumn.getBoundingClientRect().width;
              return width >= 68 && width <= 82;
            });
          })()`,
        },
        {
          type: "assertExpression",
          message: "History exercises must keep the floating header and first card in the recovered top rhythm.",
          expression: buildHeaderFirstCardRhythmExpression("[data-history-card='exercise'][data-history-surface='history-browser']"),
        },
        {
          type: "assertExpression",
          message: "History exercise card text and metadata must stay inside the shared card shell without clipping.",
          expression: buildNoCardTextClipExpression("[data-history-card='exercise'][data-history-surface='history-browser']"),
        },
        {
          type: "assertExpression",
          message: "History compact exercise metadata must sit tight under the summary without creating a top gap.",
          expression: buildCompactTopRhythmExpression("[data-history-card='exercise'][data-history-surface='history-browser']"),
        },
      ],
      finalWaitMs: 900,
      outPath: path.join(OUTPUT_DIR, "history-exercises.png"),
    });

    await writeCaptureConfig(inputDir, "history-detail", {
      url: buildPreviewUrl(`/history/${HISTORY_DETAIL_SESSION_ID}`),
      width: 430,
      height: 932,
      mobile: true,
      deviceScaleFactor: 1,
      initialWaitMs: 1200,
      actions: [
        { type: "navigate", url: `${BASE_URL}/history/${HISTORY_DETAIL_SESSION_ID}` },
        { type: "waitForText", text: "Logged exercises", timeoutMs: 10000 },
        { type: "waitForText", text: "Back Squat", timeoutMs: 10000 },
        { type: "waitForSelector", selector: "[data-shared-screen-header='true']", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History detail must render the summary through the detailed session wrapper.",
          expression: `(() => {
            const card = document.querySelector("[data-history-card='session']");
            return Boolean(
              card
              && card.getAttribute("data-history-density") === "detailed"
              && card.querySelector("[data-exercise-card-density='detailed'][data-exercise-card-media='none']")
            );
          })()`,
        },
        {
          type: "assertExpression",
          message: "History detail logged exercises must render through explicit detail exercise wrappers.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='detail-exercise'][data-history-surface='history-detail']"));
            return cards.length > 0 && cards.every((card) => (
              card.getAttribute("data-history-density") === "compact"
              && Boolean(card.querySelector("[data-exercise-card-density='compact']"))
            ));
          })()`,
        },
        {
          type: "assertExpression",
          message: "History detail must keep the floating header and summary card in the recovered top rhythm.",
          expression: buildHeaderFirstCardRhythmExpression("[data-history-card='session']"),
        },
        {
          type: "assertExpression",
          message: "History detail summary and exercise text must stay inside the shared card shell without clipping.",
          expression: buildNoCardTextClipExpression("[data-history-card='session'], [data-history-card='detail-exercise'][data-history-surface='history-detail']"),
        },
        {
          type: "assertExpression",
          message: "History detail compact exercise rows must keep the same top rhythm as the browser rows.",
          expression: buildCompactTopRhythmExpression("[data-history-card='detail-exercise'][data-history-surface='history-detail']"),
        },
      ],
      finalWaitMs: 900,
      outPath: path.join(OUTPUT_DIR, "history-detail.png"),
    });

    const { stdout } = await execFileAsync(process.execPath, [QA_UI_PASS_SCRIPT, "--input-dir", inputDir, "--output-dir", OUTPUT_DIR], {
      cwd: REPO_ROOT,
      windowsHide: true,
      env: process.env,
    });

    const parsed = JSON.parse(stdout);
    if (parsed.captureCount !== 3) {
      throw new Error(`Expected 3 history captures, received ${parsed.captureCount}.`);
    }

    process.stdout.write(`${JSON.stringify({
      baseUrl: BASE_URL,
      outputDir: OUTPUT_DIR,
      manifestPath: parsed.manifestPath,
      captureCount: parsed.captureCount,
    }, null, 2)}\n`);
  } finally {
    await fs.rm(inputDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
