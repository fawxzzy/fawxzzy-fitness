import { getSupabaseTargetDiagnostic } from "@/lib/dev-supabase-target";

export const dynamic = "force-dynamic";

function EnvRow({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">{label}</p>
      <p className={tone === "warn" ? "mt-1 break-all text-sm font-semibold text-[rgb(255,174,88)]" : tone === "ok" ? "mt-1 break-all text-sm font-semibold text-[rgb(var(--success-rgb)/0.95)]" : "mt-1 break-all text-sm text-[rgb(var(--text-primary)/0.96)]"}>
        {value}
      </p>
    </div>
  );
}

export default function DevEnvPage() {
  const supabase = getSupabaseTargetDiagnostic();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "not set";

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-app))] px-4 py-8 text-[rgb(var(--text-primary))]">
      <section className="mx-auto max-w-[720px] space-y-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Dev Diagnostics</p>
          <h1 className="mt-1 text-xl font-semibold">Fitness Environment</h1>
        </div>
        <EnvRow label="Supabase Host" value={supabase.host ?? "missing or invalid"} tone={supabase.matchesExpected ? "ok" : "warn"} />
        <EnvRow label="Expected Supabase Host" value={supabase.expectedHost} />
        <EnvRow label="App URL" value={appUrl} />
        <EnvRow label="Node Env" value={process.env.NODE_ENV ?? "unknown"} />
        <EnvRow label="Port" value={process.env.PORT ?? "Next dev selected port"} />
      </section>
    </main>
  );
}
