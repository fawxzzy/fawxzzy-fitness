import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import {
  CURATED_CREATE_FAILED_MESSAGE,
  CURATED_DISABLED_MESSAGE,
  CURATED_PLAN_CHANGED_MESSAGE,
  CURATED_UNAVAILABLE_MESSAGE,
} from "@/features/curated-onboarding/copy";
import {
  CuratedOnboardingShell,
  type CuratedPreviewHandoff,
} from "@/features/curated-onboarding/components/CuratedOnboardingShell";
import type { CuratedWorkoutPlan } from "@/features/curated-onboarding/engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const PREVIEW_PLAN: CuratedWorkoutPlan = {
  version: 1,
  planId: "dev-preview-plan",
  name: "Upper / Lower",
  rationale: ["3 days a week", "45 minute sessions", "Dumbbells and bodyweight"],
  adjustments: [
    { kind: "exercise-swapped", dayName: "Lower A", from: "Barbell Back Squat", to: "Goblet Squat", cause: "avoided-equipment", reason: "Swapped Barbell Back Squat for Goblet Squat because you have dumbbells only." },
  ],
  daysPerWeek: 3,
  sessionLengthMinutes: 45,
  progressionPlaybookId: "double_progression",
  days: [
    {
      name: "Upper A",
      exercises: [
        { slug: "dumbbell-bench-press", name: "Dumbbell Bench Press", measurementType: "reps", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, progressionPlaybookId: "double_progression" },
        { slug: "one-arm-dumbbell-row", name: "One-Arm Dumbbell Row", measurementType: "reps", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, progressionPlaybookId: "double_progression" },
        { slug: "plank", name: "Plank", measurementType: "time", targetSets: 2, targetRepsMin: 1, targetRepsMax: 1, targetDurationSeconds: 60, progressionPlaybookId: "double_progression" },
      ],
    },
    {
      name: "Lower A",
      exercises: [
        { slug: "goblet-squat", name: "Goblet Squat", measurementType: "reps", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, progressionPlaybookId: "double_progression" },
        { slug: "romanian-deadlift", name: "Dumbbell Romanian Deadlift", measurementType: "reps", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, progressionPlaybookId: "double_progression" },
      ],
    },
  ],
};

// `?handoff=<state>` opens the shell on the generation hand-off page with a fixed outcome (QA fixture; nothing is
// generated or created). Unknown values are ignored and the normal first page opens.
const PREVIEW_HANDOFFS: Record<string, CuratedPreviewHandoff> = {
  ready: { status: "ready", plan: PREVIEW_PLAN, failure: null, notice: null },
  notice: { status: "ready", plan: PREVIEW_PLAN, failure: null, notice: CURATED_PLAN_CHANGED_MESSAGE },
  "create-failed": { status: "ready", plan: PREVIEW_PLAN, failure: null, notice: CURATED_CREATE_FAILED_MESSAGE },
  working: { status: "queued", plan: null, failure: null, notice: null },
  retry: { status: "failed", plan: null, failure: { code: "unavailable", message: CURATED_UNAVAILABLE_MESSAGE }, notice: null },
  failed: { status: "failed", plan: null, failure: { code: "no-safe-plan", message: "We could not build a safe routine from these answers. Edit your setup, or build a routine manually." }, notice: null },
  blocked: { status: "failed", plan: null, failure: { code: "safety-clearance-required", message: "" }, notice: null },
  disabled: { status: "failed", plan: null, failure: { code: "feature-disabled", message: CURATED_DISABLED_MESSAGE }, notice: null },
};

// Props are read only after the dev guard (src/lib/dev-page-guard-runtime.test.ts passes props that throw on access).
export default async function DevCuratedOnboardingPage(props: { searchParams?: Promise<{ handoff?: string }> } = {}) {
  await assertDevPageAvailable();
  const handoffKey = (await props.searchParams)?.handoff;
  const previewHandoff = handoffKey ? PREVIEW_HANDOFFS[handoffKey] : undefined;

  const isReviewPreviewEnabled = process.env.HISTORY_QA_PREVIEW_ENABLED === "1";
  if (process.env.NODE_ENV === "production" && !isReviewPreviewEnabled) {
    notFound();
  }

  return (
    <CuratedOnboardingShell
      userId="mobile-regression-curated-onboarding"
      userEmail="curated.qa@example.invalid"
      userName="Curated QA"
      requestedDraftId={null}
      previewOnly
      previewHandoff={previewHandoff}
    />
  );
}
