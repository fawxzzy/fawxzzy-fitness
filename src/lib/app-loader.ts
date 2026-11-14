/**
 * The one app loader: the Fitness app image centred on the dark shell colour with a soft ring, used by the boot cover
 * (server-rendered, so it paints before any script) and by every route wait. This module is the pure timeline the
 * client host (src/components/AppLoaderHost.tsx) follows. It mirrors Mazer's src/render/appLoader.ts API and constants;
 * the shared numbers are written down in docs/design-system/LOADER-SPEC.md and pinned by app-loader.contract.test.ts.
 *
 *   - no pop: the loader fades IN (200 ms) and OUT (300 ms) instead of mounting and unmounting at full opacity; the
 *     exit is a crossfade into the first real frame;
 *   - no flash: nothing shows until a wait has lasted LOADER_SHOW_DELAY_MS, and once shown it holds for at least
 *     LOADER_MIN_HOLD_MS before the exit starts, so a fast load never blinks the loader on and off;
 *   - no jump: a wait that ends mid fade-in just finishes the hold, and a new wait during a fade-out turns the fade
 *     around from the CURRENT opacity, so opacity is continuous in every case;
 *   - no stutter: the pose is four numbers, applied with opacity and transforms only.
 *
 * Reduced motion: both fades become the one 200 ms crossfade, the icon holds still and the ring is a still halo; the
 * delay and hold are unchanged because they are timing policy, not movement.
 *
 * Pure: no React, DOM, randomness or wall-clock dependency; the caller passes the time.
 */

/** A wait shorter than this never shows the loader. */
export const LOADER_SHOW_DELAY_MS = 150;
/** Once shown, the loader stays at least this long (from the first fade-in frame) before it starts to leave. */
export const LOADER_MIN_HOLD_MS = 350;
export const LOADER_FADE_IN_MS = 200;
export const LOADER_FADE_OUT_MS = 300;
/** Reduced motion: both fades are this one crossfade. */
export const LOADER_REDUCED_CROSSFADE_MS = 200;
/** The ring and icon breathe once per beat. */
export const LOADER_PULSE_PERIOD_MS = 1200;

/** Icon size: 30% of the short side, clamped. */
export const LOADER_ICON_SIZE_RATIO = 0.3;
export const LOADER_ICON_MIN_PX = 88;
export const LOADER_ICON_MAX_PX = 150;
/** Peak icon scale on the beat (movement; dropped under reduced motion). */
export const LOADER_ICON_PULSE_SCALE = 0.03;
/** The ring starts at the icon edge and grows by this much while it fades out over one beat. */
export const LOADER_RING_GROWTH = 0.22;
export const LOADER_RING_PEAK_ALPHA = 0.5;
/** Reduced motion: the ring is a still halo, slightly outside the icon. */
export const LOADER_RING_REDUCED_SCALE = 1.08;
export const LOADER_RING_REDUCED_ALPHA = 0.28;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const LOADER_EASING = Object.freeze({
  smoothstep: (t: number): number => {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  },
  easeOutCubic: (t: number): number => 1 - (1 - clamp01(t)) ** 3,
  sineInOut: (t: number): number => 0.5 * (1 - Math.cos(Math.PI * clamp01(t))),
});

export function resolveLoaderIconSizePx(viewportWidth: number, viewportHeight: number): number {
  const shortSide = Math.min(viewportWidth, viewportHeight);
  if (!Number.isFinite(shortSide) || shortSide <= 0) {
    return LOADER_ICON_MIN_PX;
  }
  return Math.round(Math.min(LOADER_ICON_MAX_PX, Math.max(LOADER_ICON_MIN_PX, shortSide * LOADER_ICON_SIZE_RATIO)));
}

export function resolveLoaderFadeMs(direction: "in" | "out", reducedMotion: boolean): number {
  if (reducedMotion) {
    return LOADER_REDUCED_CROSSFADE_MS;
  }
  return direction === "in" ? LOADER_FADE_IN_MS : LOADER_FADE_OUT_MS;
}

export type LoaderPhase = "idle" | "waiting" | "fading-in" | "holding" | "fading-out";

