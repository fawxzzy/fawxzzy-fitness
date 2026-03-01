import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";

export function AppHeader({
  title,
  subtitleLeft,
  subtitleRight,
  action,
}: {
  title: ReactNode;
  subtitleLeft?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-bold leading-tight text-[rgb(var(--text)/0.98)]">{title}</h2>
        {(subtitleLeft || subtitleRight) ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {subtitleLeft ? <p className={appTokens.mutedText}>{subtitleLeft}</p> : null}
            {subtitleRight ? <p className={appTokens.metaText}>{subtitleRight}</p> : null}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
