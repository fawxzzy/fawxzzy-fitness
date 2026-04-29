"use client";

type ToastTone = "info" | "success" | "warning" | "error";

function resolveToneMeta(tone: ToastTone) {
  if (tone === "success") {
    return {
      shellClassName: "text-emerald-50",
      railClassName: "bg-[linear-gradient(180deg,rgba(110,231,183,0.98),rgba(16,185,129,0.62))]",
      actionClassName:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/16",
      closeClassName: "text-emerald-100/72 hover:bg-emerald-400/14 hover:text-emerald-50",
    };
  }

  if (tone === "warning") {
    return {
      shellClassName: "text-amber-50",
      railClassName: "bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(217,119,6,0.62))]",
      actionClassName:
        "border-amber-300/20 bg-amber-300/10 text-amber-50 hover:bg-amber-300/16",
      closeClassName: "text-amber-100/72 hover:bg-amber-300/14 hover:text-amber-50",
    };
  }

  if (tone === "error") {
    return {
      shellClassName: "text-rose-50",
      railClassName: "bg-[linear-gradient(180deg,rgba(251,113,133,0.98),rgba(225,29,72,0.64))]",
      actionClassName:
        "border-rose-300/20 bg-rose-400/10 text-rose-50 hover:bg-rose-400/16",
      closeClassName: "text-rose-100/72 hover:bg-rose-400/14 hover:text-rose-50",
    };
  }

  return {
    shellClassName: "text-[rgb(var(--text)/0.98)]",
    railClassName: "bg-[linear-gradient(180deg,rgba(var(--accent),0.98),rgba(var(--accent-strong),0.64))]",
    actionClassName:
      "border-[rgb(var(--accent)/0.18)] bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--text)/0.98)] hover:bg-[rgb(var(--accent)/0.16)]",
    closeClassName:
      "text-[rgb(var(--text-secondary)/0.8)] hover:bg-[rgb(var(--accent)/0.14)] hover:text-[rgb(var(--text)/0.98)]",
  };
}

export function ToastMessageCard({
  tone,
  message,
  action,
  onAction,
  onDismiss,
  isExiting = false,
}: {
  tone: ToastTone;
  message: string;
  action?: {
    label: string;
  };
  onAction?: () => void;
  onDismiss?: () => void;
  isExiting?: boolean;
}) {
  const toneMeta = resolveToneMeta(tone);
  const liveRole = tone === "error" ? "alert" : "status";

  return (
    <section
      role={liveRole}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`action-chrome-rail glass-surface glass-sheen pointer-events-auto relative w-full overflow-hidden !rounded-[1rem] [--glass-blur:var(--glass-current-blur-raised)] [--glass-shadow:var(--action-chrome-shell-shadow)] px-4 py-2.5 transition-all duration-300 ${
        isExiting ? "translate-x-8 opacity-0" : "-translate-x-0 opacity-100"
      } ${toneMeta.shellClassName}`}
    >
      <div aria-hidden="true" className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${toneMeta.railClassName}`} />

      <div className="relative pl-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2.5">
              <p className="min-w-0 flex-1 text-[0.9rem] font-medium leading-5 text-inherit text-white/92">
                {message}
              </p>

              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss message"
                className={`inline-flex h-7 w-7 shrink-0 self-center items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-rgb)/0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)] transition-colors ${toneMeta.closeClassName}`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
                  <path
                    d="M6 6 14 14M14 6 6 14"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>

            {action ? (
              <div className="mt-2 flex justify-start">
                <button
                  type="button"
                  onClick={onAction}
                  className={`inline-flex min-h-8 items-center rounded-full border px-3.5 text-[0.74rem] font-semibold tracking-[0.02em] transition-colors ${toneMeta.actionClassName}`}
                >
                  {action.label}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
