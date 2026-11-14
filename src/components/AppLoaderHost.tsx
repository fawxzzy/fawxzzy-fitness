"use client";

import { useEffect, useRef } from "react";
import {
  LOADER_SHOW_DELAY_MS,
  LOADER_WAIT_CEILING_MS,
  createLoaderMachine,
  isBootFailsafeFired,
  resolveBootCoverExitDelayMs,
  stepLoader,
  type LoaderFrame,
  type LoaderMachine,
} from "@/lib/app-loader";
import { APP_LOADER_ICON_DATA_URI, APP_LOADER_ICON_PX } from "@/lib/app-loader-icon";
import {
  getLiveLoaderWaitCount,
  getLiveLoaderWaitLabel,
  subscribeLoaderWaits,
  takeStaleLoaderWaits,
} from "@/lib/app-loader-controller";

export const APP_LOADER_STAGE_ANIMATION = "app-loader-stage-in";
export const APP_LOADER_FAILSAFE_ANIMATION = "app-loader-boot-failsafe";
export const APP_LOADER_MAIN_ID = "app-main";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function readAnimationTimeMs(element: HTMLElement | null, animationName: string): number | null {
  const animations = element?.getAnimations?.() ?? [];
  const match = animations.find((animation) => (animation as CSSAnimation).animationName === animationName);
  const time = match?.currentTime;
  return typeof time === "number" ? time : null;
}

/**
 * The one loader overlay, mounted once in the root layout (outside every Suspense boundary).
 *
 * Boot: the markup is server-rendered with `data-state="boot"`, so the opaque page colour covers the first paint and
 * the icon stage fades in by CSS after the show delay, before any script runs. After hydration the host takes over:
 * it waits out whatever is left of the minimum hold, then crossfades the cover out. If the CSS failsafe
 * (LOADER_BOOT_FAILSAFE_MS) already removed the cover before hydration arrived, the host settles straight to hidden:
 * it never brings the cover back to fade it out again.
 *
 * Route waits: every <RouteLoading> registers in the controller; this host steps the pure timeline in
 * src/lib/app-loader.ts once per frame (only while it is not idle) and writes the opacity of the root. A wait older
 * than LOADER_WAIT_CEILING_MS stops counting (and is logged), so a gate that never resolves cannot pin the cover.
 * The ring and breath are CSS keyframes (compositor only). The loader never hides the app chrome: it is opaque and
 * sits above it. While it is up and not leaving it takes the taps (CSS, data-visible / data-leaving); it takes no
 * focus and does not make anything inert, so focus inside the page survives.
 *
 * The polite status region is written only while the loader is actually showing (a wait that never shows is never
 * announced); the server renders it empty.
 */
