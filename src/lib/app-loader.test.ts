import assert from "node:assert/strict";
import test from "node:test";
import {
  LOADER_FADE_IN_MS,
  LOADER_FADE_OUT_MS,
  LOADER_ICON_MAX_PX,
  LOADER_ICON_MIN_PX,
  LOADER_MIN_HOLD_MS,
  LOADER_REDUCED_CROSSFADE_MS,
  LOADER_RING_REDUCED_ALPHA,
  LOADER_RING_REDUCED_SCALE,
  LOADER_SHOW_DELAY_MS,
  createLoaderMachine,
  resolveBootCoverExitDelayMs,
  resolveLoaderFadeMs,
  resolveLoaderIconSizePx,
  resolveLoaderPose,
  stepLoader,
  type LoaderMachine,
  type StepLoaderOptions,
} from "@/lib/app-loader";

type Sample = { t: number; alpha: number; visible: boolean; phase: string };

/** Runs the machine at a fixed frame step; `activeAt(t)` says whether a wait is open at time t. */
function simulate(
  activeAt: (t: number) => boolean,
  endMs: number,
  stepMs: number,
  options: { reducedMotion?: boolean; first?: StepLoaderOptions; machine?: LoaderMachine } = {},
): Sample[] {
  let machine = options.machine ?? createLoaderMachine();
  const samples: Sample[] = [];
  for (let t = 0; t <= endMs; t += stepMs) {
    const frame = stepLoader(machine, activeAt(t), t, options.reducedMotion ?? false, t === 0 ? options.first : undefined);
    machine = frame.machine;
    samples.push({ t, alpha: frame.alpha, visible: frame.visible, phase: machine.phase });
  }
  return samples;
}

const firstVisible = (samples: Sample[]) => samples.find((sample) => sample.alpha > 0);
const firstFull = (samples: Sample[]) => samples.find((sample) => sample.alpha >= 1);

test("a wait shorter than the show delay never shows the loader", () => {
  for (const stepMs of [8, 16]) {
    const samples = simulate((t) => t < LOADER_SHOW_DELAY_MS - stepMs, 1200, stepMs);
    assert.equal(samples.every((sample) => sample.alpha === 0 && !sample.visible), true, `step ${stepMs}`);
  }
});

test("a wait longer than the show delay fades in over 200 ms starting at 150 ms", () => {
  for (const stepMs of [8, 16]) {
    const samples = simulate((t) => t < 2000, 600, stepMs);
    const shown = firstVisible(samples);
    assert.ok(shown, "the loader shows");
    assert.ok(shown.t >= LOADER_SHOW_DELAY_MS && shown.t <= LOADER_SHOW_DELAY_MS + stepMs * 2, `shows at ${shown.t}`);
    const full = firstFull(samples);
    assert.ok(full, "reaches full opacity");
    assert.ok(Math.abs(full.t - (LOADER_SHOW_DELAY_MS + LOADER_FADE_IN_MS)) <= stepMs * 2, `full at ${full.t}`);
  }
});

test("once shown it holds at least 350 ms from the first visible frame, then fades out over 300 ms", () => {
  for (const stepMs of [8, 16]) {
    // The wait ends 20 ms after the loader became visible.
    const endsAt = LOADER_SHOW_DELAY_MS + 20;
    const samples = simulate((t) => t < endsAt, 1500, stepMs);
    const shown = firstVisible(samples);
    assert.ok(shown);
    const fadeOutStart = samples.find((sample) => sample.phase === "fading-out");
    assert.ok(fadeOutStart, "fade-out starts");
    assert.ok(fadeOutStart.t - shown.t >= LOADER_MIN_HOLD_MS - stepMs, `held ${fadeOutStart.t - shown.t} ms`);
    assert.ok(fadeOutStart.t - shown.t <= LOADER_MIN_HOLD_MS + stepMs * 2);
    const gone = samples.find((sample) => sample.t > fadeOutStart.t && sample.alpha === 0);
    assert.ok(gone);
    assert.ok(Math.abs(gone.t - fadeOutStart.t - LOADER_FADE_OUT_MS) <= stepMs * 2, `faded out in ${gone.t - fadeOutStart.t}`);
  }
});

