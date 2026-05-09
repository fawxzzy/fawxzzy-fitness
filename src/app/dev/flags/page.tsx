import { listFeatureFlagDiagnostics } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

function FlagRow({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "enabled" | "disabled";
}) {
  return (
    <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">{label}</p>
          <p className="mt-1 break-all text-xs text-[rgb(var(--text-secondary)/0.95)]">{caption}</p>
        </div>
        <p className={tone === "enabled" ? "shrink-0 text-sm font-semibold text-[rgb(var(--success-rgb)/0.95)]" : "shrink-0 text-sm font-semibold text-[rgb(var(--text-muted)/0.84)]"}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DevFlagsPage() {
  const flags = listFeatureFlagDiagnostics();

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-app))] px-4 py-8 text-[rgb(var(--text-primary))]">
      <section className="mx-auto max-w-[720px] space-y-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Dev Diagnostics</p>
          <h1 className="mt-1 text-xl font-semibold">Feature Flags</h1>
          <p className="mx-auto mt-2 max-w-[34rem] text-xs leading-5 text-[rgb(var(--text-secondary)/0.9)]">
            Deterministic local/env flags only. Values shown here do not expose secrets.
          </p>
        </div>

        <div className="space-y-2">
          {flags.map((flag) => (
            <FlagRow
              key={flag.name}
              label={flag.label}
              value={flag.value ? "Enabled" : "Disabled"}
              tone={flag.value ? "enabled" : "disabled"}
              caption={`${flag.envVar} · source ${flag.source} · default ${flag.defaultValue ? "on" : "off"} · ${flag.description}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
