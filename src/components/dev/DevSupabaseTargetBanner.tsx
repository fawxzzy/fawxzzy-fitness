import { getSupabaseTargetDiagnostic } from "@/lib/dev-supabase-target";

export function DevSupabaseTargetBanner() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const diagnostic = getSupabaseTargetDiagnostic();
  if (diagnostic.matchesExpected) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-[rgb(132,28,28)] px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
      Dev Supabase target mismatch: {diagnostic.host ?? "missing"} / expected {diagnostic.expectedHost}
    </div>
  );
}
