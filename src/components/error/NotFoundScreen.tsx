import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { ERROR_COPY } from "@/components/error/errorCopy";

// Server-safe: no auth call, no data fetch, no request data. /today is the right
// home for both states: signed-in users land there, signed-out users are sent to sign in.
export function NotFoundScreen() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[rgb(var(--bg))] p-4">
      <SurfaceCard className="w-full max-w-sm space-y-4 text-center" role="alert">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
          Fitness
        </p>
        <h1 className="text-base font-semibold text-[rgb(var(--text-primary))]">{ERROR_COPY.notFoundTitle}</h1>
        <p className="text-sm text-[rgb(var(--text-secondary))]">{ERROR_COPY.notFoundBody}</p>
        <Link
          href={ERROR_COPY.notFoundHref}
          className={getAppButtonClassName({ variant: "primary", fullWidth: true, className: "inline-flex items-center justify-center" })}
        >
          {ERROR_COPY.notFoundAction}
        </Link>
      </SurfaceCard>
    </main>
  );
}
