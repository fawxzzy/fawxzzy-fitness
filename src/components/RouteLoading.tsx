import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

export function RouteLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <section className="flex min-h-[40vh] items-center justify-center px-4">
      <div
        className="flex flex-col items-center gap-3 rounded-[1.4rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.74)] px-6 py-5 text-center shadow-[0_20px_44px_rgba(0,0,0,0.28)]"
        role="status"
        aria-live="polite"
      >
        <FawxzzySigilLoader size="md" />
        <div className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent)/0.92)]">Fawxzzy</p>
          <p className="text-sm text-slate-300">{label}</p>
        </div>
      </div>
    </section>
  );
}
