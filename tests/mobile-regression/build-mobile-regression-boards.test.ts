import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

import { mobileRegressionBoardFamilies } from "../../src/features/mobile-regression/fixtures.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const boardBuilderScript = path.join(repoRoot, "scripts", "build-mobile-regression-boards.py");

const expectedBoardHashesByPlatform = {
  win32: {
    "exercise-cards-board.png": "ec65eb1551946c0d6b185b401b3526cf520b0c05503272f5cf65a0765edfa2b7",
    "session-logging-board.png": "9d8e5e748393bcddef04e5b3c64b526245d72dd1b353bb051454960d131a3533",
    "session-summaries-board.png": "08296cee80b03164d17b5c085c0212ba22ccd4190d71b57f50b79661f0c94aac",
    "settings-detail-board.png": "ed890afac37eda4564e3cd845741a443d9e878965a34553902d851daf6af7c6b",
    "mega-board.png": "a1de977b9976087b39271fa32d3ec72f6771530d163bda814a85182a00c3cc1a",
  },
  linux: {
    "exercise-cards-board.png": "0f4703953524c322bd3feb2a6c2a3234a3729c2cb4ebd203acadb2aa1a82f669",
    "session-logging-board.png": "0e895cbf3eb9d6fd2c379ed2d82d9283ff59b4014a50136cb8733f0e59e0fb4f",
    "session-summaries-board.png": "adbff796ee59ec9fd37d46a9c8380a6b1ea4b6d6cf242850df37bc98600490cf",
    "settings-detail-board.png": "789978ad924b00d0cd223904db64c5216a4c876ec41effe90d9478cc3f19acce",
    "mega-board.png": "d623f283a814cc7a2337e545f3f7faa5261b87c7a2fdcdd7101d84593abed64e",
  },
} as const;

const expectedBoardHashes = expectedBoardHashesByPlatform[process.platform as keyof typeof expectedBoardHashesByPlatform]
  ?? expectedBoardHashesByPlatform.linux;

const boardNames = [...mobileRegressionBoardFamilies.map((reviewFamily) => reviewFamily.boardFile), "mega-board.png"];

type ScenarioCapture = {
  width: number;
  file: string;
  imageWidth: number;
  imageHeight: number;
  background: readonly [number, number, number];
  outline: readonly [number, number, number];
  accent: readonly [number, number, number];
};

type ManifestScenarioInput = {
  id: string;
  name: string;
  family: string;
  route: string;
  screen: string;
  fixture: string;
  captures: ReadonlyArray<ScenarioCapture>;
};

const scenarioFixtures = [
  {
    id: "exercise-alpha",
    name: "Exercise Alpha",
    family: "Exercise cards",
    route: "today",
    screen: "today",
    fixture: "default",
    captures: [
      {
        width: 360,
        file: "exercise-alpha-360.png",
        imageWidth: 72,
        imageHeight: 144,
        background: [35, 104, 91],
        outline: [138, 246, 204],
        accent: [244, 114, 182],
      },
      {
        width: 420,
        file: "exercise-alpha-420.png",
        imageWidth: 96,
        imageHeight: 144,
        background: [18, 74, 64],
        outline: [110, 231, 183],
        accent: [250, 204, 21],
      },
    ],
  },
  {
    id: "session-bravo",
    name: "Session Bravo",
    family: "Session / logging",
    route: "session",
    screen: "session",
    fixture: "active",
    captures: [
      {
        width: 360,
        file: "session-bravo-360.png",
        imageWidth: 84,
        imageHeight: 144,
        background: [55, 48, 163],
        outline: [165, 180, 252],
        accent: [248, 113, 113],
      },
      {
        width: 420,
        file: "session-bravo-420.png",
        imageWidth: 108,
        imageHeight: 144,
        background: [49, 46, 129],
        outline: [196, 181, 253],
        accent: [253, 224, 71],
      },
    ],
  },
  {
    id: "summary-charlie",
    name: "Summary Charlie",
    family: "Session summaries",
    route: "historySessions",
    screen: "history-sessions",
    fixture: "extreme",
    captures: [
      {
        width: 360,
        file: "summary-charlie-360.png",
        imageWidth: 76,
        imageHeight: 144,
        background: [127, 29, 29],
        outline: [252, 165, 165],
        accent: [56, 189, 248],
      },
      {
        width: 420,
        file: "summary-charlie-420.png",
        imageWidth: 100,
        imageHeight: 144,
        background: [153, 27, 27],
        outline: [254, 202, 202],
        accent: [190, 242, 100],
      },
    ],
  },
  {
    id: "settings-delta",
    name: "Settings Delta",
    family: "Settings / detail",
    route: "settings",
    screen: "settings",
    fixture: "default",
    captures: [
      {
        width: 360,
        file: "settings-delta-360.png",
        imageWidth: 80,
        imageHeight: 144,
        background: [88, 28, 135],
        outline: [216, 180, 254],
        accent: [251, 191, 36],
      },
      {
        width: 420,
        file: "settings-delta-420.png",
        imageWidth: 104,
        imageHeight: 144,
        background: [107, 33, 168],
        outline: [233, 213, 255],
        accent: [45, 212, 191],
      },
    ],
  },
] as const;

