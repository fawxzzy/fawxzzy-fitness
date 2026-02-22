export function RouteLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <section className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-300" role="status" aria-live="polite">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        {label}
      </div>
    </section>
  );
}
