import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData } from "../types.ts";

export function ReviewStep({ data }: { data: CuratedOnboardingData }) {
  const sections = getCuratedReviewSections(data);

  return (
    <div className="space-y-3">
      <div className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-4">
        <p className="text-sm font-semibold text-white">This intake becomes the future generator handoff.</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Save it when everything feels accurate. The app will keep the intake and reuse it when the curated engine is ready.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{section.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-100">{section.value}</p>
        </div>
      ))}
    </div>
  );
}
