"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  LOADER_SHOW_DELAY_MS,
  createLoaderMachine,
  resolveBootCoverExitDelayMs,
  stepLoader,
  type LoaderFrame,
  type LoaderMachine,
} from "@/lib/app-loader";
import { APP_LOADER_ICON_DATA_URI, APP_LOADER_ICON_PX } from "@/lib/app-loader-icon";
import { getLoaderWaitCount, getLoaderWaitLabel, subscribeLoaderWaits } from "@/lib/app-loader-controller";

/** The server-rendered boot cover announces this until a <RouteLoading> says something more specific. */
export const APP_LOADER_BOOT_LABEL = "Opening Fitness";
export const APP_LOADER_STAGE_ANIMATION = "app-loader-stage-in";
export const APP_LOADER_MAIN_ID = "app-main";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function readStageElapsedMs(stage: HTMLElement | null): number | null {
  const animations = stage?.getAnimations?.() ?? [];
  const fadeIn = animations.find((animation) => (animation as CSSAnimation).animationName === APP_LOADER_STAGE_ANIMATION);
  const time = fadeIn?.currentTime;
  return typeof time === "number" ? time : null;
}

/**
 * The one loader overlay, mounted once in the root layout (outside every Suspense boundary).
 *
 * Boot: the markup is server-rendered with `data-state="boot"`, so the opaque shell colour covers the first paint and
 * the icon stage fades in by CSS after the show delay, before any script runs. After hydration the host takes over:
 * it waits out whatever is left of the minimum hold, then crossfades the cover out.
 *
 * Route waits: every <RouteLoading> registers in the controller; this host steps the pure timeline in
 * src/lib/app-loader.ts once per frame (only while it is not idle) and writes one value, the opacity of the root.
 * The ring and breath are CSS keyframes (compositor only). The loader never hides the app chrome: it is opaque and
 * sits above it, so chrome and loader fade together. It takes no pointer events and no focus.
 */
export function AppLoaderHost() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const statusLabel = useSyncExternalStore(subscribeLoaderWaits, getLoaderWaitLabel, () => APP_LOADER_BOOT_LABEL);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const main = document.getElementById(APP_LOADER_MAIN_ID);
    const media = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    let reducedMotion = media?.matches ?? false;
    const onMediaChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    media?.addEventListener?.("change", onMediaChange);

    let machine: LoaderMachine = createLoaderMachine();
    let booted = false;
    let frameId = 0;
    let lastBusy: boolean | null = null;

    let stageHidden = false;

    const apply = (frame: LoaderFrame, active: boolean) => {
      const idle = frame.machine.phase === "idle";
      if (!stageHidden && frame.machine.phase === "fading-out" && root.dataset.state === "boot") {
        // The cover starts to leave. If its icon never got past the show delay (the load beat it), keep the icon from
        // fading in while the cover fades out: a load shorter than the delay never shows the loader.
        const elapsed = readStageElapsedMs(stageRef.current);
        if (elapsed === null || elapsed < LOADER_SHOW_DELAY_MS) {
          const stage = stageRef.current;
          if (stage) {
            stage.style.animation = "none";
            stage.style.opacity = "0";
          }
          stageHidden = true;
        }
      }
      if (idle) {
        // Boot is over: from here the stage is plain (no CSS fade-in) and the root is hidden until the next wait.
        root.dataset.state = "live";
        stageRef.current?.style.removeProperty("opacity");
        stageRef.current?.style.removeProperty("animation");
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
      const active = getLoaderWaitCount() > 0;

      if (!booted) {
        booted = true;
        root.dataset.hydrated = "true";
        // The server-rendered cover is already on screen and opaque: continue from it instead of fading it in.
        const holdRemainingMs = resolveBootCoverExitDelayMs(readStageElapsedMs(stageRef.current));
        machine = stepLoader(machine, true, now, reducedMotion, { instant: true, holdRemainingMs }).machine;
      }

      const frame = stepLoader(machine, active, now, reducedMotion);
      machine = frame.machine;
      apply(frame, active);

      if (machine.phase !== "idle") {
        frameId = window.requestAnimationFrame(run);
      }
    };

    const schedule = () => {
      if (frameId === 0) {
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
      <div role="status" aria-live="polite" className="sr-only" data-app-loader-status="">
        {statusLabel}
      </div>
    </>
  );
}
