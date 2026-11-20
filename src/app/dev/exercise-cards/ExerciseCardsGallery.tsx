"use client";

import { useState, type ReactNode } from "react";
import { TodayExerciseCard, type TodayExerciseCardExercise } from "@/app/today/TodayExerciseCard";
import { SessionExerciseRowCard } from "@/components/session/SessionRowCards";
import { PromoteCelebration, type PromoteStatRow } from "@/components/workout/PromoteCelebration";
import { cardTokens } from "@/components/ui/card-system";

/**
 * Dev gallery for the exercise card redesign (CARD-SYSTEM.md section 3.3): goal line, side column (thumbnail top-right,
 * info bottom-right), progression bar at several fills, the Promote seam at 100% and the Promote celebration.
 * Static fixtures only; Promote here is a local stub that opens the celebration, it never calls the server.
 */

const squat: TodayExerciseCardExercise = {
  exerciseId: "11111111-1111-4111-8111-111111111111",
  name: "Back Squat",
  slug: "back-squat",
  targets: "3 sets • 8 reps • 60 kg",
  primary_muscle: "Quads",
  movement_pattern: "Squat",
  equipment: "Barbell",
};

const walk: TodayExerciseCardExercise = {
  exerciseId: "55555555-5555-4555-8555-555555555555",
  name: "Incline Walk",
  slug: "incline-walk",
  targets: "1 set • 18:00 s • 2 km",
  primary_muscle: "Cardio",
  movement_pattern: "Gait",
  equipment: "Treadmill",
  measurement_type: "time_distance",
};

const longName: TodayExerciseCardExercise = {
  exerciseId: "22222222-2222-4222-8222-222222222222",
  name: "Single-Leg Romanian Deadlift with Contralateral Dumbbell Hold",
  slug: "single-leg-romanian-deadlift",
  targets: "4 sets • 10-12 reps • 35 lbs",
  primary_muscle: "Hamstrings",
  movement_pattern: "Hinge",
  equipment: "Dumbbell",
};

const noImage: TodayExerciseCardExercise = {
  exerciseId: "66666666-6666-4666-8666-666666666666",
  name: "Band Pull-Apart",
  slug: null,
  targets: "3 sets • 15 reps",
  primary_muscle: "Upper Back",
  movement_pattern: "Pull",
  equipment: "Band",
};

const plank: TodayExerciseCardExercise = {
  exerciseId: "77777777-7777-4777-8777-777777777777",
  name: "Plank",
  slug: "plank",
  targets: "3 sets • 0:45 s",
  primary_muscle: "Core",
  movement_pattern: "Brace",
  equipment: "Bodyweight",
  measurement_type: "time",
};

const celebrationRows: PromoteStatRow[] = [
  { label: "Sets", from: "3", to: "3" },
  { label: "Reps", from: "8", to: "9" },
  { label: "Weight", from: "60 kg", to: "62.5 kg" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]">{title}</p>
      <ul className={cardTokens.list}>{children}</ul>
    </section>
  );
}

function progression(percent: number, label: string, promote?: () => void) {
  return {
    label: `Progression: ${label}`,
    percent,
    tone: percent >= 100 ? ("complete" as const) : ("default" as const),
    promote: percent >= 100 && promote ? { onPromote: promote } : null,
  };
}

export function ExerciseCardsGallery() {
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const openCelebration = (name: string) => () => setCelebrating(name);

  return (
    <div className="grid gap-6" data-dev-exercise-cards="true">
      <h1 className="m-0 text-xl font-semibold">Exercise cards</h1>

      <Section title="Today: progression bar fill levels">
        <li><TodayExerciseCard exercise={squat} progress={progression(0, "0/4 sessions")} /></li>
        <li><TodayExerciseCard exercise={squat} progress={progression(40, "2/5 sessions")} /></li>
        <li><TodayExerciseCard exercise={squat} progress={progression(75, "3/4 sessions")} /></li>
      </Section>

      <Section title="Today: 100% with the Promote seam (stub opens the celebration)">
        <li data-dev-promote-ready="true"><TodayExerciseCard exercise={squat} progress={progression(100, "Ready", openCelebration(squat.name))} /></li>
        <li><TodayExerciseCard exercise={walk} progress={progression(100, "Ready", openCelebration(walk.name))} /></li>
      </Section>

      <Section title="Today: 100% with no seam wired (production today: no button)">
        <li><TodayExerciseCard exercise={squat} progress={progression(100, "Ready")} /></li>
      </Section>

      <Section title="Today: timed, long name, no image, no progression">
        <li><TodayExerciseCard exercise={walk} /></li>
        <li><TodayExerciseCard exercise={plank} /></li>
        <li><TodayExerciseCard exercise={longName} progress={progression(60, "3/5 sessions")} /></li>
        <li><TodayExerciseCard exercise={noImage} /></li>
        <li><TodayExerciseCard exercise={{ ...noImage, name: "Face Pull", targets: null }} /></li>
      </Section>

      <Section title="Resume screen: completed rows (check mark beside the name)">
        <li><TodayExerciseCard exercise={squat} state="completed" progress={{ label: "3 / 3 sets", percent: 100, tone: "complete" }} /></li>
        <li><TodayExerciseCard exercise={walk} state="completed" progress={{ label: "1 / 1 set", percent: 100, tone: "complete" }} /></li>
        <li><TodayExerciseCard exercise={longName} progress={{ label: "2 / 4 sets", percent: 50 }} /></li>
        <li><TodayExerciseCard exercise={noImage} state="skipped" /></li>
      </Section>

      <Section title="Workout in progress: sets bar (same bar as progression)">
        <li>
          <SessionExerciseRowCard
            itemId="ec-1"
            exercise={{ name: squat.name, slug: squat.slug }}
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
            metaItems={["Quads", "Squat"]}
            targetValues={["3 sets", "8 reps", "60 kg"]}
            progress={{ label: "2 / 3 sets", percent: 67 }}
            status={null}
            tone="logged"
            showMedia
            infoLabel="Open exercise info for Back Squat"
            onOpenInfo={() => {}}
            panel={<p className="m-0 p-3 text-sm text-[rgb(var(--text-secondary)/0.98)]">Set logger goes here.</p>}
          />
        </li>
        <li>
          <SessionExerciseRowCard
            itemId="ec-2"
            exercise={{ name: walk.name, slug: walk.slug }}
            expanded={false}
            onToggle={() => {}}
            metaItems={["Cardio", "Gait"]}
            targetValues={["1 set", "18:00 s", "2 km"]}
            progress={{ label: "1 / 1 set", percent: 100, tone: "complete" }}
            status="done"
            tone="completed"
            showMedia
            infoLabel="Open exercise info for Incline Walk"
            onOpenInfo={() => {}}
          />
        </li>
      </Section>

      <Section title="Promote celebration">
        <li>
          <button
            type="button"
            data-dev-open-celebration="true"
            onClick={openCelebration(squat.name)}
            className="inline-flex min-h-11 items-center rounded-full border border-[rgb(var(--border-strong)/0.2)] px-4 text-sm font-semibold text-[rgb(var(--text-primary))]"
          >
            Open the celebration
          </button>
        </li>
      </Section>

      <PromoteCelebration open={celebrating !== null} exerciseName={celebrating ?? ""} rows={celebrationRows} onClose={() => setCelebrating(null)} />
    </div>
  );
}
