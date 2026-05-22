"use client";

import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ProgressionStatusSurfaceItem } from "@/lib/progression-status-display";

function getReadinessBadgeClassName(readinessState: ProgressionStatusSurfaceItem["readinessState"]) {
  switch (readinessState) {
  case "ready":
    return "border-[rgb(var(--accent-strong)/0.28)] bg-[rgb(var(--accent-strong)/0.12)] text-[rgb(var(--text-primary)/0.98)]";
  case "insufficient_evidence":
    return "border-[rgb(var(--warning-rgb)/0.24)] bg-[rgb(var(--warning-rgb)/0.10)] text-[rgb(var(--warning-rgb)/0.96)]";
  case "manual":
    return "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-3-rgb)/0.28)] text-[rgb(var(--text-secondary)/0.92)]";
  case "not_ready":
    return "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.18)] text-[rgb(var(--text-muted)/0.88)]";
  }
}

export function ProgressionStatusSection({
  items,
}: {
  items: ProgressionStatusSurfaceItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Progress status"
      className="space-y-2 rounded-[1.2rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.22)] px-3 py-3"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.8)]">
          Progress Status
        </p>
        <p className="text-[12px] leading-snug text-[rgb(var(--text-secondary)/0.92)]">
          Why each exercise is ready or not ready, using the same progression rules as auto-promotion.
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.10)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold leading-tight text-[rgb(var(--text)/0.94)]">
                    {item.exerciseName}
                  </p>
                  <p className="text-[12px] font-semibold leading-snug text-[rgb(var(--text-secondary)/0.94)]">
                    {item.currentTargetLine}
                  </p>
                </div>
                {item.progress ? (
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.42)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(71,215,196,0.74),rgba(147,255,226,0.92))] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                        style={{ width: `${Math.max(0, Math.min(100, item.progress.percent))}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted)/0.76)]">
                      {item.progress.percent}% toward the next update
                    </p>
                  </div>
                ) : null}
                <div className={cn(appTokens.metaText, "space-y-0.5 text-[11.5px] leading-snug")}>
                  {item.promotionBasisLabel ? <p>Promotion uses: {item.promotionBasisLabel}</p> : null}
                  {item.promotionBasisDetail ? <p>{item.promotionBasisDetail}</p> : null}
                  {item.repTargetLine ? <p>{item.repTargetLine}</p> : null}
                  <p>{item.latestLine}</p>
                  <p>{item.targetLine}</p>
                  <p>{item.detailLine}</p>
                  {item.nextUpdateLine ? <p>{item.nextUpdateLine}</p> : null}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  getReadinessBadgeClassName(item.readinessState),
                )}
              >
                {item.readinessLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
