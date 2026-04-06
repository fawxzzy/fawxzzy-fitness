"use client";

import type { ReactNode } from "react";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SessionHeaderCard } from "@/components/ui/workout-entry/SessionHeaderCard";
import { ExerciseCard } from "@/components/ExerciseCard";
import { MeasurementSummary } from "@/components/ui/measurements/MeasurementSummary";
import { FormSectionCard } from "@/components/ui/workout-entry/FormSectionCard";
import { WorkoutEntrySection, WorkoutEntryMetric } from "@/components/ui/workout-entry/EntrySection";
import { CompactLogRow } from "@/components/ui/workout-entry/CompactLogRow";
import { SessionStickyFooter } from "@/components/session/SessionStickyFooter";
import { BottomActionDock, DockButton } from "@/components/layout/BottomActionDock";
import { uiContractFixtures } from "@/lib/dev/uiContractFixtures";

function ContractGroup({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[1.25rem] border border-white/10 bg-[rgb(var(--surface-rgb)/0.36)] p-3">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-[rgb(var(--text)/0.95)]">{title}</h2>
        <p className="text-xs text-[rgb(var(--text)/0.66)]">{note}</p>
      </header>
      {children}
    </section>
  );
}

function WinnerNote({ note }: { note: string }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-emerald-200/80">{note}</p>;
}

export function UiContractAuditSurface() {
  return (
    <div className="space-y-4 pb-6">
      <SessionHeaderCard
        eyebrow="Dev-only"
        title="UI Contract Audit"
        subtitle="Deterministic fixture surface for drift checks"
        footer="Internal inspection screen — not part of production navigation"
      />

      <ContractGroup
        title="Shared headers"
        note="Canonical route-header family examples rendered from shared recipe fixtures."
      >
        <div className="space-y-3">
          {uiContractFixtures.headers.map((header) => (
            <div key={header.id} className="space-y-2">
              <SharedScreenHeader
                recipe={header.recipe}
                eyebrow={header.eyebrow}
                title={header.title}
                subtitle={header.subtitle}
              />
              <WinnerNote note={header.winnerNote} />
            </div>
          ))}
        </div>
      </ContractGroup>

      <ContractGroup
        title="Current Session cards + footer dock"
        note="Exercise-card states and the canonical footer docking treatment side by side."
      >
        <div className="space-y-2.5">
          {uiContractFixtures.currentSessionCards.map((card) => (
            <div key={card.id} className="space-y-1.5">
              <ExerciseCard
                title={card.title}
                subtitle={card.subtitle}
                badgeText={card.badgeText}
                state={card.state}
                variant="interactive"
              />
              <WinnerNote note={card.winnerNote} />
            </div>
          ))}
        </div>
        <SessionStickyFooter className="relative bottom-auto mt-3">
          <BottomActionDock
            left={<DockButton variant="secondary" type="button">Discard</DockButton>}
            right={<DockButton intent="positive" type="button">Log</DockButton>}
          />
        </SessionStickyFooter>
      </ContractGroup>

      <ContractGroup
        title="Exercise Log"
        note="Shared log identity, summary chips, and compact logged-set rows using fixed fixture values."
      >
        <WorkoutEntrySection
          eyebrow="Exercise Log"
          title={uiContractFixtures.exerciseLog.title}
          description={uiContractFixtures.exerciseLog.subtitle}
          aside={<WorkoutEntryMetric label="Set" value="3 / 5" />}
        >
          <MeasurementSummary values={uiContractFixtures.exerciseLog.summary} emptyLabel="No goal" />
          <div className="space-y-2">
            {uiContractFixtures.exerciseLog.loggedSets.map((summary) => (
              <CompactLogRow key={summary} summary={<p className="text-sm text-[rgb(var(--text)/0.88)]">{summary}</p>} />
            ))}
          </div>
        </WorkoutEntrySection>
        <WinnerNote note={uiContractFixtures.exerciseLog.winnerNote} />
      </ContractGroup>

      <ContractGroup
        title="Configure Goal"
        note="Deterministic goal summary for canonical add/edit configuration verification."
      >
        <FormSectionCard>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[rgb(var(--text)/0.95)]">{uiContractFixtures.configureGoal.title}</p>
            <MeasurementSummary values={uiContractFixtures.configureGoal.summary} emptyLabel="No goal" />
          </div>
        </FormSectionCard>
        <WinnerNote note={uiContractFixtures.configureGoal.winnerNote} />
      </ContractGroup>

      <ContractGroup
        title="Edit Day inline editor"
        note="Planned row + inline editor card grouped to preserve single-item ownership."
      >
        <ExerciseCard
          title="Cable Fly"
          subtitle="4 sets • reps + weight"
          badgeText="Editing"
          state="selected"
          variant="interactive"
        />
        <FormSectionCard>
          <div className="space-y-2">
            <p className="text-sm text-[rgb(var(--text)/0.9)]">{uiContractFixtures.editDayInlineEditor.subtitle}</p>
            <MeasurementSummary
              values={{ reps: 12, weight: 35, weightUnit: "lb", durationSeconds: null, distance: null, distanceUnit: "mi", calories: null }}
            />
          </div>
        </FormSectionCard>
        <WinnerNote note={uiContractFixtures.editDayInlineEditor.winnerNote} />
      </ContractGroup>

      <ContractGroup
        title="View Day + rest-day variant + planned workout section variants"
        note="Deterministic planned-row states, including the required rest-day contract."
      >
        <SharedScreenHeader recipe="viewDay" eyebrow="View Day" title={uiContractFixtures.viewDay.title} subtitle={uiContractFixtures.viewDay.subtitle} />
        <div className="space-y-2.5">
          {uiContractFixtures.plannedWorkoutVariants.map((variant) => (
            <div key={variant.id} className="space-y-1.5">
              <ExerciseCard
                title={variant.label}
                subtitle={variant.subtitle}
                badgeText={variant.badgeText}
                state={variant.state}
                variant="interactive"
              />
              <WinnerNote note={variant.winnerNote} />
            </div>
          ))}
        </div>
        <WinnerNote note={uiContractFixtures.viewDay.winnerNote} />
      </ContractGroup>
    </div>
  );
}
