import { notFound } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { getExerciseStatsForExercise } from "@/lib/exercise-stats";
import { getExerciseHowToImageSrc, getExerciseMusclesImageSrc, type ExerciseImageSource } from "@/lib/exerciseImages";
import { supabaseServer } from "@/lib/supabase/server";

type PageProps = {
  params: {
    exerciseId: string;
  };
  searchParams?: {
    returnTo?: string;
  };
};

const tagClassName = "rounded-full border border-border bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";


function formatWeightReps(weight: number | null, reps: number | null, unit: string | null) {
  if (weight === null || reps === null) return null;
  const weightLabel = Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
  return `${weightLabel}${unit ? ` ${unit}` : ""} × ${reps}`;
}

function formatShortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}

export default async function ExerciseDetailsPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, exercise_id, slug, name, how_to_short, primary_muscle, movement_pattern, equipment, image_icon_path, image_howto_path, image_muscles_path")
    .eq("id", params.exerciseId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .maybeSingle();

  const fallbackExercise = EXERCISE_OPTIONS.find((exercise) => exercise.id === params.exerciseId);

  if (error || (!data && !fallbackExercise)) {
    notFound();
  }

  const exercise = data
    ? {
        ...data,
        primary_muscles: data.primary_muscle ? [data.primary_muscle] : [],
        secondary_muscles: [] as string[],
        slug: data.slug ?? null,
        image_icon_path: data.image_icon_path ?? null,
        image_muscles_path: data.image_muscles_path ?? null,
      }
    : fallbackExercise
      ? {
          id: fallbackExercise.id,
          name: fallbackExercise.name,
          slug: null,
          how_to_short: fallbackExercise.how_to_short,
          primary_muscles: fallbackExercise.primary_muscle ? [fallbackExercise.primary_muscle] : [],
          secondary_muscles: [],
          movement_pattern: fallbackExercise.movement_pattern,
          equipment: fallbackExercise.equipment,
          image_icon_path: null,
          image_path: null,
          image_howto_path: null,
          image_muscles_path: null,
        }
      : null;

  const statsQueryExerciseId = data?.exercise_id ?? params.exerciseId;
  const returnHref = searchParams?.returnTo?.startsWith("/") ? searchParams.returnTo : undefined;
  const stats = await getExerciseStatsForExercise(user.id, statsQueryExerciseId);
  if (!exercise) {
    notFound();
  }

  const primaryMuscles = (exercise.primary_muscles ?? []) as string[];
  const secondaryMuscles = (exercise.secondary_muscles ?? []) as string[];
  const detailsExercise: ExerciseImageSource = {
    name: exercise.name,
    slug: exercise.slug,
    image_path: "image_path" in exercise ? exercise.image_path ?? null : null,
    image_icon_path: exercise.image_icon_path,
    image_howto_path: exercise.image_howto_path,
  };
  const howToImageSrc = getExerciseHowToImageSrc(detailsExercise);
  const musclesImageSrc = getExerciseMusclesImageSrc(exercise.image_muscles_path);
  const hasLast = stats ? (stats.last_weight != null && stats.last_reps != null) : false;
  const hasPR = stats ? ((stats.pr_weight != null && stats.pr_reps != null) || stats.pr_est_1rm != null) : false;

  if (process.env.NODE_ENV === "development") {
    console.log("[ExerciseDetailsPage:Stats]", {
      exerciseId: params.exerciseId,
      exercise,
      queryId: statsQueryExerciseId,
      stats,
      hasStats: Boolean(stats),
      hasLast,
      hasPR,
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Exercise info</h1>
        <TopRightBackButton href={returnHref} />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-base font-semibold text-text">{exercise.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <MetaTag value={exercise.equipment} />
            <MetaTag value={exercise.movement_pattern} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
          <ExerciseAssetImage src={howToImageSrc} alt="How-to visual" className="w-full rounded-md border border-border" />
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
          <ExerciseAssetImage src={musclesImageSrc} alt="Muscles visual" className="w-full rounded-md border border-border" fallbackSrc="/exercises/placeholders/muscles.svg" />
        </div>

        {exercise.how_to_short ? <p className="text-sm text-text">{exercise.how_to_short}</p> : null}


        {stats && (hasLast || hasPR) ? (
          <div className="space-y-1 rounded-md border border-border/60 bg-[rgb(var(--bg)/0.25)] p-2">
            <p className="text-xs uppercase tracking-wide text-muted">Personal</p>
            {process.env.NODE_ENV === "development" ? (
              <p className="font-mono text-[10px] text-muted/90">
                dbg: queryId={statsQueryExerciseId ?? "none"} statsFound={stats ? "yes" : "no"} statsExerciseId={stats?.exercise_id ?? "none"}
              </p>
            ) : null}
            {hasLast ? (
              <p className="text-sm text-text">Last: {formatWeightReps(stats.last_weight, stats.last_reps, stats.last_unit)}{stats.last_performed_at ? ` · ${formatShortDate(stats.last_performed_at)}` : ""}</p>
            ) : null}
            {hasPR ? (
              <p className="text-sm text-text">PR: {formatWeightReps(stats.pr_weight, stats.pr_reps, null)}{stats.pr_est_1rm != null ? `${stats.pr_weight != null && stats.pr_reps != null ? " · " : ""}Est 1RM ${Math.round(stats.pr_est_1rm)}` : ""}</p>
            ) : null}
          </div>
        ) : null}

        {primaryMuscles.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Primary muscles</p>
            <div className="mt-1 flex flex-wrap gap-1">{primaryMuscles.map((item: string) => <span key={item} className={tagClassName}>{item}</span>)}</div>
          </div>
        ) : null}

        {secondaryMuscles.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Secondary muscles</p>
            <div className="mt-1 flex flex-wrap gap-1">{secondaryMuscles.map((item: string) => <span key={item} className={tagClassName}>{item}</span>)}</div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
