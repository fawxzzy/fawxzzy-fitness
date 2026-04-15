import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

export function RouteLoading({
  label = "Loading...",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <section className="pointer-events-none fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-0 motion-reduce:opacity-100 motion-reduce:[animation:none] [animation:route-loader-overlay-in_180ms_ease_120ms_forwards] bg-[linear-gradient(180deg,rgba(6,10,18,0.06)_0%,rgba(6,10,18,0.12)_100%)] backdrop-blur-[2px]"
      />
      <div className="absolute inset-x-0 top-[max(18vh,6.5rem)] flex justify-center px-4">
        <div
          className="flex translate-y-2 scale-[0.985] flex-col items-center gap-3 rounded-[1.4rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.72)] px-6 py-5 text-center opacity-0 shadow-[0_20px_44px_rgba(0,0,0,0.24)] backdrop-blur-[10px] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:[animation:none] [animation:route-loader-card-in_220ms_cubic-bezier(0.22,1,0.36,1)_120ms_forwards]"
          role="status"
          aria-live="polite"
        >
          <FawxzzySigilLoader size="md" />
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent)/0.92)]">Fawxzzy</p>
            <p className="text-sm text-slate-200">{label}</p>
            {detail ? <p className="text-xs leading-5 text-slate-400">{detail}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