async function runPython(args: string[], options?: { cwd?: string; env?: Partial<NodeJS.ProcessEnv> }) {
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("python", args, {
      cwd: options?.cwd ?? repoRoot,
      env: { ...process.env, ...(options?.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function makeFixtureRoot(t: TestContext) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "mobile-regression-boards-test-"));
  t.after(async () => {
    await rm(fixtureRoot, { recursive: true, force: true });
  });
  return fixtureRoot;
}

function buildManifest(scenarios: ReadonlyArray<ManifestScenarioInput> = scenarioFixtures) {
  return {
    generatedAt: "2026-04-11T00:00:00.000Z",
    baseUrl: "http://127.0.0.1:3000",
    viewportHeight: 852,
    widths: [360, 420],
    reviewFamilies: mobileRegressionBoardFamilies.map((reviewFamily) => ({
      family: reviewFamily.family,
      boardFile: reviewFamily.boardFile,
    })),
    scenarios: scenarios.map(({ captures, ...scenario }) => ({
      ...scenario,
      captures: captures.map(({ width, file }) => ({ width, file })),
    })),
  };
}

async function writeManifest(root: string, manifest: object) {
  await writeFile(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function writeSyntheticCaptures(root: string, scenarios: ReadonlyArray<ManifestScenarioInput> = scenarioFixtures) {
  const capturePayload = scenarios.flatMap((scenario) => scenario.captures);
  const generator = `
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1])
payload = json.loads(sys.argv[2])
for item in payload:
    image = Image.new("RGB", (item["imageWidth"], item["imageHeight"]), tuple(item["background"]))
    draw = ImageDraw.Draw(image)
    draw.rectangle((2, 2, item["imageWidth"] - 3, item["imageHeight"] - 3), outline=tuple(item["outline"]), width=3)
    draw.line((0, 0, item["imageWidth"] - 1, item["imageHeight"] - 1), fill=tuple(item["accent"]), width=5)
    draw.line((0, item["imageHeight"] - 1, item["imageWidth"] - 1, 0), fill=tuple(item["accent"]), width=5)
    draw.rectangle(
        (
            item["imageWidth"] // 4,
            item["imageHeight"] // 4,
            (item["imageWidth"] * 3) // 4,
            (item["imageHeight"] * 3) // 4,
        ),
        outline=tuple(item["accent"]),
        width=3,
    )
    image.save(root / item["file"])
`;

  const result = await runPython(["-c", generator, root, JSON.stringify(capturePayload)]);
  assert.equal(result.code, 0, result.stderr);
}

async function runBoardBuilder(manifestPath: string) {
  return await runPython([boardBuilderScript, manifestPath], {
    env: { MOBILE_REGRESSION_BOARD_FONT: "default" },
  });
}

type VisualCatalogCapture = {
  captureId: string;
  stateId: string;
  family: string;
  registryIndex: number;
  variantIndex: number;
  viewport: { label: string; width: number; height: number };
  requestedRoute: string;
  resolvedRoute: string;
  screenshotPath: string;
  status?: "captured" | "blocked";
};

const visualCatalogCaptures: VisualCatalogCapture[] = [
  {
    captureId: "public-privacy__1280x800",
    stateId: "public:privacy",
    family: "public",
    registryIndex: 2,
    variantIndex: 0,
    viewport: { label: "1280x800", width: 1280, height: 800 },
    requestedRoute: "/privacy",
    resolvedRoute: "/privacy",
    screenshotPath: "captures/public-privacy__1280x800/public-privacy.png",
  },
  {
    captureId: "signed-in-today-default__430x932",
    stateId: "signed-in:today-default",
    family: "signed-in",
    registryIndex: 0,
    variantIndex: 1,
    viewport: { label: "430x932", width: 430, height: 932 },
    requestedRoute: "/dev/mobile-regression?scenario=today-default",
    resolvedRoute: "/dev/mobile-regression?scenario=today-default",
    screenshotPath: "captures/signed-in-today-default__430x932/today-default.png",
  },
  {
    captureId: "signed-in-today-default__390x844",
    stateId: "signed-in:today-default",
    family: "signed-in",
    registryIndex: 0,
    variantIndex: 0,
    viewport: { label: "390x844", width: 390, height: 844 },
    requestedRoute: "/dev/mobile-regression?scenario=today-default",
    resolvedRoute: "/dev/mobile-regression?scenario=today-default",
    screenshotPath: "captures/signed-in-today-default__390x844/today-default.png",
  },
];

async function writeVisualCatalogFixture(
  root: string,
  captures: ReadonlyArray<VisualCatalogCapture> = visualCatalogCaptures,
) {
  const generatorPayload = captures
    .filter((capture, index) => captures.findIndex((candidate) => candidate.screenshotPath === capture.screenshotPath) === index)
    .map((capture, index) => ({
      file: capture.screenshotPath,
      background: [20 + (index * 20), 80, 60],
    }));
  const generator = `
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1])
for index, item in enumerate(json.loads(sys.argv[2])):
    target = root / item["file"]
    target.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (160 + (index * 10), 280), tuple(item["background"]))
    draw = ImageDraw.Draw(image)
    draw.rectangle((8, 8, image.width - 9, image.height - 9), outline=(180, 240, 210), width=4)
    image.save(target)
`;
  const imageResult = await runPython(["-c", generator, root, JSON.stringify(generatorPayload)]);
  assert.equal(imageResult.code, 0, imageResult.stderr);

  const manifestCaptures = await Promise.all(captures.map(async (capture) => ({
    ...capture,
    status: capture.status ?? "captured",
    screenshotPath: path.join(root, capture.screenshotPath),
    screenshotSha256: await sha256ForFile(path.join(root, capture.screenshotPath)),
    captureMode: "viewport",
    fixtureOwner: "test",
    authState: "fixture",
    blockedReason: null,
    receiptPath: null,
    tracePath: null,
  })));
  const manifestPath = path.join(root, "visual-catalog-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify({
    schemaVersion: "fitness-visual-catalog-manifest.v1",
    generatedAt: "2026-07-27T00:00:00.000Z",
    tier: "smoke",
    source: { commit: "a".repeat(40), tree: "b".repeat(40) },
    registry: { version: "fitness-visual-state-registry.v1", digest: "c".repeat(64) },
    environment: { browser: "chromium-or-edge", theme: "dark" },
    outputRoot: root,
    plannedCaptureCount: manifestCaptures.length,
    capturedCount: manifestCaptures.length,
    blockedCount: 0,
    failures: [],
    captures: manifestCaptures,
  }, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function runVisualCatalogBoardBuilder(manifestPath: string) {
  return await runPython([boardBuilderScript, "--visual-catalog", manifestPath]);
}

async function sha256ForFile(filePath: string) {
  const file = await readFile(filePath);
  return createHash("sha256").update(file).digest("hex");
}

test("board builder writes the named board set and preserves the golden board layout", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = path.join(fixtureRoot, "manifest.json");

  await writeManifest(fixtureRoot, buildManifest());
  await writeSyntheticCaptures(fixtureRoot);

  const result = await runBoardBuilder(manifestPath);
  assert.equal(result.code, 0, result.stderr);

  const generatedBoards = (await readdir(fixtureRoot)).filter((entry) => entry.endsWith("-board.png")).sort();
  assert.deepEqual(generatedBoards, [...boardNames].sort());

  const hashes = Object.fromEntries(
    await Promise.all(
      boardNames.map(async (name) => [name, await sha256ForFile(path.join(fixtureRoot, name))] as const),
    ),
  );

  assert.deepEqual(hashes, expectedBoardHashes);
});

test("board builder rejects malformed manifests before rendering", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = path.join(fixtureRoot, "manifest.json");

  await writeManifest(fixtureRoot, {
    generatedAt: "2026-04-11T00:00:00.000Z",
    baseUrl: "http://127.0.0.1:3000",
    viewportHeight: 852,
    widths: [360],
    reviewFamilies: mobileRegressionBoardFamilies.map((reviewFamily) => ({
      family: reviewFamily.family,
      boardFile: reviewFamily.boardFile,
    })),
    scenarios: [
      {
        id: "malformed-one",
        name: "Malformed One",
        route: "today",
        screen: "today",
        fixture: "default",
        captures: [{ width: 360, file: "malformed-one-360.png" }],
      },
    ],
  });

  const result = await runBoardBuilder(manifestPath);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Manifest scenario malformed-one missing required field\(s\): family/);
});

test("board builder rejects malformed review-family output mappings", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = path.join(fixtureRoot, "manifest.json");

  await writeManifest(fixtureRoot, {
    generatedAt: "2026-04-11T00:00:00.000Z",
    baseUrl: "http://127.0.0.1:3000",
    viewportHeight: 852,
    widths: [360, 420],
    reviewFamilies: [{ family: "Exercise cards" }],
    scenarios: buildManifest([scenarioFixtures[0]]).scenarios,
  });
  await writeSyntheticCaptures(fixtureRoot, [scenarioFixtures[0]]);

  const result = await runBoardBuilder(manifestPath);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Manifest review family at index 0 missing required field\(s\): boardFile/);
});