export type LoaderMachine = {
  readonly phase: LoaderPhase;
  /** When the current phase began (ms on the caller's clock). */
  readonly phaseStartMs: number;
  /** Opacity at the start of the current phase: a fade starts from here, so opacity is continuous. */
  readonly phaseStartAlpha: number;
  /** When the loader first became visible in this showing: the minimum hold counts from here. */
  readonly shownAtMs: number;
};

export type LoaderFrame = {
  readonly machine: LoaderMachine;
  /** 0..1 opacity of the whole loader (backdrop, icon and ring). */
  readonly alpha: number;
  /** True while anything should be drawn at all. */
  readonly visible: boolean;
};

export function createLoaderMachine(): LoaderMachine {
  return { phase: "idle", phaseStartMs: 0, phaseStartAlpha: 0, shownAtMs: 0 };
}

export type StepLoaderOptions = {
  /**
   * A cover that must be fully opaque from this frame because something else (the server-rendered boot cover) is
   * already showing the same loader: starts at full opacity with the minimum hold already served. Only read when the
   * machine is idle and the wait is active.
   */
  readonly instant?: boolean;
  /** With `instant`: how much of the minimum hold is still owed (see resolveBootCoverExitDelayMs). Default 0. */
  readonly holdRemainingMs?: number;
};

function fadeProgress(nowMs: number, startMs: number, durationMs: number): number {
  return durationMs <= 0 ? 1 : clamp01((nowMs - startMs) / durationMs);
}

/**
 * Advances the loader one frame. `active` is "something is currently being waited on". Deterministic in
 * (machine, active, nowMs, reducedMotion, options). A clock that goes backwards is treated as no time passing.
 */
export function stepLoader(
  machine: LoaderMachine,
  active: boolean,
  nowMs: number,
  reducedMotion: boolean,
  options: StepLoaderOptions = {},
): LoaderFrame {
  const now = Number.isFinite(nowMs) ? Math.max(nowMs, machine.phaseStartMs) : machine.phaseStartMs;
  let current = machine;

  // At most two transitions can chain in one frame (waiting -> fading-in, holding -> fading-out), so a short bounded
  // loop keeps the machine total without recursion.
  for (let guard = 0; guard < 3; guard += 1) {
    const next = advance(current, active, now, reducedMotion, options);
    if (next === current) {
      break;
    }
    current = next;
  }

  const alpha = alphaOf(current, now, reducedMotion);
  return { machine: current, alpha, visible: current.phase !== "idle" && current.phase !== "waiting" && alpha > 0 };
}

function advance(
  machine: LoaderMachine,
  active: boolean,
  now: number,
  reducedMotion: boolean,
  options: StepLoaderOptions,
): LoaderMachine {
  switch (machine.phase) {
    case "idle":
      if (!active) {
        return machine;
      }
      if (options.instant === true) {
        const owed = Math.min(LOADER_MIN_HOLD_MS, Math.max(0, options.holdRemainingMs ?? 0));
        return { phase: "holding", phaseStartMs: now, phaseStartAlpha: 1, shownAtMs: now - LOADER_MIN_HOLD_MS + owed };
      }
      return { phase: "waiting", phaseStartMs: now, phaseStartAlpha: 0, shownAtMs: 0 };
    case "waiting":
      if (!active) {
        return { phase: "idle", phaseStartMs: now, phaseStartAlpha: 0, shownAtMs: 0 };
      }
      if (now - machine.phaseStartMs >= LOADER_SHOW_DELAY_MS) {
        return { phase: "fading-in", phaseStartMs: now, phaseStartAlpha: 0, shownAtMs: now };
      }
      return machine;
    case "fading-in":
      if (fadeProgress(now, machine.phaseStartMs, resolveLoaderFadeMs("in", reducedMotion)) >= 1) {
        return { phase: "holding", phaseStartMs: now, phaseStartAlpha: 1, shownAtMs: machine.shownAtMs };
      }
      return machine;
    case "holding":
      if (!active && now - machine.shownAtMs >= LOADER_MIN_HOLD_MS) {
        return { phase: "fading-out", phaseStartMs: now, phaseStartAlpha: 1, shownAtMs: machine.shownAtMs };
      }
      return machine;
    case "fading-out":
      if (active) {
        // A new wait while leaving: turn around from where the opacity is NOW (no pop back to full or to zero).
        return {
          phase: "fading-in",
          phaseStartMs: now,
          phaseStartAlpha: alphaOf(machine, now, reducedMotion),
          shownAtMs: now,
        };
      }
      if (fadeProgress(now, machine.phaseStartMs, resolveLoaderFadeMs("out", reducedMotion)) >= 1) {
        return { phase: "idle", phaseStartMs: now, phaseStartAlpha: 0, shownAtMs: 0 };
      }
      return machine;
  }
}

