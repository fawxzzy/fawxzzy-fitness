import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function ReviewStep({ data }: { data: CuratedOnboardingData }) {
  const sections = getCuratedReviewSections(data);

  return (
    <CuratedInfoCard tone="accent" className="!p-0">
      <dl className="divide-y divide-[rgb(var(--border-strong)/0.16)]">
        {sections.map((section) => (
          <div key={section.title} className="flex items-start justify-between gap-4 px-3.5 py-3 sm:px-4">
            <dt className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.9)]">
              {section.title}
            </dt>
            <dd className="min-w-0 text-right text-xs font-medium leading-5 text-[rgb(var(--text-primary)/0.94)]">
              {section.value}
            </dd>
          </div>
        ))}
      </dl>
    </CuratedInfoCard>
  );
}