test("board builder rejects unknown review families", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = path.join(fixtureRoot, "manifest.json");
  const badFamilyScenarios = [
    {
      ...scenarioFixtures[0],
      family: "Unmapped family",
    },
  ] as const;

  await writeManifest(fixtureRoot, buildManifest(badFamilyScenarios));
  await writeSyntheticCaptures(fixtureRoot, badFamilyScenarios);

  const result = await runBoardBuilder(manifestPath);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Manifest contains unknown review families: Unmapped family/);
});

test("board builder fails when the manifest references a missing screenshot", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = path.join(fixtureRoot, "manifest.json");

  await writeManifest(fixtureRoot, buildManifest([scenarioFixtures[0]]));

  const result = await runBoardBuilder(manifestPath);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Missing screenshot for board generation/);
});

test("board builder fails fast for a missing manifest path", async () => {
  const manifestPath = path.join(os.tmpdir(), "missing-mobile-regression-manifest.json");
  const result = await runBoardBuilder(manifestPath);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Manifest not found:/);
});

test("visual catalog boards and receipt are deterministic and preserve route labels", async (t) => {
  const fixtureRoot = await makeFixtureRoot(t);
  const manifestPath = await writeVisualCatalogFixture(fixtureRoot);

  const first = await runVisualCatalogBoardBuilder(manifestPath);
  assert.equal(first.code, 0, first.stderr);
  const firstReceipt = JSON.parse(
    await readFile(path.join(fixtureRoot, "boards", "board-receipt.json"), "utf8"),
  );
  const firstHashes = Object.fromEntries(
    firstReceipt.boards.map((board: { family: string; sha256: string }) => [board.family, board.sha256]),
  );

  await rm(path.join(fixtureRoot, "boards"), { recursive: true, force: true });
  const second = await runVisualCatalogBoardBuilder(manifestPath);
  assert.equal(second.code, 0, second.stderr);
  const secondReceipt = JSON.parse(
    await readFile(path.join(fixtureRoot, "boards", "board-receipt.json"), "utf8"),
  );
  const secondHashes = Object.fromEntries(
    secondReceipt.boards.map((board: { family: string; sha256: string }) => [board.family, board.sha256]),
  );

  assert.deepEqual(secondHashes, firstHashes);
  assert.deepEqual(secondReceipt.captureOrder, [
    "signed-in-today-default__390x844",
    "signed-in-today-default__430x932",
    "public-privacy__1280x800",
  ]);
  assert.deepEqual(
    secondReceipt.captures.map((capture: {
      stateId: string;
      viewport: string;
      requestedRoute: string;
      resolvedRoute: string;
    }) => ({
      stateId: capture.stateId,
      viewport: capture.viewport,
      requestedRoute: capture.requestedRoute,
      resolvedRoute: capture.resolvedRoute,
    })),
    [
      {
        stateId: "signed-in:today-default",
        viewport: "390x844",
        requestedRoute: "/dev/mobile-regression?scenario=today-default",
        resolvedRoute: "/dev/mobile-regression?scenario=today-default",
      },
      {
        stateId: "signed-in:today-default",
        viewport: "430x932",
        requestedRoute: "/dev/mobile-regression?scenario=today-default",
        resolvedRoute: "/dev/mobile-regression?scenario=today-default",
      },
      {
        stateId: "public:privacy",
        viewport: "1280x800",
        requestedRoute: "/privacy",
        resolvedRoute: "/privacy",
      },
    ],
  );
});

