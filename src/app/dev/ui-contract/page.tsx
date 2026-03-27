import { notFound } from "next/navigation";
import { UiContractAuditSurface } from "@/app/dev/ui-contract/UiContractAuditSurface";

export const dynamic = "force-static";

export default function DevUiContractPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="space-y-4 py-4">
      <div className="rounded-[1.1rem] border border-white/10 bg-[rgb(var(--surface-rgb)/0.34)] px-3 py-2.5">
        <p className="text-xs text-[rgb(var(--text)/0.7)]">
          Dev-only route. Use deterministic fixtures to compare repeated families after each refactor. See README guidance in the repo root.
        </p>
      </div>
      <UiContractAuditSurface />
    </div>
  );
}
