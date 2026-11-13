"use client";

import { useState, type ReactNode } from "react";
import {
  SessionExerciseRowCard,
  SessionFinishedCard,
  SessionHiddenRowCard,
  SessionQuickLogRow,
  SessionRowActionButton,
  SessionRowNote,
  buildSessionFinishedFacts,
} from "@/components/session/SessionRowCards";
import { SessionExerciseFeedbackPrompt } from "@/components/session/SessionExerciseFeedbackPrompt";
import { TodayExerciseRows, type TodayExerciseRow } from "@/app/today/TodayExerciseRows";
import { cardTokens } from "@/components/ui/card-system";

const squat = { name: "Back Squat", slug: "back-squat" };
const noopRowContract = {
  label: "Log: 5 reps | 225 lbs",
  skipLabel: "Skip",
  skipActionIntent: "toggleInactive" as const,
  isQuickLogDisabled: false,
  isSkipDisabled: false,
  quickLogDisabledMessage: "Unskip to log",
  isSkipPending: false,
  isQuickLogPending: false,
};

function quickLogRow(overrides: Partial<typeof noopRowContract> = {}, logAllCount = 3) {
  return (
    <SessionQuickLogRow exerciseName="Back Squat" logAllCount={logAllCount} rowContract={{ ...noopRowContract, ...overrides }} onSkip={() => {}} onPress={() => {}} />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]">{title}</p>
      <ul className={cardTokens.list}>{children}</ul>
    </section>
  );
}

const offlineRows: TodayExerciseRow[] = [
  { id: "o1", exerciseId: "ex-1", name: "Walking Lunge", targets: "4 sets • 8-10 reps • 35 lbs", primary_muscle: "Glutes", movement_pattern: "Lunge", loggedSetCount: 2, targetSetsMin: 4, targetSetsMax: 4 },
  { id: "o2", exerciseId: "ex-2", name: "Pull-Up", targets: "4 sets • 6 reps", primary_muscle: "Back", movement_pattern: "Vertical Pull", loggedSetCount: 4, targetSetsMin: 4, targetSetsMax: 4 },
  { id: "o3", exerciseId: "ex-3", name: "Plank", targets: null, loggedSetCount: 0, isSkipped: true },
];

export function SessionCardsGallery() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="grid gap-6" data-dev-session-cards="true">
      <h1 className="m-0 text-xl font-semibold">Session cards</h1>
      <Section title="Exercise row, collapsed, in progress (tap the header to open)">
        <li>
          <SessionExerciseRowCard
            itemId="g1"
            exercise={squat}
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
            metaItems={["Quads", "Squat"]}
            targetValues={["4 sets", "5 reps", "225 lbs"]}
            progressionLabel="AUTO · SESSION"
            progress={{ label: "1 / 4 sets", percent: 25 }}
            status={null}
            tone="logged"
            showMedia
            infoLabel="Open exercise info for Back Squat"
            onOpenInfo={() => {}}
            panel={<p className="m-0 text-sm">Set logger panel (stub in this gallery)</p>}
            footer={(
              <>
                <SessionRowNote>Observed rest 1:40</SessionRowNote>
                {quickLogRow()}
              </>
            )}
          />
        </li>
      </Section>
      <Section title="Exercise row, done, feedback prompt pending (44px effort and signal buttons)">
        <li>
          <SessionExerciseRowCard
            itemId="g2"
            exercise={{ name: "Pull-Up", slug: "pull-up" }}
            expanded={false}
            onToggle={() => {}}
            metaItems={["Back", "Vertical Pull"]}
            targetValues={["4 sets", "6 reps"]}
            progress={{ label: "4 / 4 sets", percent: 100, tone: "complete" }}
            status="done"
            tone="completed"
            showMedia
            infoLabel="Open exercise info for Pull-Up"
            onOpenInfo={() => {}}
            footer={(
              <>
                <SessionExerciseFeedbackPrompt
                  sessionId="dev"
                  sessionExerciseId="g2"
                  initialFeedback={{ signal: null, note: null, effort: null }}
                  updateFeedbackAction={() => new Promise(() => {})}
                  onSaved={() => {}}
                />
                {quickLogRow({ label: "Log" }, 0)}
              </>
            )}
          />
        </li>
      </Section>
      <Section title="Exercise row, added today, long name, no target, quick log pending">
        <li>
          <SessionExerciseRowCard
            itemId="g3"
            exercise={{ name: "Single-Arm Dumbbell Overhead Press With Tempo Pause", slug: "none" }}
            expanded={false}
            onToggle={() => {}}
            metaItems={["Shoulders", "Vertical Push"]}
            targetValues={[]}
            progress={null}
            status="added"
            tone="current"
            showMedia
            infoLabel="Open exercise info for Single-Arm Dumbbell Overhead Press With Tempo Pause"
            onOpenInfo={() => {}}
            footer={quickLogRow({ isQuickLogPending: true }, 0)}
          />
        </li>
      </Section>
      <Section title="Hidden rows (skipped, and finished then hidden)">
        <li>
          <SessionHiddenRowCard
            exercise={{ name: "Plank", slug: "plank" }}
            status="skipped"
            progress={{ label: "1 / 3 sets", percent: 33 }}
            action={<SessionRowActionButton intent="toggle" label="Unskip" ariaLabel="Unskip: Plank" inactive={false} onPress={() => {}} />}
          />
        </li>
        <li>
          <SessionHiddenRowCard
            exercise={{ name: "Hip Thrust", slug: "hip-thrust" }}
            status="done"
            progress={{ label: "3 / 3 sets", percent: 100, tone: "complete" }}
            action={<SessionRowActionButton intent="neutral" label="Unhide" ariaLabel="Unhide: Hip Thrust" inactive={false} onPress={() => {}} />}
          />
        </li>
      </Section>
      <Section title="Finish screen">
        <li>
          <SessionFinishedCard facts={buildSessionFinishedFacts({ exercises: [{ loggedSetCount: 4, isSkipped: false }, { loggedSetCount: 3, isSkipped: false }, { loggedSetCount: 0, isSkipped: true }], durationSeconds: 3120 })} />
        </li>
      </Section>
      <section className="grid gap-2">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]">Offline session list (shared Today rows)</p>
        <TodayExerciseRows exercises={offlineRows} emptyMessage="No exercises in this session." surface="current-session" />
      </section>
    </div>
  );
}