test("visual catalog board builder rejects duplicate capture identities and paths", async (t) => {
  const duplicateIdRoot = await makeFixtureRoot(t);
  const duplicateId = [
    visualCatalogCaptures[0],
    {
      ...visualCatalogCaptures[1],
      captureId: visualCatalogCaptures[0].captureId,
    },
  ];
  const duplicateIdManifest = await writeVisualCatalogFixture(duplicateIdRoot, duplicateId);
  const duplicateIdResult = await runVisualCatalogBoardBuilder(duplicateIdManifest);
  assert.notEqual(duplicateIdResult.code, 0);
  assert.match(duplicateIdResult.stderr, /Duplicate visual catalog captureId/);

  const duplicatePathRoot = await makeFixtureRoot(t);
  const duplicatePath = [
    visualCatalogCaptures[0],
    {
      ...visualCatalogCaptures[1],
      screenshotPath: visualCatalogCaptures[0].screenshotPath,
    },
  ];
  const duplicatePathManifest = await writeVisualCatalogFixture(duplicatePathRoot, duplicatePath);
  const duplicatePathResult = await runVisualCatalogBoardBuilder(duplicatePathManifest);
  assert.notEqual(duplicatePathResult.code, 0);
  assert.match(duplicatePathResult.stderr, /Duplicate visual catalog screenshot path/);
});

test("visual catalog board builder rejects missing and orphan screenshots", async (t) => {
  const missingRoot = await makeFixtureRoot(t);
  const missingManifest = await writeVisualCatalogFixture(missingRoot);
  await rm(path.join(missingRoot, visualCatalogCaptures[0].screenshotPath));
  const missingResult = await runVisualCatalogBoardBuilder(missingManifest);
  assert.notEqual(missingResult.code, 0);
  assert.match(missingResult.stderr, /Missing visual catalog screenshot/);

  const orphanRoot = await makeFixtureRoot(t);
  const orphanManifest = await writeVisualCatalogFixture(orphanRoot);
  const orphanPath = path.join(orphanRoot, "captures", "orphan", "orphan.png");
  await mkdir(path.dirname(orphanPath), { recursive: true });
  await writeFile(orphanPath, await readFile(path.join(orphanRoot, visualCatalogCaptures[0].screenshotPath)));
  const orphanResult = await runVisualCatalogBoardBuilder(orphanManifest);
  assert.notEqual(orphanResult.code, 0);
  assert.match(orphanResult.stderr, /Orphan visual catalog screenshot/);
});
