"use client";

import { HIT_AREA_CLASS_NAME } from "@/components/ui/hitArea";

type ToastTone = "info" | "success" | "warning" | "error";

function resolveToneMeta(tone: ToastTone) {
  if (tone === "success") {
    return {
      shellClassName: "text-[rgb(var(--text-primary)/0.96)]",
  railClassName: "bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.98),rgb(var(--success-rgb)/0.52))]",
      actionClassName:
        "border-[rgb(var(--success-rgb)/0.22)] bg-[rgb(var(--success-rgb)/0.12)] text-[rgb(var(--text-primary)/0.96)] hover:bg-[rgb(var(--success-rgb)/0.18)]",
      closeClassName: "text-[rgb(var(--success-rgb)/0.74)] hover:bg-[rgb(var(--success-rgb)/0.14)] hover:text-[rgb(var(--text-primary)/0.96)]",
    };
  }

  if (tone === "warning") {
    return {
      shellClassName: "text-[rgb(var(--text-primary)/0.96)]",
  railClassName: "bg-[linear-gradient(180deg,rgb(var(--warning-rgb)/0.98),rgb(var(--warning-rgb)/0.54))]",
      actionClassName:
        "border-[rgb(var(--warning-rgb)/0.22)] bg-[rgb(var(--warning-rgb)/0.12)] text-[rgb(var(--text-primary)/0.96)] hover:bg-[rgb(var(--warning-rgb)/0.18)]",
      closeClassName: "text-[rgb(var(--warning-rgb)/0.78)] hover:bg-[rgb(var(--warning-rgb)/0.14)] hover:text-[rgb(var(--text-primary)/0.96)]",
    };
  }

  if (tone === "error") {
    return {
      shellClassName: "text-[rgb(var(--text-primary)/0.96)]",
      railClassName: "bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.98),rgb(var(--danger-rgb)/0.6))]",
      actionClassName:
        "border-[rgb(var(--danger-rgb)/0.22)] bg-[rgb(var(--danger-rgb)/0.12)] text-[rgb(var(--text-primary)/0.96)] hover:bg-[rgb(var(--danger-rgb)/0.18)]",
      closeClassName: "text-[rgb(var(--danger-rgb)/0.82)] hover:bg-[rgb(var(--danger-rgb)/0.14)] hover:text-[rgb(var(--text-primary)/0.96)]",
    };
  }

  return {
    shellClassName: "text-[rgb(var(--text)/0.98)]",
    railClassName: "bg-[linear-gradient(180deg,rgb(var(--accent)/0.98),rgb(var(--accent-strong)/0.64))]",
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

  // Shared floating notice (DESIGN-CONTRACT C16): the box shrink-wraps its message up to the notice stack width, so a
  // short message sits right-anchored on one line and a long one grows left before it wraps. The text owns every
  // pixel between the rail and the dismiss control (no nested wrappers or extra inner padding). Padding is `!` because
  // the unlayered `.action-chrome-rail` padding (0.18rem) otherwise beats layered utilities; the opaque surface colour
  // under the rail's 0.96 gradient stops card titles behind the notice from showing through its text.
  return (
    <section
      role={liveRole}
      aria-live={tone === "error" ? "assertive" : "polite"}
      data-app-notice={tone}
      className={`action-chrome-rail glass-surface glass-sheen pointer-events-auto relative max-w-full overflow-hidden !rounded-[1rem] [--glass-blur:var(--glass-current-blur-raised)] [--glass-shadow:var(--action-chrome-shell-shadow)] !bg-[rgb(var(--surface))] !py-1.5 !pl-4 !pr-1.5 transition-all duration-300 ${
        isExiting ? "translate-x-8 opacity-0" : "-translate-x-0 opacity-100"
      } ${toneMeta.shellClassName}`}
    >
      <div aria-hidden="true" className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${toneMeta.railClassName}`} />

      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 py-1 text-left text-[0.9rem] font-medium leading-5 text-inherit [overflow-wrap:anywhere]">
          {message}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          data-toast-dismiss=""
          // A real 44x44 box (the card is overflow-hidden, which clipped the old ::before hit layer to the card edge);
          // the visible 28px circle sits inside it, and -my-1.5 keeps the card height unchanged.
          className={`group -my-1.5 inline-flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-full !border-0 !bg-transparent !shadow-none focus-visible:outline-none ${toneMeta.closeClassName} hover:!bg-transparent`}
        >
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-rgb)/0.16)] backdrop-blur-[14px] transition-colors [-webkit-backdrop-filter:blur(14px)] group-hover:bg-[rgb(var(--surface-rgb)/0.3)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--button-focus-ring)]"
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
          </span>
        </button>
      </div>

      {action ? (
        <div className="mb-1 mt-1 flex justify-start">
          <button
            type="button"
            onClick={onAction}
            className={`${HIT_AREA_CLASS_NAME} inline-flex min-h-8 items-center rounded-full border px-3.5 text-[0.74rem] font-semibold tracking-[0.02em] transition-colors ${toneMeta.actionClassName}`}
          >
            {action.label}
          </button>
        </div>
      ) : null}
    </section>
  );
}
