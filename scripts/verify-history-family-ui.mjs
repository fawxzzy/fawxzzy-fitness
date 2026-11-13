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
// `/history` needs a signed-in user even in the preview lane; point this at `/dev/history-overview` (static preview data, no
// user) to run the sessions capture without one.
const SESSIONS_ROUTE = process.env.HISTORY_QA_SESSIONS_ROUTE ?? "/history";
const BASE_URL = (process.env.HISTORY_QA_BASE_URL ?? process.env.QA_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/+$/, "");

process.env.HISTORY_QA_PREVIEW_ENABLED ??= "1";

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

function buildTopAreaFirstCardRhythmExpression(topSelector, cardSelector) {
  return `(() => {
    const topArea = document.querySelector(${JSON.stringify(topSelector)});
    const card = document.querySelector(${JSON.stringify(cardSelector)});
    if (!(topArea instanceof HTMLElement) || !(card instanceof HTMLElement)) return false;

    const topRect = topArea.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const topIsVisible = topRect.width > 0 && topRect.height >= 32 && topRect.top >= -1;
    const topToCardGap = cardRect.top - topRect.bottom;
    const cardFollowsTop = cardRect.top >= topRect.top
      && cardRect.top < Math.max(360, window.innerHeight * 0.58)
      && topToCardGap >= -24
      && topToCardGap <= 112;
    return topIsVisible && cardFollowsTop;
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
        "[data-card-title='true']",
        "[data-card-meta='true']",
        "[data-card-details='true']",
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

function buildHistoryDetailNoClipExpression() {
  return `(() => {
    const summary = document.querySelector("[data-history-card='session']");
    if (!(summary instanceof HTMLElement) || summary.scrollWidth > summary.clientWidth + 1) return false;

    const cards = Array.from(document.querySelectorAll("[data-history-card='detail-exercise'][data-history-surface='history-detail']"));
    if (cards.length === 0) return false;

    return cards.every((card) => {
      if (!(card instanceof HTMLElement)) return false;
      const cardRect = card.getBoundingClientRect();
      const measured = Array.from(card.querySelectorAll([
        "[data-card-title='true']",
        "[data-card-meta='true']",
        "[data-card-details='true']",
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
    const header = card.querySelector("[data-card-header='true']");
    const title = card.querySelector("[data-card-title='true']");
    if (!(header instanceof HTMLElement) || !(title instanceof HTMLElement)) return false;

    const titleInset = title.getBoundingClientRect().top - header.getBoundingClientRect().top;
    return titleInset >= 4 && titleInset <= 24;
  })()`;
}

function buildStoreFirstCardHeightExpression(cardSelector, storageKey) {
  return `(() => {
    const card = document.querySelector(${JSON.stringify(cardSelector)});
    if (!(card instanceof HTMLElement)) return false;
    window[${JSON.stringify(storageKey)}] = card.getBoundingClientRect().height;
    return Number.isFinite(window[${JSON.stringify(storageKey)}]) && window[${JSON.stringify(storageKey)}] > 0;
  })()`;
}

function buildFirstCardHeightMatchesStoredExpression(cardSelector, storageKey) {
  return `(() => {
    const card = document.querySelector(${JSON.stringify(cardSelector)});
    const originalHeight = window[${JSON.stringify(storageKey)}];
    if (!(card instanceof HTMLElement) || !Number.isFinite(originalHeight)) return false;
    const nextHeight = card.getBoundingClientRect().height;
    return Math.abs(nextHeight - originalHeight) <= 2;
  })()`;
}

async function writeCaptureConfig(directoryPath, name, captureConfig) {
  const filePath = path.join(directoryPath, `${name}.capture.json`);
  await fs.writeFile(filePath, `${JSON.stringify({ standalone: true, ...captureConfig }, null, 2)}\n`, "utf8");
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
        { type: "navigate", url: `${BASE_URL}${SESSIONS_ROUTE}` },
        { type: "waitForSelector", selector: `a[href='/history/${HISTORY_DETAIL_SESSION_ID}?returnTab=sessions']`, timeoutMs: 10000 },
        { type: "waitForSelector", selector: "input[placeholder^='Search ']", timeoutMs: 10000 },
        { type: "waitForSelector", selector: "[data-history-retention-surface='calendar']", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History sessions must use the count-aware search and filter rail.",
          expression: `(() => {
            const input = document.querySelector("input[placeholder='Search 3 sessions..']");
            const filterButton = document.querySelector("button[aria-label='Toggle session filters']");
            return input instanceof HTMLInputElement && filterButton instanceof HTMLButtonElement;
          })()`,
        },
        {
          type: "assertExpression",
          message: "History sessions must render the complete retention review stack without page overflow.",
          expression: `(() => {
            const surfaceNames = ["calendar", "monthly", "streak", "heatmap"];
            const hasSurfaces = surfaceNames.every((name) => document.querySelector("[data-history-retention-surface='" + name + "']"));
            return hasSurfaces && document.documentElement.scrollWidth <= window.innerWidth + 1;
          })()`,
        },
        {
          type: "assertExpression",
          message: "History sessions must render compact session cards on the card system with a stretched header link.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='session']"));
            return cards.length > 0 && cards.every((card) => {
              const link = card.querySelector("a[data-card-hit='link']");
              return card.getAttribute("data-history-density") === "compact"
                && link instanceof HTMLAnchorElement
                && link.getAttribute("href")?.startsWith("/history/");
            });
          })()`,
        },
        {
          type: "assertExpression",
          message: "History sessions must keep the search rail and calendar in the recovered top rhythm.",
          expression: buildTopAreaFirstCardRhythmExpression("input[placeholder^='Search ']", "[data-history-retention-surface='calendar']"),
        },
        {
          type: "assertExpression",
          message: "History session card text must stay inside the shared card shell without clipping.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='session']"));
            return cards.length > 0 && cards.every((card) => (
              card instanceof HTMLElement && card.scrollWidth <= card.clientWidth + 1
            ));
          })()`,
        },
        {
          type: "assertExpression",
          message: "History compact session cards must stay a bounded height (title, meta and chips only).",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='session']"));
            return cards.length > 0 && cards.every((card) => {
              if (!(card instanceof HTMLElement)) return false;
              const height = card.getBoundingClientRect().height;
              return height >= 36 && height <= 200 && Boolean(card.textContent?.trim());
            });
          })()`,
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
        { type: "waitForSelector", selector: "[data-history-floating-header] input[placeholder^='Search ']", timeoutMs: 10000 },
        { type: "waitForText", text: "Back Squat", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History exercises top area must not render the old History/count/tabs shared header block.",
          expression: `(() => {
            const oldHeader = document.querySelector("[data-shared-screen-header='true']");
            const hasTabs = Boolean(document.querySelector("[aria-label='History tabs']"));
            const bodyText = document.body?.innerText?.toLowerCase() ?? "";
            return !oldHeader && !hasTabs && !bodyText.includes("tracked exercises");
          })()`,
        },
        {
          type: "assertExpression",
          message: "History exercises top area must keep only compact exercise controls.",
          expression: `(() => Boolean(
            document.querySelector("[data-history-floating-header] input[placeholder^='Search ']")
            && document.querySelector("[data-history-floating-header] button")
          ))()`,
        },
        {
          type: "assertExpression",
          message: "History exercises must render compact explicit exercise cards on the recovered history-browser media shell.",
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll("[data-history-card='exercise'][data-history-surface='history-browser']"));
            return cards.length > 0 && cards.every((card) => (
              card.getAttribute("data-history-density") === "compact"
              && Boolean(card.querySelector("[data-card-leading='true']"))
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
              const media = card.querySelector("[data-card-leading='true']");
              if (!(media instanceof HTMLElement)) return false;
              const width = media.getBoundingClientRect().width;
              return width >= 52 && width <= 72;
            });
          })()`,
        },
        {
          type: "assertExpression",
          message: "History exercises must keep controls and first card in the recovered top rhythm.",
          expression: buildTopAreaFirstCardRhythmExpression("[data-history-floating-header]", "[data-history-card='exercise'][data-history-surface='history-browser']"),
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
        {
          type: "assertExpression",
          message: "History exercise compact height must be captured before density toggling.",
          expression: buildStoreFirstCardHeightExpression("[data-history-card='exercise'][data-history-surface='history-browser']", "__historyExerciseCompactHeight"),
        },
        { type: "click", selector: "[data-history-density-toggle='exercises']" },
        { type: "waitForSelector", selector: "[data-history-card='exercise'][data-history-density='detailed']", timeoutMs: 10000 },
        { type: "click", selector: "[data-history-density-toggle='exercises']" },
        { type: "waitForSelector", selector: "[data-history-card='exercise'][data-history-density='compact']", timeoutMs: 10000 },
        {
          type: "assertExpression",
          message: "History exercise compact->detailed->compact must restore the original compact card height.",
          expression: buildFirstCardHeightMatchesStoredExpression("[data-history-card='exercise'][data-history-surface='history-browser']", "__historyExerciseCompactHeight"),
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
              && card.textContent?.includes("Session Time")
              && card.textContent?.includes("Completion")
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
              && Boolean(card.querySelector("[data-card-header='true']"))
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
          expression: buildHistoryDetailNoClipExpression(),
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