test("opacity is continuous in every case (no step larger than one frame of the fade)", () => {
  const scenarios: Array<[string, (t: number) => boolean]> = [
    ["long wait", (t) => t < 1500],
    ["wait that ends mid fade-in", (t) => t < 250],
    ["wait that ends in the hold", (t) => t < 400],
    ["wait that returns during the fade-out", (t) => t < 500 || (t >= 700 && t < 1500)],
    ["two waits back to back", (t) => t < 400 || (t >= 1200 && t < 2000)],
  ];
  for (const stepMs of [8, 16]) {
    // Worst case: smoothstep slope 1.5 per fade length, plus one frame of slack.
    const maxStep = (1.5 * stepMs) / Math.min(LOADER_FADE_IN_MS, LOADER_FADE_OUT_MS) + 0.001;
    for (const [name, activeAt] of scenarios) {
      const samples = simulate(activeAt, 3000, stepMs);
      for (let index = 1; index < samples.length; index += 1) {
        const delta = Math.abs(samples[index].alpha - samples[index - 1].alpha);
        assert.ok(delta <= maxStep, `${name} @${stepMs}ms: jump ${delta.toFixed(3)} at t=${samples[index].t}`);
      }
    }
  }
});

test("a new wait during the fade-out turns around from the current opacity instead of popping", () => {
  const stepMs = 8;
  const samples = simulate((t) => t < 500 || (t >= 700 && t < 1500), 2000, stepMs);
  const during = samples.filter((sample) => sample.t >= 690 && sample.t <= 720);
  assert.ok(during.every((sample) => sample.alpha > 0.1 && sample.alpha < 1), "mid-fade values, no pop to 0 or 1");
  const turned = samples.find((sample) => sample.t >= 700 && sample.phase === "fading-in");
  assert.ok(turned);
  const before = samples[samples.indexOf(turned) - 1];
  assert.ok(Math.abs(turned.alpha - before.alpha) < 0.06);
});

test("an idle machine with no wait stays idle and invisible", () => {
  const samples = simulate(() => false, 1000, 16);
  assert.equal(samples.every((sample) => sample.phase === "idle" && sample.alpha === 0 && !sample.visible), true);
});

test("reduced motion: both fades are the 200 ms crossfade; delay and hold are unchanged", () => {
  assert.equal(resolveLoaderFadeMs("in", true), LOADER_REDUCED_CROSSFADE_MS);
  assert.equal(resolveLoaderFadeMs("out", true), LOADER_REDUCED_CROSSFADE_MS);
  assert.equal(resolveLoaderFadeMs("in", false), LOADER_FADE_IN_MS);
  assert.equal(resolveLoaderFadeMs("out", false), LOADER_FADE_OUT_MS);

  const stepMs = 8;
  const samples = simulate((t) => t < 200, 1500, stepMs, { reducedMotion: true });
  const shown = firstVisible(samples);
  assert.ok(shown && shown.t >= LOADER_SHOW_DELAY_MS, "delay unchanged");
  const full = firstFull(samples);
  assert.ok(full && Math.abs(full.t - shown.t - LOADER_REDUCED_CROSSFADE_MS) <= stepMs * 2);
  const fadeOutStart = samples.find((sample) => sample.phase === "fading-out");
  assert.ok(fadeOutStart && fadeOutStart.t - shown.t >= LOADER_MIN_HOLD_MS - stepMs, "hold unchanged");
  const gone = samples.find((sample) => sample.t > fadeOutStart.t && sample.alpha === 0);
  assert.ok(gone && Math.abs(gone.t - fadeOutStart.t - LOADER_REDUCED_CROSSFADE_MS) <= stepMs * 2);
});

