import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardNoticeTone = "neutral" | "attention" | "danger";

const toneClassNames: Record<CardNoticeTone, { shell: string; glyph: string | null }> = {
  neutral: {
    shell: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)]",
    glyph: null,
  },
  attention: {
    shell: "border-[rgb(var(--warning-rgb)/0.3)] bg-[rgb(var(--warning-rgb)/0.1)]",
    glyph: "!",
  },
  danger: {
    shell: "border-[rgb(var(--danger-rgb)/0.34)] bg-[rgb(var(--danger-rgb)/0.1)]",
    glyph: "!",
  },
};

/**
 * Inline notice for a screen ("Start session requires a live connection", a load error). Not a card in a list:
 * one rounded surface on the theme radius, plain 14px text, a polite status announcement (an alert for `danger`).
 * Colour is never the only signal: attention and danger carry a "!" glyph and the message is plain text.
 */
export function CardNotice({
  tone = "neutral",
  children,
  className,
}: {
  tone?: CardNoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const resolved = toneClassNames[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      data-card-notice={tone}
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-[var(--card-radius)] border px-4 py-3 text-left text-sm leading-snug text-[rgb(var(--text-primary)/0.96)]",
        resolved.shell,
        className,
      )}
    >
      {resolved.glyph ? (
        <span
          aria-hidden="true"
          className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold leading-none"
        >
          {resolved.glyph}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
