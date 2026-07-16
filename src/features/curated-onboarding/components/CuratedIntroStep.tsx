import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function CuratedIntroStep() {
  return (
    <div className="space-y-3">
      <CuratedInfoCard tone="accent" compact>
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Built from your setup. Editable before saving.</p>
      </CuratedInfoCard>

      <CuratedInfoCard compact>
        <SignatureInlineList
          separator="pipe"
          items={["Goal", "Schedule", "Equipment", "Preferences"]}
          className="justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.94)]"
        />
      </CuratedInfoCard>
    </div>
  );
}