test("the boot cover continues from full opacity and serves the rest of the hold", () => {
  // The host calls the first step with active=true. The cover is already painted and opaque, so the machine starts in
  // the hold with the minimum hold served and leaves on the first frame the wait is over.
  let machine = createLoaderMachine();
  machine = stepLoader(machine, true, 1000, false, { instant: true }).machine;
  assert.equal(machine.phase, "holding");
  const frame = stepLoader(machine, false, 1000, false);
  assert.equal(frame.machine.phase, "fading-out");
  assert.equal(frame.alpha, 1);

  // Stage shown 100 ms ago: 250 ms of the hold are still owed.
  let owed = createLoaderMachine();
  owed = stepLoader(owed, true, 2000, false, { instant: true, holdRemainingMs: 250 }).machine;
  assert.equal(stepLoader(owed, false, 2200, false).machine.phase, "holding");
  assert.equal(stepLoader(owed, false, 2250, false).machine.phase, "fading-out");
});

test("boot cover exit delay: never shown leaves at once, shown waits out the rest of the hold", () => {
  assert.equal(resolveBootCoverExitDelayMs(null), 0);
  assert.equal(resolveBootCoverExitDelayMs(Number.NaN), 0);
  assert.equal(resolveBootCoverExitDelayMs(0), 0);
  assert.equal(resolveBootCoverExitDelayMs(LOADER_SHOW_DELAY_MS - 1), 0);
  assert.equal(resolveBootCoverExitDelayMs(LOADER_SHOW_DELAY_MS), LOADER_MIN_HOLD_MS);
  assert.equal(resolveBootCoverExitDelayMs(300), LOADER_SHOW_DELAY_MS + LOADER_MIN_HOLD_MS - 300);
  assert.equal(resolveBootCoverExitDelayMs(LOADER_SHOW_DELAY_MS + LOADER_MIN_HOLD_MS), 0);
  assert.equal(resolveBootCoverExitDelayMs(5000), 0);
});

test("a clock that goes backwards or a non-finite time is treated as no time passing", () => {
  let machine = createLoaderMachine();
  machine = stepLoader(machine, true, 100, false).machine;
  const backwards = stepLoader(machine, true, 50, false);
  assert.equal(backwards.machine.phase, "waiting");
  const nan = stepLoader(machine, true, Number.NaN, false);
  assert.equal(nan.machine.phase, "waiting");
});

test("icon size is 30% of the short side, clamped to 88..150", () => {
  assert.equal(resolveLoaderIconSizePx(390, 844), 117);
  assert.equal(resolveLoaderIconSizePx(844, 390), 117);
  assert.equal(resolveLoaderIconSizePx(320, 568), 96);
  assert.equal(resolveLoaderIconSizePx(200, 200), LOADER_ICON_MIN_PX);
  assert.equal(resolveLoaderIconSizePx(1200, 900), LOADER_ICON_MAX_PX);
  assert.equal(resolveLoaderIconSizePx(0, 800), LOADER_ICON_MIN_PX);
  assert.equal(resolveLoaderIconSizePx(Number.NaN, 800), LOADER_ICON_MIN_PX);
});

test("the pose breathes 3 percent and grows the ring 22 percent once per 1200 ms beat", () => {
  const start = resolveLoaderPose(1, 0, false);
  assert.equal(start.iconScale, 1);
  assert.equal(start.ringScale, 1);
  assert.equal(start.ringAlpha, 0.5);

  const half = resolveLoaderPose(1, 600, false);
  assert.ok(Math.abs(half.iconScale - 1.03) < 1e-9, "icon peaks at 1.03 mid-beat");

  const late = resolveLoaderPose(1, 1199, false);
  assert.ok(late.ringScale > 1.2 && late.ringScale <= 1.22);
  assert.ok(late.ringAlpha < 0.001);

  const nextBeat = resolveLoaderPose(1, 1200, false);
  assert.equal(nextBeat.ringScale, 1, "the ring restarts at the icon edge");

  const faded = resolveLoaderPose(0.5, 0, false);
  assert.equal(faded.ringAlpha, 0.25);
  assert.equal(faded.backdropAlpha, 0.5);
});

test("reduced motion pose: no icon breath, a still halo", () => {
  for (const time of [0, 300, 600, 900]) {
    const pose = resolveLoaderPose(1, time, true);
    assert.equal(pose.iconScale, 1);
    assert.equal(pose.ringScale, LOADER_RING_REDUCED_SCALE);
    assert.equal(pose.ringAlpha, LOADER_RING_REDUCED_ALPHA);
  }
});