export function AppLoaderHost() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const stage = stageRef.current;
    const status = statusRef.current;
    const main = document.getElementById(APP_LOADER_MAIN_ID);
    const media = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    let reducedMotion = media?.matches ?? false;
    const onMediaChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    media?.addEventListener?.("change", onMediaChange);

    let machine: LoaderMachine = createLoaderMachine();
    let frameId = 0;
    let lastBusy: boolean | null = null;
    let lastLeaving: boolean | null = null;
    let lastAnnounced = "";
    let stageHidden = false;
    // Set once if a frame throws: the loader is then off for the rest of the page's life (the cover must never stay).
    let failed = false;
    // Whether the first frame must continue from the opaque server-rendered cover (false once it is already gone).
    let continueFromCover = true;

    const setAnnounced = (text: string) => {
      if (status && text !== lastAnnounced) {
        lastAnnounced = text;
        status.textContent = text;
      }
    };

    const settleHidden = () => {
      setAnnounced("");
      root.dataset.state = "live";
      root.dataset.visible = "false";
      root.dataset.leaving = "false";
      root.style.opacity = "0";
      stage?.style.removeProperty("opacity");
      stage?.style.removeProperty("animation");
    };

    // Hydration is marked HERE, not in a frame: a hidden tab never runs frames, and the CSS failsafe is keyed on it.
    // If the failsafe already hid the cover (hydration arrived late), settle to hidden in this same task so removing
    // the failsafe animation cannot bring the opaque cover back.
    const failsafeFired =
      isBootFailsafeFired(readAnimationTimeMs(root, APP_LOADER_FAILSAFE_ANIMATION))
      || getComputedStyle(root).visibility === "hidden";
    root.dataset.hydrated = "true";
    if (failsafeFired) {
      continueFromCover = false;
      settleHidden();
    }

    const apply = (frame: LoaderFrame, active: boolean, label: string) => {
      const { phase } = frame.machine;
      if (!stageHidden && phase === "fading-out" && root.dataset.state === "boot") {
        // The cover starts to leave. If its icon never got past the show delay (the load beat it), keep the icon from
        // fading in while the cover fades out: a load shorter than the delay never shows the loader.
        const elapsed = readAnimationTimeMs(stage, APP_LOADER_STAGE_ANIMATION);
        if (elapsed === null || elapsed < LOADER_SHOW_DELAY_MS) {
          if (stage) {
            stage.style.animation = "none";
            stage.style.opacity = "0";
          }
          stageHidden = true;
        }
      }

      // Announce only what the member can see: not during the show delay, and during boot only once the icon showed.
      const iconSeen =
        root.dataset.state !== "boot" || (readAnimationTimeMs(stage, APP_LOADER_STAGE_ANIMATION) ?? 0) >= LOADER_SHOW_DELAY_MS;
      // Set while it shows; cleared only once the loader is gone. A fade-out that turns around into the same wait keeps
      // the text, so the same label is not announced twice.
      if (active && frame.visible && iconSeen) {
        setAnnounced(label);
      } else if (phase === "idle" || phase === "waiting") {
        setAnnounced("");
      }

      if (phase === "idle") {
        // Boot is over: from here the stage is plain (no CSS fade-in) and the root is hidden until the next wait.
        root.dataset.state = "live";
        stage?.style.removeProperty("opacity");
        stage?.style.removeProperty("animation");
      }
      const leaving = phase === "fading-out";
      if (leaving !== lastLeaving) {
        lastLeaving = leaving;
        root.dataset.leaving = leaving ? "true" : "false";
      }
      root.dataset.visible = frame.visible ? "true" : "false";
      root.style.opacity = String(frame.alpha);
      if (active !== lastBusy) {
        lastBusy = active;
        main?.setAttribute("aria-busy", active ? "true" : "false");
      }
    };

    const run = (now: number) => {
      frameId = 0;
      if (failed) {
        return;
      }
      try {
        step(now);
      } catch (error) {
        // After data-hydrated="true" the CSS failsafe is off, so a throw here would leave an opaque, tap-blocking
        // cover until reload. Hide it, stop driving it, and say so once.
        failed = true;
        settleHidden();
        console.error("[app-loader] a frame failed; the loader is switched off for this page", error);
      }
    };

    const step = (now: number) => {
      for (const stale of takeStaleLoaderWaits(now, LOADER_WAIT_CEILING_MS)) {
        console.warn("[app-loader] a wait outlived the ceiling and no longer holds the loader", {
          label: stale.label,
          ageMs: stale.ageMs,
          ceilingMs: LOADER_WAIT_CEILING_MS,
          route: window.location.pathname,
        });
      }

      const active = getLiveLoaderWaitCount(now, LOADER_WAIT_CEILING_MS) > 0;
      const label = getLiveLoaderWaitLabel(now, LOADER_WAIT_CEILING_MS);

      if (continueFromCover) {
        continueFromCover = false;
        // The server-rendered cover is already on screen and opaque: continue from it instead of fading it in.
        const holdRemainingMs = resolveBootCoverExitDelayMs(readAnimationTimeMs(stage, APP_LOADER_STAGE_ANIMATION));
        machine = stepLoader(machine, true, now, reducedMotion, { instant: true, holdRemainingMs }).machine;
      }

      const frame = stepLoader(machine, active, now, reducedMotion);
      machine = frame.machine;
      apply(frame, active, label);

      if (machine.phase !== "idle") {
        frameId = window.requestAnimationFrame(run);
      }
    };

    const schedule = () => {
      if (!failed && frameId === 0) {
        frameId = window.requestAnimationFrame(run);
      }
    };

    const unsubscribe = subscribeLoaderWaits(schedule);
    // First step on the next frame, not now: sibling effects (the <RouteLoading> of the first screen) register in
    // this same commit, after this effect, and the boot exit must see them.
    schedule();

    return () => {
      unsubscribe();
      media?.removeEventListener?.("change", onMediaChange);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      // Nothing drives the cover any more, and the CSS failsafe has been off since hydration: never leave it standing.
      if (continueFromCover) {
        // No frame ever ran (development Strict Mode unmounts between its double mount): hand the untouched cover back
        // to the CSS failsafe, so a real unmount here still cannot pin it, and the next mount continues from it.
        root.dataset.hydrated = "false";
      } else if (!(root.dataset.state === "live" && root.dataset.visible === "false")) {
        settleHidden();
      }
      main?.removeAttribute("aria-busy");
    };
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        id="app-loader"
        className="app-loader"
        data-app-loader=""
        data-state="boot"
        data-visible="true"
        data-hydrated="false"
        aria-hidden="true"
      >
        <div ref={stageRef} className="app-loader__stage" data-app-loader-stage="">
          <span className="app-loader__ring" />
          {/* An inline data URI with its size reserved: no request, no pop-in, no layout jump. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="app-loader__icon"
            alt=""
            width={APP_LOADER_ICON_PX}
            height={APP_LOADER_ICON_PX}
            decoding="sync"
            src={APP_LOADER_ICON_DATA_URI}
          />
        </div>
      </div>
      {/* Empty on the server and until the loader is actually showing; written by the host above. */}
      <div ref={statusRef} role="status" aria-live="polite" className="sr-only" data-app-loader-status="" />
    </>
  );
}
