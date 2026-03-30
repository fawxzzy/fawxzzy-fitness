"use client";

import { useMemo } from "react";
import { useInstallContext } from "@/hooks/useInstallContext";

type InstallGuidanceProps = {
  mode?: "inline" | "gate";
};

function getPlatformLabel() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  if (/android/.test(userAgent)) {
    return "android";
  }

  return null;
}

export function InstallGuidance({ mode = "inline" }: InstallGuidanceProps) {
  const { isBrowserMode, isDismissed, dismiss } = useInstallContext();
  const platform = useMemo(() => getPlatformLabel(), []);

  if (!isBrowserMode || isDismissed) {
    return null;
  }

  return (
    <section className="glass-surface glass-sheen space-y-4 rounded-[1.25rem] border border-accent/25 px-5 py-5 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent/90">Install-first tip</p>
        <h2 className="text-lg font-semibold text-white">This works best as an installed app.</h2>
        <p className="text-sm leading-6 text-slate-200">
          You can still log in here, but installing gives you a more app-like home-screen launch, cleaner full-screen layout, and fewer browser distractions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-sm font-semibold text-white">Android · Chrome</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
            <li>Open the browser menu.</li>
            <li>Tap <span className="font-medium text-slate-100">Install app</span> or <span className="font-medium text-slate-100">Add to Home screen</span>.</li>
            <li>Confirm, then reopen from your home screen.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
          <p className="text-sm font-semibold text-white">iPhone · Safari</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
            <li>Tap the <span className="font-medium text-slate-100">Share</span> button.</li>
            <li>Choose <span className="font-medium text-slate-100">Add to Home Screen</span>.</li>
            <li>Open the app from your home screen after adding it.</li>
          </ol>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Continue in browser
        </button>
        {mode === "inline" ? (
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5"
            aria-label="Dismiss install guidance"
          >
            Not now
          </button>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-slate-400">
        {platform === "android"
          ? "You’re on Android, so Chrome’s install app prompt is the fastest path."
          : platform === "ios"
            ? "You’re on iPhone/iPad, so Safari’s Add to Home Screen flow is the right path."
            : "If you opened this from a browser, install it first when you can, then continue with email links, password recovery, or sign-in as needed."}
      </p>
    </section>
  );
}