function alphaOf(machine: LoaderMachine, now: number, reducedMotion: boolean): number {
  switch (machine.phase) {
    case "idle":
    case "waiting":
      return 0;
    case "holding":
      return 1;
    case "fading-in": {
      const eased = LOADER_EASING.smoothstep(fadeProgress(now, machine.phaseStartMs, resolveLoaderFadeMs("in", reducedMotion)));
      return clamp01(machine.phaseStartAlpha + (1 - machine.phaseStartAlpha) * eased);
    }
    case "fading-out": {
      const eased = LOADER_EASING.smoothstep(fadeProgress(now, machine.phaseStartMs, resolveLoaderFadeMs("out", reducedMotion)));
      return clamp01(machine.phaseStartAlpha * (1 - eased));
    }
  }
}

export type LoaderPose = {
  /** Opacity of the dark backdrop that covers the screen (the crossfade into the first real frame). */
  readonly backdropAlpha: number;
  readonly iconAlpha: number;
  readonly iconScale: number;
  readonly ringAlpha: number;
  /** Ring scale relative to the icon edge (1 = on the edge). */
  readonly ringScale: number;
};

/**
 * The pose for one frame. `pulseTimeMs` is time since the loader first showed (so the first ring always starts at the
 * icon edge). Under reduced motion nothing moves: no icon pulse, a still halo ring. The CSS in globals.css
 * (.app-loader) applies the same numbers with keyframes so the pulse runs on the compositor; this function is the
 * written-down definition those keyframes are pinned against.
 */
export function resolveLoaderPose(alpha: number, pulseTimeMs: number, reducedMotion: boolean): LoaderPose {
  const a = clamp01(alpha);
  if (reducedMotion || !Number.isFinite(pulseTimeMs)) {
    return {
      backdropAlpha: a,
      iconAlpha: a,
      iconScale: 1,
      ringAlpha: a * LOADER_RING_REDUCED_ALPHA,
      ringScale: LOADER_RING_REDUCED_SCALE,
    };
  }
  const raw = (pulseTimeMs / LOADER_PULSE_PERIOD_MS) % 1;
  const phase = raw < 0 ? raw + 1 : raw;
  const breath = LOADER_EASING.sineInOut(phase < 0.5 ? phase * 2 : (1 - phase) * 2);
  return {
    backdropAlpha: a,
    iconAlpha: a,
    iconScale: 1 + LOADER_ICON_PULSE_SCALE * breath,
    ringAlpha: a * LOADER_RING_PEAK_ALPHA * (1 - LOADER_EASING.easeOutCubic(phase)),
    ringScale: 1 + LOADER_RING_GROWTH * LOADER_EASING.easeOutCubic(phase),
  };
}

/**
 * The boot cover side. The cover's stage fades in by CSS (delay LOADER_SHOW_DELAY_MS, length LOADER_FADE_IN_MS) so it
 * paints before any script, and the only decision left to script is the exit: given how long that animation has run
 * (`elapsedMs`, the CSS animation's currentTime, delay included), how many ms of the minimum hold are still owed.
 * Never shown yet (still inside the delay) or unknown: 0, leave at once. Shown: the rest of the minimum hold.
 */
export function resolveBootCoverExitDelayMs(elapsedMs: number | null): number {
  if (elapsedMs === null || !Number.isFinite(elapsedMs) || elapsedMs < LOADER_SHOW_DELAY_MS) {
    return 0;
  }
  return Math.max(0, LOADER_SHOW_DELAY_MS + LOADER_MIN_HOLD_MS - elapsedMs);
}
